// Player API: pools, taps, boosters, store, inventory, gifts, prefs, calculator, notifications.
import { json, readJson, allow, clientIp, nowIso } from '../lib.js';
import { isNepo, requireRole, debit, giveItem, takeItem, owns, itemBlocked, notify, settings, num, parseJson, clampInt, naira, loadUser } from '../core.js';
import { listPools, getPool, joinPool, createPool, poolPublic, poolState, roomCall } from '../game/pools.js';
import { allRanks, rankInfo } from '../game/ranks.js';
import { getWallet } from '../core.js';

const HEX = /^#[0-9a-fA-F]{6}$/;

export async function handlePlayApi(req, env, path, user) {
  const m = path.match(/^\/api\/pools\/([^/]+)(?:\/(join|board|boost))?$/);

  // ── pools ──
  if (path === '/api/pools' && req.method === 'GET') {
    const scope = new URL(req.url).searchParams.get('scope') || 'open';
    return json({ pools: (await listPools(env, user, { scope })).map(poolPublic) });
  }
  if (path === '/api/pools' && req.method === 'POST') {
    const deny = requireRole(user, ['USER', 'SPONSOR', 'ADMIN']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    return createPool(env, user, data);
  }
  if (path === '/api/pools/find' && req.method === 'POST') {
    const { data, response } = await readJson(req); if (response) return response;
    const code = String(data.code || '').trim().replace(/^#/, '').toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(code)) return json({ error: 'Enter the pool code, like TAPX7K2M.', field: 'code' }, 400);
    const p = await env.DB.prepare('SELECT id FROM pools WHERE hashtag=?').bind(code).first();
    if (!p) return json({ error: 'We no see any pool with that code.', field: 'code' }, 404);
    return json({ redirect: `/pool/${p.id}` });
  }
  if (m && m[2] === 'join' && req.method === 'POST') {
    const deny = requireRole(user, ['USER']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'join:' + user.id, 60, 3600)) return json({ error: 'Too many tries. Wait small.' }, 429);
    const pool = await getPool(env, m[1], user); if (!pool) return json({ error: 'Pool not found.' }, 404);
    return joinPool(env, await loadUser(env, user.id), pool, data);
  }
  if (m && m[2] === 'board' && req.method === 'GET') {
    const r = await roomCall(env, m[1], `/board?uid=${encodeURIComponent(user?.id || '')}&n=${clampInt(new URL(req.url).searchParams.get('n'), 3, 100, 20)}`);
    return json(r.data, r.ok ? 200 : r.status);
  }
  if (m && m[2] === 'boost' && req.method === 'POST') {
    const deny = requireRole(user, ['USER']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    const pool = await getPool(env, m[1], user); if (!pool || !pool.joined) return json({ error: 'Join the pool first.' }, 403);
    if (!pool.boosters_allowed) return json({ error: 'Boosters are off for this pool.' }, 409);
    if (pool.booster_item) return json({ error: 'You don already use one booster for this pool.' }, 409);
    if (poolState(pool) === 'ended') return json({ error: 'This pool don end.' }, 409);
    const item = await env.DB.prepare("SELECT * FROM store_items WHERE id=? AND kind='BOOSTER'").bind(String(data.item || '')).first();
    if (!item) return json({ error: 'Pick a booster.' }, 400);
    const me = await loadUser(env, user.id);
    const blocked = itemBlocked(item, me); if (blocked) return json({ error: blocked }, 403);
    const claim = await env.DB.prepare('UPDATE pool_entries SET booster_item=? WHERE pool_id=? AND user_id=? AND booster_item IS NULL').bind(item.id, pool.id, user.id).run();
    if (!claim.meta.changes) return json({ error: 'You don already use one booster for this pool.' }, 409);
    if (!await takeItem(env, user.id, item.id)) {
      await env.DB.prepare('UPDATE pool_entries SET booster_item=NULL WHERE pool_id=? AND user_id=?').bind(pool.id, user.id).run();
      return json({ error: 'You no get this booster again. Buy more for the store.', redirect: '/store' }, 409);
    }
    const r = await roomCall(env, pool.id, '/boost', { uid: user.id, mult: item.multiplier, dur: item.duration_seconds });
    if (!r.ok) {   // give it back
      await giveItem(env, user.id, item.id, 1);
      await env.DB.prepare('UPDATE pool_entries SET booster_item=NULL WHERE pool_id=? AND user_id=?').bind(pool.id, user.id).run();
      return json({ error: r.data.error || 'Booster no work. Try again.' }, r.status);
    }
    return json({ message: `${item.name} on! ${item.multiplier}× for ${item.duration_seconds}s`, ...r.data });
  }

  // ── tapping (one batch can hit up to 10 pools for Nepo babies) ──
  if (path === '/api/tap' && req.method === 'POST') {
    const deny = requireRole(user, ['USER']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    const ids = [...new Set((Array.isArray(data.pools) ? data.pools : [data.pool]).filter(x => typeof x === 'string' && x.length < 64))];
    const taps = clampInt(data.taps, 0, 200, 0);
    if (!ids.length) return json({ error: 'No pool.' }, 400);
    // Hot path: no D1 reads here. The session row already carries tier info and each
    // GameRoom checks membership, start and end times itself.
    const s = await settings(env);
    const max = isNepo(user) ? num(s, 'max_multi_pools', 10) : 1;
    if (ids.length > max) return json({ error: isNepo(user) ? `You fit play ${max} pools at once.` : 'Lapo babies play one pool at a time. Go Nepo to play many at once.' }, 403);
    const results = await Promise.all(ids.map(async id => { const r = await roomCall(env, id, '/tap', { uid: user.id, taps }); return [id, r.data]; }));
    const live = results.filter(([, d]) => typeof d.score === 'number').map(([id]) => id);
    return json({ results: Object.fromEntries(results), skipped: ids.filter(i => !live.includes(i)) });
  }

  // ── store & inventory ──
  if (path === '/api/store/buy' && req.method === 'POST') {
    const deny = requireRole(user, ['USER']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    const item = await env.DB.prepare('SELECT * FROM store_items WHERE id=? AND active=1').bind(String(data.item || '')).first();
    if (!item) return json({ error: 'Item not found.' }, 404);
    const me = await loadUser(env, user.id);
    const blocked = itemBlocked(item, me); if (blocked) return json({ error: blocked }, 403);
    const qty = item.kind === 'BOOSTER' ? clampInt(data.qty, 1, 50, 1) : 1;
    if (item.kind !== 'BOOSTER' && await owns(env, user.id, item.id)) return json({ error: 'You don already get this one.' }, 409);
    const cost = item.price_kobo * qty;
    if (cost > 0) {
      const from = data.from === 'WINNINGS' ? 'WINNINGS' : 'WALLET';
      const ok = await debit(env, user.id, cost, { balance: from, type: 'STORE', reference: item.id, note: `${qty}× ${item.name}` });
      if (!ok) return json({ error: `You need ${naira(cost)} for your ${from === 'WINNINGS' ? 'winnings' : 'wallet'}. Fund your wallet first.`, code: 'FUNDS', redirect: '/wallet' }, 402);
    }
    await giveItem(env, user.id, item.id, qty);
    return json({ message: cost ? `Bought ${qty}× ${item.name} for ${naira(cost)}` : `${item.name} added to your bag` });
  }
  if (path === '/api/equip' && req.method === 'POST') {
    const deny = requireRole(user, ['USER']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    const me = await loadUser(env, user.id);
    const prefs = parseJson(me.prefs, {});
    if (data.item === 'shape-rect') { prefs.shape = 'rect'; await env.DB.prepare('UPDATE users SET prefs=? WHERE id=?').bind(JSON.stringify(prefs), user.id).run(); return json({ message: 'Shape changed' }); }
    const item = await env.DB.prepare("SELECT * FROM store_items WHERE id=? AND kind IN ('SKIN','SHAPE')").bind(String(data.item || '')).first();
    if (!item) return json({ error: 'Item not found.' }, 404);
    const free = item.price_kobo === 0 && !itemBlocked(item, me);
    if (!free && !await owns(env, user.id, item.id)) return json({ error: 'Buy it for the store first.', redirect: '/store' }, 403);
    const blocked = itemBlocked(item, me); if (blocked) return json({ error: blocked }, 403);
    if (item.kind === 'SKIN') await env.DB.prepare('UPDATE users SET equipped_skin=? WHERE id=?').bind(item.id, user.id).run();
    else { prefs.shape = parseJson(item.config, {}).shape || 'rect'; await env.DB.prepare('UPDATE users SET prefs=? WHERE id=?').bind(JSON.stringify(prefs), user.id).run(); }
    return json({ message: `${item.name} equipped` });
  }
  if (path === '/api/prefs' && req.method === 'POST') {
    const deny = requireRole(user, ['USER']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    const me = await loadUser(env, user.id);
    const prefs = parseJson(me.prefs, {});
    for (const k of ['padColor', 'pageBg']) {
      if (data[k] === undefined) continue;
      if (data[k] === '' || data[k] === null) { delete prefs[k]; continue; }
      if (!isNepo(me)) return json({ error: 'Custom colours na Nepo feature.' }, 403);
      if (!HEX.test(data[k])) return json({ error: 'Pick a valid colour.', field: k }, 400);
      prefs[k] = data[k];
    }
    if (typeof data.vibrate === 'boolean') prefs.vibrate = data.vibrate;
    await env.DB.prepare('UPDATE users SET prefs=? WHERE id=?').bind(JSON.stringify(prefs), user.id).run();
    return json({ message: 'Saved' });
  }

  // ── gifting (Nepo babies) ──
  if (path === '/api/gift' && req.method === 'POST') {
    const deny = requireRole(user, ['USER']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    const me = await loadUser(env, user.id);
    if (!isNepo(me)) return json({ error: 'Only Nepo babies fit gift boosters.' }, 403);
    if (!await allow(env, 'gift:' + user.id, 30, 3600)) return json({ error: 'Too many gifts. Wait small.' }, 429);
    const to = await env.DB.prepare("SELECT id,username,role,tier,nepo_until,status FROM users WHERE username=?").bind(String(data.to || '').trim()).first();
    if (!to || to.role !== 'USER' || to.status !== 'ACTIVE') return json({ error: 'We no find that player.', field: 'to' }, 404);
    if (to.id === user.id) return json({ error: 'You no fit gift yourself.', field: 'to' }, 400);
    const item = await env.DB.prepare("SELECT * FROM store_items WHERE id=? AND kind='BOOSTER'").bind(String(data.item || '')).first();
    if (!item || !item.giftable) return json({ error: 'This booster no fit be gifted.', field: 'item' }, 400);
    if (item.audience === 'NEPO' && !isNepo(to)) return json({ error: `${to.username} na Lapo baby — Nepo boosters no fit go to them.`, field: 'item' }, 403);
    const qty = clampInt(data.qty, 1, 20, 1);
    if (!await takeItem(env, user.id, item.id, qty)) return json({ error: `You no get ${qty}× ${item.name} to give.`, field: 'qty' }, 409);
    await giveItem(env, to.id, item.id, qty, { gift: true, from: user.id, note: String(data.note || '').slice(0, 120) || null });
    await notify(env, to.id, `${me.username} gifted you ${qty}× ${item.name}!`, '/bag');
    return json({ message: `Sent ${qty}× ${item.name} to ${to.username}` });
  }

  // ── booster calculator (Nepo) ──
  if (path === '/api/calc' && req.method === 'GET') {
    const deny = requireRole(user, ['USER']); if (deny) return deny;
    const me = await loadUser(env, user.id);
    if (!isNepo(me)) return json({ error: 'The booster calculator na Nepo feature.' }, 403);
    const rate = Math.max(1, Math.min(20, Number(new URL(req.url).searchParams.get('rate')) || 6));
    const now = nowIso();
    const pools = (await env.DB.prepare("SELECT p.id,p.name,p.prize_kobo,p.ends_at,p.boosters_allowed,pe.booster_item FROM pool_entries pe JOIN pools p ON p.id=pe.pool_id WHERE pe.user_id=? AND p.ends_at>? AND p.status!='CANCELLED'").bind(user.id, now).all()).results;
    const boosters = (await env.DB.prepare("SELECT s.id,s.name,s.multiplier,s.duration_seconds,i.quantity FROM inventory i JOIN store_items s ON s.id=i.item_id WHERE i.user_id=? AND s.kind='BOOSTER' AND i.quantity>0").bind(user.id).all()).results;
    const out = [];
    for (const p of pools) {
      const b = (await roomCall(env, p.id, `/board?uid=${user.id}&n=10`)).data;
      const myScore = b.me?.score || 0, myRank = b.me?.rank || 0;
      const target = n => (b.top[n - 1] ? b.top[n - 1].s - myScore + 1 : 0);
      const options = boosters.map(x => {
        const extra = Math.round(rate * x.duration_seconds * (x.multiplier - 1));
        const uses = n => { const gap = target(n); return gap <= 0 ? 0 : Math.ceil(gap / Math.max(1, extra)); };
        return { item: x.id, name: x.name, owned: x.quantity, extraPerUse: extra, toTop1: uses(1), toTop3: uses(3), toTop10: uses(10) };
      });
      out.push({ pool: p.id, name: p.name, prize: p.prize_kobo, rank: myRank, score: myScore, total: b.total, usedBooster: !!p.booster_item, boostersAllowed: !!p.boosters_allowed, options });
    }
    // best move: an allowed, unused pool where one booster gets you highest
    let best = null;
    for (const p of out) {
      if (p.usedBooster || !p.boostersAllowed) continue;
      for (const o of p.options) {
        const reach = o.toTop1 === 1 ? 1 : o.toTop3 === 1 ? 3 : o.toTop10 === 1 ? 10 : null;
        if (reach && (!best || reach < best.reach || (reach === best.reach && p.prize > best.prize))) best = { pool: p.pool, poolName: p.name, item: o.item, itemName: o.name, reach, prize: p.prize };
      }
    }
    return json({ rate, pools: out, best });
  }

  // ── me (rank + balances, used after a game to celebrate rank ups) ──
  if (path === '/api/me' && req.method === 'GET') {
    const deny = requireRole(user, ['USER', 'SPONSOR', 'ADMIN']); if (deny) return deny;
    const me = await loadUser(env, user.id);
    const r = rankInfo(await allRanks(env), me);
    const w = await getWallet(env, user.id);
    return json({ username: me.username, rank: { level: me.rank_level || r.current.level, name: (r.current.level === me.rank_level ? r.current.name : ((await allRanks(env)).find(x => x.level === me.rank_level)?.name || r.current.name)) }, games: me.games_played, wins: me.wins, wallet: w });
  }

  // ── notifications ──
  if (path === '/api/notifications/read' && req.method === 'POST') {
    const deny = requireRole(user, ['USER', 'SPONSOR', 'ADMIN']); if (deny) return deny;
    await env.DB.prepare('UPDATE notifications SET read=1 WHERE user_id=?').bind(user.id).run();
    return json({ ok: true });
  }

  // ── ads shown around games ──
  if (path === '/api/promo' && req.method === 'GET') {
    const sp = new URL(req.url).searchParams;
    const placement = ['PRE', 'POST', 'LOBBY'].includes(sp.get('at')) ? sp.get('at') : 'LOBBY';
    const pool = String(sp.get('pool') || '');
    const p = await env.DB.prepare(`SELECT id,title,kind,image_url,video_id,target_url FROM promos WHERE active=1 AND approved=1 AND (placement=? OR placement='ALL') AND (pool_id=? OR pool_id IS NULL)
      ORDER BY CASE WHEN pool_id=? THEN 0 ELSE 1 END, RANDOM() LIMIT 1`).bind(placement, pool, pool).first();
    if (p) await env.DB.prepare('UPDATE promos SET views=views+1 WHERE id=?').bind(p.id).run();
    return json({ promo: p || null });
  }
  return null;
}
