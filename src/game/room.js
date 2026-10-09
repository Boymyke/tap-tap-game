// One GameRoom Durable Object per pool: holds live scores, checks every tap batch against the
// player's tier speed limit, runs boosters (queued back to back), serves the live board and
// settles the pool when it ends. Only the worker talks to it — never the browser.
import { DurableObject } from 'cloudflare:workers';
import { settlePool } from './settle.js';

const DEFAULT_RATE = 15;           // taps/sec for one finger; the worker sends each player's tier limit
const BURST = 8;
const BOOST_GAP_MS = 1200;         // anti-spam: at least this long between booster activations
const MAX_QUEUE = 30;

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

  // Booster timeline: cur = { mult, until }, queue = [{ mult, dur }]. Advances to `now`.
  advance(p, now) {
    if (!p.cur) p.cur = { mult: p.mult || 1, until: p.multUntil || 0 };
    p.queue = p.queue || [];
    while (p.cur.until <= now && p.queue.length) {
      const nx = p.queue.shift();
      const startAt = p.cur.until && p.cur.until > (this.meta?.startsAt || 0) ? p.cur.until : Math.max(now, this.meta?.startsAt || now);
      p.cur = { mult: nx.mult, until: startAt + nx.dur * 1000 };
    }
    return p.cur.until > now ? p.cur.mult : 1;
  }
  boostInfo(p, now) {
    const mult = this.advance(p, now);
    return { mult, multUntil: mult > 1 ? p.cur.until : 0, queued: (p.queue || []).length, queuedSecs: (p.queue || []).reduce((a, q) => a + q.dur, 0) };
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
          p = { uid: body.uid, n: body.name, tier: body.tier, side: body.side || null, score: 0, raw: 0, cur: { mult: 1, until: 0 }, queue: [], used: {}, boosts: 0, lastBoost: 0, reachedAt: 0, lastAt: 0, allowance: BURST, flagged: 0 };
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
        const rate = Math.max(5, Math.min(60, Number(body.rate) || DEFAULT_RATE));
        const taps = Math.max(0, Math.floor(Number(body.taps) || 0));
        // token bucket: refills at the tier's speed, holds a small burst; extra taps are dropped
        const since = p.lastAt ? (now - p.lastAt) / 1000 : 1;
        p.allowance = Math.min(rate * 2 + BURST, (p.allowance ?? BURST) + since * rate);
        const accepted = Math.min(taps, Math.floor(p.allowance));
        p.allowance -= accepted; p.lastAt = now;
        if (taps - accepted > rate) p.flagged = (p.flagged || 0) + 1;      // sustained over-speed: kept for review
        const b = this.boostInfo(p, now);
        const gain = Math.round(accepted * b.mult);
        if (gain > 0) { p.score += gain; p.raw += accepted; p.reachedAt = now; this.sorted = null; }
        await this.ctx.storage.put('p:' + p.uid, p);
        const list = this.ranked(), rank = list.indexOf(p) + 1;
        return j({ score: p.score, raw: p.raw, accepted, rejected: taps - accepted, ...b, rank, total: this.players.size, above: rank > 1 ? list[rank - 2].score : null });
      }
      case '/boost': {
        const p = this.players.get(body.uid);
        if (!this.meta || !p) return j({ error: 'Join the pool first.' }, 403);
        if (!this.meta.boosters) return j({ error: 'Boosters are off for this pool.' }, 409);
        if (now >= this.meta.endsAt) return j({ error: 'This pool don end.' }, 409);
        if (now - (p.lastBoost || 0) < BOOST_GAP_MS) return j({ error: 'Easy — one booster at a time.' }, 429);
        const item = String(body.item || ''), limit = Math.max(0, Number(body.limit) || 0);
        p.used = p.used || {};
        if (limit > 0 && (p.used[item] || 0) >= limit) return j({ error: 'You don use this booster the max times for this game.', code: 'LIMIT' }, 409);
        p.queue = p.queue || [];
        if (p.queue.length >= MAX_QUEUE) return j({ error: 'Too many boosters waiting. Use them as they run out.' }, 409);
        const mult = Math.max(1, Math.min(10, Number(body.mult) || 1)), dur = Math.max(5, Math.min(120, Number(body.dur) || 20));
        const curMult = this.advance(p, now);
        const startAt = Math.max(now, this.meta.startsAt);
        if (curMult <= 1 && (!p.cur || p.cur.until <= now)) p.cur = { mult, until: startAt + dur * 1000 };
        else if (mult > p.cur.mult) {        // stronger booster takes over now; the rest of the old one waits
          const left = Math.max(0, Math.round((p.cur.until - Math.max(now, this.meta.startsAt)) / 1000));
          if (left >= 1) p.queue.unshift({ mult: p.cur.mult, dur: left });
          p.cur = { mult, until: startAt + dur * 1000 };
        } else p.queue.push({ mult, dur });   // same or weaker: runs right after
        p.used[item] = (p.used[item] || 0) + 1; p.boosts = (p.boosts || 0) + 1; p.lastBoost = now;
        await this.ctx.storage.put('p:' + p.uid, p);
        return j(this.boostInfo(p, now));
      }
      case '/board': {
        const list = this.ranked();
        const uid = url.searchParams.get('uid');
        const me = uid ? this.players.get(uid) : null;
        const n = Math.max(3, Math.min(100, Number(url.searchParams.get('n')) || 10));
        const teams = {};
        if (this.meta?.sideA) for (const p of list) if (p.side) teams[p.side] = (teams[p.side] || 0) + p.score;
        const row = (p, i) => ({ r: i + 1, n: p.n, s: p.score, t: p.tier, side: p.side, me: p.uid === uid });
        const myRank = me ? list.indexOf(me) + 1 : 0;
        const near = me && myRank > n ? list.slice(Math.max(n, myRank - 3), myRank + 1).map(p => row(p, list.indexOf(p))) : [];
        return j({
          top: list.slice(0, n).map(row), near,
          me: me ? { rank: myRank, score: me.score, raw: me.raw, boosts: me.boosts || 0, ...this.boostInfo(me, now), used: me.used || {} } : null,
          total: list.length, teams, startsAt: this.meta?.startsAt, endsAt: this.meta?.endsAt, now
        });
      }
      case '/snapshot': return j({ ranked: this.ranked().map(p => ({ uid: p.uid, score: p.score, raw: p.raw, reachedAt: p.reachedAt, side: p.side, boosts: p.boosts || 0, flagged: p.flagged || 0 })) });
      case '/settle': { const r = await this.settle(body.id); return j(r); }
    }
    return j({ error: 'Not found' }, 404);
  }

  async settle(poolId) {
    await this.load();
    if (!this.meta) return poolId ? settlePool(this.env, poolId, []) : { skipped: true };   // pool from before game rooms: close it
    if (Date.now() < this.meta.endsAt) { await this.ctx.storage.setAlarm(this.meta.endsAt + 1500); return { skipped: true, reason: 'not ended' }; }
    const ranked = this.ranked().map(p => ({ uid: p.uid, score: p.score, raw: p.raw, reachedAt: p.reachedAt, side: p.side, boosts: p.boosts || 0, flagged: p.flagged || 0 }));
    return settlePool(this.env, this.meta.id, ranked);
  }

  async alarm() {
    try { await this.settle(); }
    catch (e) { console.error('settle failed', this.meta?.id, e?.stack || e); await this.ctx.storage.setAlarm(Date.now() + 60000); }
  }
}

