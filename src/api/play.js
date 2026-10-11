// Player API: pools, taps, boosters, store, inventory, gifts, settings, calculator, ads, leads, account.
import { isPattern } from '../ui/patterns.js';
import { json, readJson, allow, nowIso, uid, hashPassword, safeEqual, sessionCookie } from '../lib.js';
import { tierOf, isNepo, isPaid, requireRole, debit, giveItem, takeItem, owns, itemLock, notify, settings, num, parseJson, clampInt, naira, loadUser, getWallet, upgradeError, fundsError, lagosDay, periodKeys } from '../core.js';
import { perks, THEMES, SOUNDS } from '../tiers.js';
import { listPools, getPool, joinPool, createPool, poolPublic, poolState, roomCall } from '../game/pools.js';
import { allRanks, rankInfo } from '../game/ranks.js';

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

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
    if (!await allow(env, 'create:' + user.id, 30, 3600)) return json({ error: 'Too many pools in one hour. Wait small.' }, 429);
    return createPool(env, await loadUser(env, user.id), data);
  }
  if (path === '/api/pools/find' && req.method === 'POST') {
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'find:' + (user?.id || 'anon'), 60, 600)) return json({ error: 'Too many tries. Wait small.' }, 429);
    const code = String(data.code || '').trim().replace(/^#/, '').toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(code)) return json({ error: 'Enter the pool code, like TAPX7K2M.', field: 'code' }, 400);
    const p = await env.DB.prepare('SELECT id FROM pools WHERE hashtag=?').bind(code).first();
    if (!p) return json({ error: 'We no see any pool with that code. Check the letters and try again.', field: 'code' }, 404);
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
    const deny = requireRole(user, ['USER', 'SPONSOR', 'ADMIN']); if (deny) return deny;
    const r = await roomCall(env, m[1], `/board?uid=${encodeURIComponent(user.id)}&n=${clampInt(new URL(req.url).searchParams.get('n'), 3, 100, 10)}`);
    return json(r.data, r.ok ? 200 : r.status);
  }
  if (m && m[2] === 'boost' && req.method === 'POST') {
    const deny = requireRole(user, ['USER']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'boost:' + user.id, 120, 600)) return json({ error: 'Too many boosters. Wait small.' }, 429);
    const pool = await getPool(env, m[1], user); if (!pool || !pool.joined) return json({ error: 'Join the pool first.', redirect: `/pool/${m[1]}`, go: 'Open pool' }, 403);
    if (!pool.boosters_allowed) return json({ error: 'Boosters are off for this pool.' }, 409);
    if (poolState(pool) === 'ended') return json({ error: 'This pool don end.' }, 409);
    const item = await env.DB.prepare("SELECT * FROM store_items WHERE id=? AND kind='BOOSTER'").bind(String(data.item || '')).first();
    if (!item) return json({ error: 'Pick a booster.' }, 400);
    if (pool.status === 'PAUSED') return json({ error: 'This pool is paused.' }, 409);
    const me = await loadUser(env, user.id);
    // Lapo-rules pools: only the boosters a Lapo baby can use.
    const lock = itemLock(item, pool.lapo_rules ? { ...me, tier: 'LAPO', tier_until: null } : me);
    if (lock && pool.lapo_rules && lock.need !== 'RANK') return json({ error: `This pool uses Lapo baby rules: ${item.name} is not allowed here.` }, 403);
    if (lock) return lock.need === 'RANK' ? json({ error: lock.why + '. Keep tapping to rank up.', code: 'UPGRADE', need: 'RANK', redirect: '/ranks', go: 'See ranks' }, 403) : upgradeError(`${item.name}: ${lock.why}.`, lock.need || 'MAPO');
    if (!await takeItem(env, user.id, item.id)) return json({ error: `You no get ${item.name} again. Buy more for the store.`, redirect: '/store', go: 'Store' }, 409);
    const r = await roomCall(env, pool.id, '/boost', { uid: user.id, item: item.id, mult: item.multiplier, dur: item.duration_seconds, limit: item.per_game_limit || 0 });
    if (!r.ok) { await giveItem(env, user.id, item.id, 1); return json({ error: r.data.error || 'Booster no work. Try again.' }, r.status); }
    await env.DB.prepare('UPDATE pool_entries SET booster_item=COALESCE(booster_item,?), boosters_used=boosters_used+1 WHERE pool_id=? AND user_id=?').bind(item.id, pool.id, user.id).run();
    return json({ message: r.data.queued && r.data.mult !== item.multiplier ? `${item.name} queued — e go start once the current one finish` : `${item.name} on! ${item.multiplier}× for ${item.duration_seconds}s`, ...r.data });
  }

  // ── tapping: one batch can count in several pools (Mapo 3, Nepo 10) ──
  if (path === '/api/tap' && req.method === 'POST') {
    const deny = requireRole(user, ['USER']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    const ids = [...new Set((Array.isArray(data.pools) ? data.pools : [data.pool]).filter(x => typeof x === 'string' && x.length < 64))];
    let taps = clampInt(data.taps, 0, 200, 0);
    if (!ids.length) return json({ error: 'No pool.' }, 400);
    // Hot path: no D1 reads. The session row carries the tier; each GameRoom checks membership,
    // start/end times and the tier's speed limit itself.
    const s = await settings(env);
    const pk = perks(tierOf(user), s);
    if (ids.length > pk.pools) return pk.tier === 'NEPO' ? json({ error: `You fit play ${pk.pools} pools at once.` }, 403) : upgradeError(pk.tier === 'LAPO' ? 'Lapo babies tap in one pool at a time. Mapo plays 3 at once, Nepo plays 10.' : `Mapo babies tap in ${pk.pools} pools at once. Nepo plays 10.`, pk.tier === 'LAPO' ? 'MAPO' : 'NEPO');
    let limitInfo = null;
    if (s.tap_limits_on === '1' && env.TAP_METER && taps > 0) {   // daily/monthly limits (off by default)
      const k = periodKeys();
      const r = await env.TAP_METER.get(env.TAP_METER.idFromName(user.id)).fetch('https://meter', { method: 'POST', body: JSON.stringify({ taps, day: k.DAY, month: k.MONTH, dayLimit: num(s, 'tap_limit_daily', 0), monthLimit: num(s, 'tap_limit_monthly', 0) }) });
      limitInfo = await r.json();
      taps = limitInfo.allow;
    }
    const lapoRate = perks('LAPO', s).rate;
    const results = await Promise.all(ids.map(async id => { const r = await roomCall(env, id, '/tap', { uid: user.id, taps, rate: pk.rate, lapoRate, count: ids.length }); return [id, r.data]; }));
    const live = results.filter(([, d]) => typeof d.score === 'number').map(([id]) => id);
    return json({ results: Object.fromEntries(results), skipped: ids.filter(i => !live.includes(i)), ...(limitInfo && limitInfo.allow === 0 ? { limit: 'You don reach your tap limit for now. Try again later.' } : {}) });
  }

  // ── store & inventory ──
  if (path === '/api/store/buy' && req.method === 'POST') {
    const deny = requireRole(user, ['USER']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'buy:' + user.id, 60, 600)) return json({ error: 'Too many tries. Wait small.' }, 429);
    const item = await env.DB.prepare('SELECT * FROM store_items WHERE id=? AND active=1').bind(String(data.item || '')).first();
    if (!item) return json({ error: 'Item not found.' }, 404);
    const me = await loadUser(env, user.id);
    const lock = itemLock(item, me);
    if (lock) return lock.need === 'RANK' ? json({ error: lock.why + '. Keep tapping to rank up.', code: 'UPGRADE', need: 'RANK', redirect: '/ranks', go: 'See ranks' }, 403) : upgradeError(`${item.name}: ${lock.why}.`, lock.need || 'MAPO');
    const qty = item.kind === 'BOOSTER' ? clampInt(data.qty, 1, 100, 1) : 1;
    if (item.kind !== 'BOOSTER' && await owns(env, user.id, item.id)) return json({ error: 'You don already get this one.' }, 409);
    const cost = item.price_kobo * qty;
    if (cost > 0) {
      if (!me.adult_confirmed_at) { if (data.adult !== true) return json({ error: 'Confirm you are 18 or older before using money in Tap Am.', code: 'ADULT' }, 403); await env.DB.prepare('UPDATE users SET adult_confirmed_at=? WHERE id=?').bind(nowIso(), user.id).run(); }
      const from = data.from === 'WINNINGS' ? 'WINNINGS' : 'WALLET';
      const ok = await debit(env, user.id, cost, { balance: from, type: 'STORE', reference: item.id, note: `${qty}× ${item.name}` });
      if (!ok) return fundsError(`You need ${naira(cost)} in your ${from === 'WINNINGS' ? 'winnings' : 'wallet'}. Fund your wallet first.`);
    }
    await giveItem(env, user.id, item.id, qty);
    return json({ message: cost ? `Bought ${qty}× ${item.name} for ${naira(cost)}` : `${item.name} added to your bag`, owned: await owns(env, user.id, item.id) });
  }
  if (path === '/api/equip' && req.method === 'POST') {
    const deny = requireRole(user, ['USER']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    const me = await loadUser(env, user.id);
    const item = await env.DB.prepare("SELECT * FROM store_items WHERE id=? AND kind='SKIN'").bind(String(data.item || '')).first();
    if (!item) return json({ error: 'Item not found.' }, 404);
    const lock = itemLock(item, me);
    const free = item.price_kobo === 0 && !lock;
    if (!free && !await owns(env, user.id, item.id)) return json({ error: 'Buy it for the store first.', redirect: '/store?tab=SKIN', go: 'Store' }, 403);
    if (lock) return upgradeError(`${item.name}: ${lock.why}.`, lock.need || 'NEPO');
    await env.DB.prepare('UPDATE users SET equipped_skin=? WHERE id=?').bind(item.id, user.id).run();
    return json({ message: `${item.name} equipped`, reload: true });
  }
  if (path === '/api/prefs' && req.method === 'POST') {
    const deny = requireRole(user, ['USER']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    const me = await loadUser(env, user.id);
    const prefs = parseJson(me.prefs, {});
    const t = tierOf(me);
    if (data.theme !== undefined) {
      return json({ error: 'App themes are switched off.', field: 'theme' }, 403);
    }
    if (data.bg !== undefined) {
      if (data.bg === '' || data.bg === 'none') delete prefs.bg;
      else {
        if (t !== 'NEPO') return upgradeError('Backgrounds are for Nepo babies.', 'NEPO');
        const bg = await env.DB.prepare('SELECT id FROM backgrounds WHERE id=? AND active=1').bind(String(data.bg)).first();
        if (!bg) return json({ error: 'Pick a background.', field: 'bg' }, 400);
        prefs.bg = bg.id;
      }
    }
    if (data.sound !== undefined) {
      const snd = SOUNDS.find(x => x.id === data.sound);
      if (!snd) return json({ error: 'Pick a sound.', field: 'sound' }, 400);
      if (snd.id !== 'pop' && !isPaid(me)) return upgradeError('Tap sounds are for Mapo and Nepo babies.', 'MAPO');
      if ((me.rank_level || 1) < snd.minRank) return json({ error: `${snd.name} unlocks at rank ${snd.minRank}.`, code: 'UPGRADE', need: 'RANK', redirect: '/ranks', go: 'See ranks' }, 403);
      prefs.sound = snd.id;
    }
    if (typeof data.vibrate === 'boolean') prefs.vibrate = data.vibrate;
    if (typeof data.muted === 'boolean') prefs.muted = data.muted;
    // Your tap area (Mapo + Nepo): any colour, and a pattern from a skin you own. '' = back to your skin's look.
    if (data.padColor !== undefined || data.padPattern !== undefined) {
      const clearing = (data.padColor === undefined || data.padColor === '') && (data.padPattern === undefined || data.padPattern === '');
      if (!clearing && !isPaid(me)) return upgradeError('Changing your tap area is for Mapo and Nepo babies.', 'MAPO');
      if (data.padColor !== undefined) {
        if (data.padColor === '') delete prefs.padColor;
        else if (/^#[0-9a-fA-F]{6}$/.test(String(data.padColor))) prefs.padColor = String(data.padColor);
        else return json({ error: 'Pick a colour.', field: 'padColor' }, 400);
      }
      if (data.padPattern !== undefined) {
        const k = String(data.padPattern);
        if (k === '') delete prefs.padPattern;
        else if (k === 'none') prefs.padPattern = 'none';
        else {
          if (!isPattern(k)) return json({ error: 'Pick a pattern.', field: 'padPattern' }, 400);
          const rows = (await env.DB.prepare("SELECT s.config FROM store_items s LEFT JOIN inventory i ON i.item_id=s.id AND i.user_id=? WHERE s.kind='SKIN' AND (i.quantity>0 OR (s.price_kobo=0 AND s.active=1))").bind(me.id).all()).results;
          if (!rows.some(r => parseJson(r.config, {}).pattern === k)) return json({ error: 'Get a skin with that pattern from the store first.', field: 'padPattern', redirect: '/store?tab=SKIN', go: 'See skins' }, 403);
          prefs.padPattern = k;
        }
      }
    }
    await env.DB.prepare('UPDATE users SET prefs=? WHERE id=?').bind(JSON.stringify(prefs), user.id).run();
    return json({ message: 'Saved', reload: data.theme !== undefined || data.bg !== undefined || data.padColor === '' });
  }

  // ── gifting (Nepo babies) ──
  if (path === '/api/gift' && req.method === 'POST') {
    const deny = requireRole(user, ['USER']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    const me = await loadUser(env, user.id);
    if (!isNepo(me)) return upgradeError('Only Nepo babies fit gift boosters.', 'NEPO');
    if (!await allow(env, 'gift:' + user.id, 30, 3600)) return json({ error: 'Too many gifts. Wait small.' }, 429);
    const to = await env.DB.prepare("SELECT id,username,role,tier,tier_until,status FROM users WHERE username=?").bind(String(data.to || '').trim()).first();
    if (!to || to.role !== 'USER' || to.status !== 'ACTIVE') return json({ error: 'We no find that player.', field: 'to' }, 404);
    if (to.id === user.id) return json({ error: 'You no fit gift yourself.', field: 'to' }, 400);
    const item = await env.DB.prepare("SELECT * FROM store_items WHERE id=? AND kind='BOOSTER'").bind(String(data.item || '')).first();
    if (!item || !item.giftable) return json({ error: 'This booster no fit be gifted.', field: 'item' }, 400);
    if (item.audience === 'NEPO' && !isNepo(to)) return json({ error: `${to.username} no be Nepo baby — Nepo boosters no fit go to them.`, field: 'item' }, 403);
    if (item.audience === 'MAPO' && !isPaid(to)) return json({ error: `${to.username} na Lapo baby — this booster na for Mapo and Nepo babies.`, field: 'item' }, 403);
    const qty = clampInt(data.qty, 1, 50, 1);
    if (!await takeItem(env, user.id, item.id, qty)) return json({ error: `You no get ${qty}× ${item.name} to give.`, field: 'qty' }, 409);
    await giveItem(env, to.id, item.id, qty, { gift: true, from: user.id, note: String(data.note || '').slice(0, 120) || null });
    await notify(env, to.id, `${me.username} gifted you ${qty}× ${item.name}!`, '/bag');
    return json({ message: `Sent ${qty}× ${item.name} to ${to.username}`, reload: true });
  }

  // ── booster calculator (Mapo + Nepo) ──
  if (path === '/api/calc' && req.method === 'GET') {
    const deny = requireRole(user, ['USER']); if (deny) return deny;
    const me = await loadUser(env, user.id);
    if (!isPaid(me)) return upgradeError('The booster calculator na for Mapo and Nepo babies.', 'MAPO');
    const rate = Math.max(1, Math.min(40, Number(new URL(req.url).searchParams.get('rate')) || 6));
    const now = nowIso();
    const pools = (await env.DB.prepare("SELECT p.id,p.name,p.prize_kobo,p.ends_at,p.boosters_allowed FROM pool_entries pe JOIN pools p ON p.id=pe.pool_id WHERE pe.user_id=? AND p.ends_at>? AND p.status!='CANCELLED' LIMIT 10").bind(user.id, now).all()).results;
    const boosters = (await env.DB.prepare("SELECT s.id,s.name,s.multiplier,s.duration_seconds,s.audience,s.min_rank,s.per_game_limit,i.quantity FROM inventory i JOIN store_items s ON s.id=i.item_id WHERE i.user_id=? AND s.kind='BOOSTER' AND i.quantity>0").bind(user.id).all()).results
      .filter(x => !itemLock(x, me));
    const out = [];
    for (const p of pools) {
      const b = (await roomCall(env, p.id, `/board?uid=${user.id}&n=10`)).data;
      const myScore = b.me?.score || 0, myRank = b.me?.rank || 0;
      const target = n => (b.top[n - 1] ? b.top[n - 1].s - myScore + 1 : 0);
      const options = boosters.map(x => {
        const extra = Math.round(rate * x.duration_seconds * (x.multiplier - 1));
        const uses = n => { const gap = target(n); return gap <= 0 ? 0 : Math.ceil(gap / Math.max(1, extra)); };
        const capped = x.per_game_limit > 0 ? Math.max(0, x.per_game_limit - (b.me?.used?.[x.id] || 0)) : x.quantity;
        return { item: x.id, name: x.name, owned: x.quantity, usable: Math.min(x.quantity, capped), extraPerUse: extra, toTop1: uses(1), toTop3: uses(3), toTop10: uses(10) };
      });
      out.push({ pool: p.id, name: p.name, prize: p.prize_kobo, rank: myRank, score: myScore, total: b.total, boostersAllowed: !!p.boosters_allowed, options });
    }
    let best = null;   // the pool where the fewest boosters get you highest
    for (const p of out) {
      if (!p.boostersAllowed) continue;
      for (const o of p.options) for (const [reach, n] of [[1, o.toTop1], [3, o.toTop3], [10, o.toTop10]]) {
        if (!n || n > o.usable) continue;
        if (!best || reach < best.reach || (reach === best.reach && (n < best.uses || (n === best.uses && p.prize > best.prize)))) best = { pool: p.pool, poolName: p.name, item: o.item, itemName: o.name, reach, uses: n, prize: p.prize };
      }
    }
    return json({ rate, pools: out, best });
  }

  // ── me (rank + balances, used after a game to celebrate rank ups) ──
  if (path === '/api/me' && req.method === 'GET') {
    const deny = requireRole(user, ['USER', 'SPONSOR', 'ADMIN']); if (deny) return deny;
    const me = await loadUser(env, user.id);
    const ranks = await allRanks(env);
    const w = await getWallet(env, user.id);
    return json({ username: me.username, tier: tierOf(me), rank: { level: me.rank_level || 1, name: ranks.find(x => x.level === me.rank_level)?.name || rankInfo(ranks, me).current.name }, games: me.games_played, wins: me.wins, wallet: w });
  }

  // ── notifications ──
  if (path === '/api/notifications/read' && req.method === 'POST') {
    const deny = requireRole(user, ['USER', 'SPONSOR', 'ADMIN']); if (deny) return deny;
    await env.DB.prepare('UPDATE notifications SET read=1 WHERE user_id=? AND read=0').bind(user.id).run();
    return json({ ok: true });
  }

  // ── ads around games: before the game, in the lobby, before results ──
  if (path === '/api/promo' && req.method === 'GET') {
    const deny = requireRole(user, ['USER', 'SPONSOR', 'ADMIN']); if (deny) return deny;
    const sp = new URL(req.url).searchParams;
    const pool = String(sp.get('pool') || '').slice(0, 64);
    const preview = sp.get('preview');
    let p;
    if (preview) {   // sponsors preview their own ads (admin can preview any)
      p = await env.DB.prepare('SELECT a.id,a.title,a.kind,a.image_url,a.video_id,a.target_url,a.owner_id,a.duration_seconds,COALESCE(sp.company,u.username) AS company,COALESCE(sp.lead_capture,0) AS lead_capture FROM promos a LEFT JOIN sponsor_profiles sp ON sp.user_id=a.owner_id LEFT JOIN users u ON u.id=a.owner_id WHERE a.id=?').bind(preview).first();
      if (!p || (user.role !== 'ADMIN' && p.owner_id !== user.id)) return json({ promo: null });
      return json({ promo: { ...p, preview: true } });
    }
    const pinned = (pool ? (await env.DB.prepare('SELECT promo_id FROM pools WHERE id=?').bind(pool).first())?.promo_id : null) ?? null;
    p = await env.DB.prepare(`SELECT a.id,a.title,a.kind,a.image_url,a.video_id,a.target_url,a.owner_id,a.duration_seconds,COALESCE(sp.company,'Tap Am') AS company,COALESCE(sp.lead_capture,0) AS lead_capture
      FROM promos a LEFT JOIN sponsor_profiles sp ON sp.user_id=a.owner_id WHERE a.active=1 AND a.approved=1 AND (a.id=? OR a.pool_id=? OR (? IS NULL AND a.pool_id IS NULL))
      ORDER BY CASE WHEN a.id=? THEN 0 WHEN a.pool_id=? THEN 1 ELSE 2 END, RANDOM() LIMIT 1`).bind(pinned || '', pool, pinned, pinned || '', pool).first();
    // count a view at most 3 times per player per ad every 10 minutes, so scripts can't inflate sponsor numbers
    if (p && await allow(env, `pv:${user.id}:${p.id}`, 3, 600)) await env.DB.prepare('UPDATE promos SET views=views+1 WHERE id=?').bind(p.id).run();
    if (p && user.role === 'USER') p.lead_done = !!(await env.DB.prepare('SELECT 1 FROM leads WHERE promo_id=? AND user_id=?').bind(p.id, user.id).first());
    return json({ promo: p || null });
  }
  if (path === '/api/leads' && req.method === 'POST') {
    const deny = requireRole(user, ['USER']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'lead:' + user.id, 20, 3600)) return json({ error: 'Too many tries. Wait small.' }, 429);
    const p = await env.DB.prepare('SELECT a.id,a.owner_id,COALESCE(sp.company,u.username) AS company,COALESCE(sp.lead_capture,0) AS lc FROM promos a LEFT JOIN sponsor_profiles sp ON sp.user_id=a.owner_id LEFT JOIN users u ON u.id=a.owner_id WHERE a.id=? AND a.approved=1 AND a.active=1').bind(String(data.promo || '')).first();
    if (!p || !p.lc || !p.owner_id) return json({ error: 'This offer is not collecting details.' }, 404);
    if (data.consent !== true) return json({ error: `Tick the box to agree to share your details with ${p.company}.`, field: 'consent' }, 400);
    const name = String(data.name || '').trim().slice(0, 80), email = String(data.email || '').trim().toLowerCase().slice(0, 254), phone = String(data.phone || '').replace(/[^\d+]/g, '').slice(0, 16);
    if (name.length < 2) return json({ error: 'Enter your name.', field: 'name' }, 400);
    if (!email && !phone) return json({ error: 'Enter your email or phone number.', field: 'email' }, 400);
    if (email && !EMAIL_RE.test(email)) return json({ error: 'That email no look correct.', field: 'email' }, 400);
    if (phone && !/^\+?\d{10,15}$/.test(phone)) return json({ error: 'That phone number no look correct.', field: 'phone' }, 400);
    const consent = `Shared with ${p.company} for this offer on ${nowIso()} (Tap Am privacy notice v2026-10-09)`;
    await env.DB.prepare('INSERT OR IGNORE INTO leads(id,promo_id,sponsor_id,user_id,name,email,phone,consent_text) VALUES(?,?,?,?,?,?,?,?)').bind(uid(), p.id, p.owner_id, user.id, name, email || null, phone || null, consent).run();
    return json({ message: `Sent to ${p.company}. They go reach you.` });
  }

  // ── suggest a pool for the admin to open ──
  if (path === '/api/suggest-pool' && req.method === 'POST') {
    const deny = requireRole(user, ['USER']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'suggestpool:' + user.id, 10, 86400)) return json({ error: 'You don suggest plenty today. Try again tomorrow.' }, 429);
    const name = String(data.name || '').trim().slice(0, 60), idea = String(data.idea || '').trim().slice(0, 600);
    if (name.length < 3) return json({ error: 'Give the pool a name (3+ characters).', field: 'name' }, 400);
    if (idea.length < 5) return json({ error: 'Tell us small about the pool.', field: 'idea' }, 400);
    const extra = { type: ['FREE', 'PAID', 'VS'].includes(data.type) ? data.type : 'FREE', when: String(data.when || '').slice(0, 60), sides: String(data.sides || '').slice(0, 60) };
    await env.DB.prepare("INSERT INTO suggestions(id,user_id,name,email,message,kind,data) VALUES(?,?,?,?,?,'POOL',?)").bind(uid(), user.id, user.username, user.email || null, `${name}\n\n${idea}`, JSON.stringify(extra)).run();
    return json({ message: 'Thank you! The Tap Am team go look am.', reload: true });
  }

  // ── archive my account ──
  if (path === '/api/account/archive' && req.method === 'POST') {
    const deny = requireRole(user, ['USER', 'SPONSOR']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'archive:' + user.id, 5, 3600)) return json({ error: 'Too many tries. Wait small.' }, 429);
    const row = await env.DB.prepare('SELECT password_hash,password_salt,password_iter,username FROM users WHERE id=?').bind(user.id).first();
    const hp = await hashPassword(String(data.password || ''), row.password_salt, row.password_iter || 10000);
    if (!safeEqual(hp.hash, row.password_hash)) return json({ error: 'That password no correct.', field: 'password' }, 403);
    if (data.confirm !== true) return json({ error: 'Tick the box to confirm.', field: 'confirm' }, 400);
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET status='ARCHIVED', archived_at=? WHERE id=?").bind(nowIso(), user.id),
      env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(user.id)
    ]);
    return json({ message: 'Account archived. Log in again within 30 days to bring it back.', redirect: '/' }, 200, { 'set-cookie': sessionCookie('', 0) });
  }
  return null;
}
