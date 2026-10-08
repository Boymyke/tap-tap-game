// One GameRoom Durable Object per pool: holds live scores, checks every tap batch,
// applies boosters, serves the leaderboard and settles the pool when it ends.
import { DurableObject } from 'cloudflare:workers';
import { settlePool } from './settle.js';

const MAX_TAPS_PER_SEC = 25;     // fastest humans with two thumbs sit around 15–20
const BURST = 8;

const j = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

export class GameRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.players = null;          // Map uid -> player
    this.meta = null;
    this.sorted = null; this.sortedAt = 0;
  }

  async load() {
    if (this.players) return;
    this.meta = (await this.ctx.storage.get('meta')) || null;
    this.players = new Map();
    const all = await this.ctx.storage.list({ prefix: 'p:' });
    for (const [, v] of all) this.players.set(v.uid, v);
  }

  ranked() {
    if (this.sorted && Date.now() - this.sortedAt < 400) return this.sorted;
    this.sorted = [...this.players.values()].sort((a, b) => b.score - a.score || (a.reachedAt || Infinity) - (b.reachedAt || Infinity));
    this.sortedAt = Date.now();
    return this.sorted;
  }

  async fetch(req) {
    await this.load();
    const url = new URL(req.url);
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const now = Date.now();

    switch (url.pathname) {
      case '/init': {
        const p = body.pool;
        const meta = { id: p.id, startsAt: Date.parse(p.starts_at), endsAt: Date.parse(p.ends_at), boosters: !!p.boosters_allowed, sideA: p.side_a || null, sideB: p.side_b || null };
        if (!this.meta || this.meta.endsAt !== meta.endsAt || this.meta.startsAt !== meta.startsAt) {
          this.meta = { ...(this.meta || {}), ...meta };
          await this.ctx.storage.put('meta', this.meta);
          await this.ctx.storage.setAlarm(meta.endsAt + 1500);
        }
        return j({ ok: true });
      }
      case '/join': {
        if (!this.meta) return j({ error: 'Room not ready' }, 409);
        let p = this.players.get(body.uid);
        if (!p) {
          p = { uid: body.uid, n: body.name, tier: body.tier, side: body.side || null, score: 0, raw: 0, mult: 1, multUntil: 0, boosted: false, reachedAt: 0, lastAt: 0, allowance: BURST };
          this.players.set(p.uid, p); this.sorted = null;
          await this.ctx.storage.put('p:' + p.uid, p);
        }
        return j({ score: p.score });
      }
      case '/tap': {
        const p = this.players.get(body.uid);
        if (!this.meta || !p) return j({ error: 'Join the pool first.' }, 403);
        if (now < this.meta.startsAt) return j({ error: 'The pool never start.', code: 'NOT_STARTED' }, 409);
        if (now >= this.meta.endsAt) return j({ error: 'This pool don end.', code: 'ENDED' }, 409);
        let taps = Math.max(0, Math.floor(Number(body.taps) || 0));
        // token bucket: refills at MAX_TAPS_PER_SEC, holds a small burst
        const since = p.lastAt ? (now - p.lastAt) / 1000 : 1;
        p.allowance = Math.min(MAX_TAPS_PER_SEC * 2 + BURST, (p.allowance ?? BURST) + since * MAX_TAPS_PER_SEC);
        const accepted = Math.min(taps, Math.floor(p.allowance));
        p.allowance -= accepted; p.lastAt = now;
        const mult = p.multUntil > now ? p.mult : 1;
        const gain = Math.round(accepted * mult);
        if (gain > 0) { p.score += gain; p.raw += accepted; p.reachedAt = now; this.sorted = null; }
        await this.ctx.storage.put('p:' + p.uid, p);
        const rank = this.ranked().indexOf(p) + 1;
        return j({ score: p.score, raw: p.raw, accepted, rejected: taps - accepted, mult, multUntil: p.multUntil, rank, total: this.players.size });
      }
      case '/boost': {
        const p = this.players.get(body.uid);
        if (!this.meta || !p) return j({ error: 'Join the pool first.' }, 403);
        if (!this.meta.boosters) return j({ error: 'Boosters are off for this pool.' }, 409);
        if (p.boosted) return j({ error: 'You don already use your booster for this pool.' }, 409);
        if (now >= this.meta.endsAt) return j({ error: 'This pool don end.' }, 409);
        p.boosted = true; p.mult = Math.max(1, Math.min(10, Number(body.mult) || 1));
        p.multUntil = Math.max(now, this.meta.startsAt) + Math.max(5, Math.min(120, Number(body.dur) || 20)) * 1000;
        await this.ctx.storage.put('p:' + p.uid, p);
        return j({ mult: p.mult, multUntil: p.multUntil });
      }
      case '/board': {
        const list = this.ranked();
        const uid = url.searchParams.get('uid');
        const me = uid ? this.players.get(uid) : null;
        const teams = {};
        if (this.meta?.sideA) for (const p of list) if (p.side) teams[p.side] = (teams[p.side] || 0) + p.score;
        return j({
          top: list.slice(0, Number(url.searchParams.get('n')) || 20).map((p, i) => ({ r: i + 1, n: p.n, s: p.score, t: p.tier, side: p.side, me: p.uid === uid })),
          me: me ? { rank: list.indexOf(me) + 1, score: me.score, raw: me.raw, boosted: me.boosted, mult: me.mult, multUntil: me.multUntil } : null,
          total: list.length, teams, startsAt: this.meta?.startsAt, endsAt: this.meta?.endsAt, now
        });
      }
      case '/snapshot': return j({ ranked: this.ranked().map(p => ({ uid: p.uid, score: p.score, raw: p.raw, reachedAt: p.reachedAt })) });
      case '/settle': { const r = await this.settle(body.id); return j(r); }
    }
    return j({ error: 'Not found' }, 404);
  }

  async settle(poolId) {
    await this.load();
    if (!this.meta) return poolId ? settlePool(this.env, poolId, []) : { skipped: true };   // pool from before game rooms: close it
    if (Date.now() < this.meta.endsAt) { await this.ctx.storage.setAlarm(this.meta.endsAt + 1500); return { skipped: true, reason: 'not ended' }; }
    const ranked = this.ranked().map(p => ({ uid: p.uid, score: p.score, raw: p.raw, reachedAt: p.reachedAt }));
    return settlePool(this.env, this.meta.id, ranked);
  }

  async alarm() {
    try { await this.settle(); }
    catch (e) { console.error('settle failed', this.meta?.id, e?.stack || e); await this.ctx.storage.setAlarm(Date.now() + 60000); }
  }
}