// Daily / monthly tap limits (switched off by default; the admin turns them on).
// One TapMeter per player counts accepted raw taps across all pools.
export class TapMeter extends DurableObject {
  async fetch(req) {
    const b = await req.json().catch(() => ({}));
    const day = String(b.day || ''), month = String(b.month || '');
    let st = (await this.ctx.storage.get('st')) || { day: '', d: 0, month: '', m: 0 };
    if (st.day !== day) { st.day = day; st.d = 0; }
    if (st.month !== month) { st.month = month; st.m = 0; }
    const want = Math.max(0, Math.floor(Number(b.taps) || 0));
    const dayLeft = b.dayLimit > 0 ? Math.max(0, b.dayLimit - st.d) : Infinity;
    const monthLeft = b.monthLimit > 0 ? Math.max(0, b.monthLimit - st.m) : Infinity;
    const allow = Math.min(want, dayLeft, monthLeft);
    st.d += allow; st.m += allow;
    if (allow > 0) await this.ctx.storage.put('st', st);
    return new Response(JSON.stringify({ allow, day: st.d, month: st.m, dayLeft: dayLeft === Infinity ? null : dayLeft - allow, monthLeft: monthLeft === Infinity ? null : monthLeft - allow }), { headers: { 'content-type': 'application/json' } });
  }
}
