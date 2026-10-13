// Player API: pools, taps, boosters, store, inventory, gifts, settings, calculator, ads, leads, account.
import { isPattern } from '../ui/patterns.js';
import { json, readJson, allow, nowIso, uid, hashPassword, safeEqual, sessionCookie, likeEsc, passwordOk } from '../lib.js';
import { normWhatsapp } from '../auth-api.js';
import { tierOf, tierLabel, isNepo, isPaid, requireRole, debit, credit, giveItem, takeItem, owns, itemLock, notify, settings, num, parseJson, clampInt, naira, loadUser, getWallet, upgradeError, fundsError, lagosDay, periodKeys } from '../core.js';
import { perks, THEMES, SOUNDS } from '../tiers.js';
import { listPools, getPool, joinPool, createPool, poolPublic, poolState, roomCall, topUpPool, addInvites, castVote } from '../game/pools.js';
import { allRanks, rankInfo } from '../game/ranks.js';
import { createChallenge, answerChallenge } from '../game/challenges.js';
import { pendingOverlay } from '../game/announce.js';

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export async function handlePlayApi(req, env, path, user) {
  const m = path.match(/^\/api\/pools\/([^/]+)(?:\/(join|board|boost|topup|invite|state|result|vote))?$/);

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
  // ── tap-off challenges ──
  if (path === '/api/challenges' && req.method === 'POST') {
    const deny = requireRole(user, ['USER']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'challenge:' + user.id, 30, 86400)) return json({ error: 'You don send plenty challenges today. Try again tomorrow.' }, 429);
    return createChallenge(env, await loadUser(env, user.id), data);
  }
  const cm = path.match(/^\/api\/challenges\/([0-9a-f-]{36})\/(accept|decline|cancel)$/);
  if (cm && req.method === 'POST') {
    const deny = requireRole(user, ['USER']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'challenge-ans:' + user.id, 60, 3600)) return json({ error: 'Too many tries. Wait small.' }, 429);
    return answerChallenge(env, await loadUser(env, user.id), cm[1], cm[2], data);
  }

  // Player search for invites: names that start with what was typed ("_" and "%" are matched as typed).
  if (path === '/api/players/search' && req.method === 'GET') {
    const deny = requireRole(user, ['USER', 'SPONSOR', 'ADMIN']); if (deny) return deny;
    if (!await allow(env, 'psearch:' + user.id, 120, 600)) return json({ error: 'Too many searches. Wait small.' }, 429);
    const q = String(new URL(req.url).searchParams.get('q') || '').trim().replace(/^@/, '').slice(0, 24);
    if (!q) return json({ players: [] });
    const rows = (await env.DB.prepare("SELECT username, emoji, role, tier, tier_until, rank_level FROM users WHERE role='USER' AND status='ACTIVE' AND id!=? AND username LIKE ? ESCAPE '\\' ORDER BY CASE WHEN username=? THEN 0 ELSE 1 END, lifetime_taps DESC LIMIT 8")
      .bind(user.id, likeEsc(q) + '%', q).all()).results;
    return json({ players: rows.map(r => ({ name: r.username, emoji: r.emoji || null, tier: tierLabel(r), rank: r.rank_level || 1 })) });
  }
  // Server-problem vote: continue the paused match or restart it.
  if (m && m[2] === 'vote' && req.method === 'POST') {
    const deny = requireRole(user, ['USER']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'vote:' + user.id, 30, 3600)) return json({ error: 'Too many tries. Wait small.' }, 429);
    const pool = await getPool(env, m[1], user); if (!pool) return json({ error: 'Pool not found.' }, 404);
    return castVote(env, user, pool, String(data.choice || '').toUpperCase());
  }
  // Your result after a pool is paid out: your place, taps and what you won (VS: which side won).
  if (m && m[2] === 'result' && req.method === 'GET') {
    const deny = requireRole(user, ['USER', 'SPONSOR', 'ADMIN']); if (deny) return deny;
    const p = await env.DB.prepare('SELECT id, settled_at, status, vs_split, side_a, side_b FROM pools WHERE id=?').bind(m[1]).first();
    if (!p) return json({ error: 'Pool not found.' }, 404);
    if (!p.settled_at || p.status === 'CANCELLED') return json({ settled: false, cancelled: p.status === 'CANCELLED' });
    const me = await env.DB.prepare('SELECT final_rank, taps, prize_kobo FROM pool_entries WHERE pool_id=? AND user_id=?').bind(p.id, user.id).first();
    let vs = null;
    if (p.vs_split && p.side_a) {
      const t = Object.fromEntries((await env.DB.prepare('SELECT side_choice s, COALESCE(SUM(taps),0) t FROM pool_entries WHERE pool_id=? GROUP BY side_choice').bind(p.id).all()).results.map(r => [r.s, Number(r.t)]));
      const a = t[p.side_a] || 0, b = t[p.side_b] || 0;
      vs = { taps: { [p.side_a]: a, [p.side_b]: b }, winners: a === b ? (a ? [p.side_a, p.side_b] : []) : [a > b ? p.side_a : p.side_b] };
    }
    return json({ settled: true, rank: me?.final_rank || null, taps: me?.taps || 0, prize: me?.prize_kobo || 0, vs });
  }
  // Pool status for the "waiting for players" screen (instant matches).
  if (m && m[2] === 'state' && req.method === 'GET') {
    const deny = requireRole(user, ['USER', 'SPONSOR', 'ADMIN']); if (deny) return deny;
    const p = await env.DB.prepare('SELECT status, pause_mode, vote_until, starts_at, ends_at, settled_at, max_players, (SELECT COUNT(*) FROM pool_entries x WHERE x.pool_id=pools.id) AS players FROM pools WHERE id=?').bind(m[1]).first();
    if (!p) return json({ error: 'Pool not found.' }, 404);
    return json({ state: poolState(p), players: Number(p.players), maxPlayers: Number(p.max_players), startsAt: p.starts_at, endsAt: p.ends_at });
  }
  // The creator (or the super admin) invites more players after the pool is made.
  if (m && m[2] === 'invite' && req.method === 'POST') {
    const deny = requireRole(user, ['USER', 'SPONSOR', 'ADMIN']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'invite:' + user.id, 30, 3600)) return json({ error: 'Too many invites. Wait small.' }, 429);
    const pool = await getPool(env, m[1], user); if (!pool) return json({ error: 'Pool not found.' }, 404);
    if (pool.created_by !== user.id && user.role !== 'ADMIN') return json({ error: 'Only the person who made this pool can invite players.' }, 403);
    if (!['soon', 'live', 'waiting'].includes(poolState(pool)) || pool.status === 'PAUSED') return json({ error: 'This pool no dey take players now.' }, 409);
    const n = await addInvites(env, user, pool, data.invites);
    if (!n) return json({ error: 'Pick players to invite (people you already invited are skipped).', field: 'invites' }, 400);
    return json({ message: `${n} player${n === 1 ? '' : 's'} invited. They got a notification.`, reload: true });
  }
  if (m && m[2] === 'topup' && req.method === 'POST') {
    const deny = requireRole(user, ['USER', 'SPONSOR']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'topup:' + user.id, 60, 3600)) return json({ error: 'Too many tries. Wait small.' }, 429);
    const pool = await getPool(env, m[1], user); if (!pool) return json({ error: 'Pool not found.' }, 404);
    return topUpPool(env, await loadUser(env, user.id), pool, data);
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
    if (pool.status === 'WAITING') return json({ error: 'Boosters work once the match starts.' }, 409);
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

  // ── mystery boxes: open one, get a random reward (picked on the server) ──
  if (path === '/api/box/open' && req.method === 'POST') {
    const deny = requireRole(user, ['USER']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'box:' + user.id, 30, 600)) return json({ error: 'Easy small. Open the next one in a minute.' }, 429);
    const box = await env.DB.prepare("SELECT * FROM store_items WHERE id=? AND kind='BOX'").bind(String(data.item || '')).first();
    if (!box) return json({ error: 'Pick a box.' }, 400);
    if (!await takeItem(env, user.id, box.id)) return json({ error: 'You no get this box. Buy one for the store.', redirect: '/store?tab=BOX', go: 'Store' }, 409);
    const reward = await openBox(env, await loadUser(env, user.id), box);
    return json({ message: reward.text, reward });
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
    const qty = item.kind === 'BOOSTER' || item.kind === 'BOX' ? clampInt(data.qty, 1, 100, 1) : 1;
    if (item.kind === 'SKIN' && await owns(env, user.id, item.id)) return json({ error: 'You don already get this one.' }, 409);
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
    const deny = requireRole(user, ['USER', 'SPONSOR']); if (deny) return deny;
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
    const cols = [];
    if (typeof data.emailNews === 'boolean') cols.push(env.DB.prepare('UPDATE users SET email_news=? WHERE id=?').bind(data.emailNews ? 1 : 0, user.id));
    if (cols.length) await env.DB.batch(cols);
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
    // Boosters you own, plus the ones in the store you could buy now (the calculator suggests both).
    const boosters = (await env.DB.prepare("SELECT s.id,s.name,s.multiplier,s.duration_seconds,s.audience,s.min_rank,s.per_game_limit,s.price_kobo,COALESCE(i.quantity,0) AS quantity FROM store_items s LEFT JOIN inventory i ON i.item_id=s.id AND i.user_id=? WHERE s.kind='BOOSTER' AND (i.quantity>0 OR s.active=1)").bind(user.id).all()).results
      .filter(x => !itemLock(x, me));
    const out = [];
    for (const p of pools) {
      const b = (await roomCall(env, p.id, `/board?uid=${user.id}&n=10`)).data;
      const myScore = b.me?.score || 0, myRank = b.me?.rank || 0;
      const target = n => (b.top[n - 1] ? b.top[n - 1].s - myScore + 1 : 0);
      const options = boosters.map(x => {
        const extra = Math.round(rate * x.duration_seconds * (x.multiplier - 1));
        const uses = n => { const gap = target(n); return gap <= 0 ? 0 : Math.ceil(gap / Math.max(1, extra)); };
        const left = x.per_game_limit > 0 ? Math.max(0, x.per_game_limit - (b.me?.used?.[x.id] || 0)) : 1000;
        return { item: x.id, name: x.name, owned: x.quantity, price: x.price_kobo, usable: Math.min(x.quantity, left), canBuy: left, extraPerUse: extra, toTop1: uses(1), toTop3: uses(3), toTop10: uses(10) };
      });
      out.push({ pool: p.id, name: p.name, prize: p.prize_kobo, rank: myRank, score: myScore, total: b.total, boostersAllowed: !!p.boosters_allowed, options });
    }
    // best = with boosters you already have; bestBuy = the cheapest buy that takes you higher than that
    let best = null, bestBuy = null;
    for (const p of out) {
      if (!p.boostersAllowed) continue;
      for (const o of p.options) for (const [reach, n] of [[1, o.toTop1], [3, o.toTop3], [10, o.toTop10]]) {
        if (!n) continue;
        if (n <= o.usable && (!best || reach < best.reach || (reach === best.reach && (n < best.uses || (n === best.uses && p.prize > best.prize))))) best = { pool: p.pool, poolName: p.name, item: o.item, itemName: o.name, reach, uses: n, prize: p.prize };
        const buy = Math.max(0, n - o.owned), cost = buy * o.price;
        if (buy > 0 && n <= o.canBuy && (!bestBuy || reach < bestBuy.reach || (reach === bestBuy.reach && cost < bestBuy.cost))) bestBuy = { pool: p.pool, poolName: p.name, item: o.item, itemName: o.name, reach, uses: n, buy, cost, prize: p.prize };
      }
    }
    if (bestBuy && best && bestBuy.reach >= best.reach) bestBuy = null;   // owned boosters already do as well
    return json({ rate, pools: out, best, bestBuy });
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
  // the newest announcement pop-up you haven't closed; closing it marks it seen
  if (path === '/api/announcement' && req.method === 'GET') {
    if (!user) return json({ announcement: null });
    return json({ announcement: await pendingOverlay(env, user) });
  }
  const am = path.match(/^\/api\/announcements\/([0-9a-f-]{36})\/seen$/);
  if (am && req.method === 'POST') {
    const deny = requireRole(user, ['USER', 'SPONSOR', 'ADMIN']); if (deny) return deny;
    await env.DB.prepare('INSERT OR IGNORE INTO announcement_seen(user_id,ann_id) VALUES(?,?)').bind(user.id, am[1]).run();
    return json({ ok: true });
  }
  // dismiss one notification, or clear them all (only your own)
  const nm = path.match(/^\/api\/notifications\/([0-9a-f-]{32,36})\/dismiss$/);
  if ((nm || path === '/api/notifications/clear') && req.method === 'POST') {
    const deny = requireRole(user, ['USER', 'SPONSOR', 'ADMIN']); if (deny) return deny;
    if (nm) await env.DB.prepare('DELETE FROM notifications WHERE id=? AND user_id=?').bind(nm[1], user.id).run();
    else await env.DB.prepare('DELETE FROM notifications WHERE user_id=?').bind(user.id).run();
    return json({ ok: true, ...(nm ? {} : { message: 'All notifications cleared', reload: true }) });
  }
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

  // ── WhatsApp number (password needed, so a stolen session can't swap it) ──
  if (path === '/api/account/whatsapp' && req.method === 'POST') {
    const deny = requireRole(user, ['USER', 'SPONSOR']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'wa:' + user.id, 10, 3600)) return json({ error: 'Too many tries. Wait small.' }, 429);
    const wa = normWhatsapp(data.whatsapp); if (wa.error) return json({ error: wa.error, field: 'whatsapp' }, 400);
    const pw = await passwordOk(env, user.id, data.password); if (!pw.ok) return json({ error: pw.error, field: 'password' }, pw.status);
    await env.DB.prepare('UPDATE users SET whatsapp=? WHERE id=?').bind(wa.value, user.id).run();
    return json({ message: 'WhatsApp number saved.', reload: true });
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

// Picks a reward from the box's list (weights), skipping things this player can't use or already owns.
// The random number comes from crypto on the server, never from the browser.
export async function openBox(env, me, box) {
  const cfg = parseJson(box.config, {});
  let list = Array.isArray(cfg.rewards) ? cfg.rewards : [];
  const ids = list.filter(r => r.item).map(r => r.item);
  const items = ids.length ? (await env.DB.prepare(`SELECT s.*, COALESCE(i.quantity,0) AS owned FROM store_items s LEFT JOIN inventory i ON i.item_id=s.id AND i.user_id=? WHERE s.id IN (${ids.map(() => '?').join(',')})`).bind(me.id, ...ids).all()).results : [];
  const byId = Object.fromEntries(items.map(x => [x.id, x]));
  // Boxes give boosters and skins only — never money (the super admin's rule).
  list = list.filter(r => !(r.wallet > 0) && byId[r.item] && !itemLock(byId[r.item], me) && !(byId[r.item].kind === 'SKIN' && byId[r.item].owned > 0));
  if (!list.length) list = [{ item: 'booster-2x', qty: 1, w: 1 }];
  const total = list.reduce((a, r) => a + Math.max(1, Number(r.w) || 1), 0);
  let roll = crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 * total, pick = list[0];
  for (const r of list) { roll -= Math.max(1, Number(r.w) || 1); if (roll < 0) { pick = r; break; } }
  const it = byId[pick.item] || { id: 'booster-2x', name: 'Turbo 2×', kind: 'BOOSTER' };
  const qty = Math.max(1, Math.min(10, Number(pick.qty) || 1));
  await giveItem(env, me.id, it.id, qty, { gift: true, note: box.name });
  return { kind: it.kind, item: it.id, name: it.name, qty, text: `${box.name}: you got ${qty}× ${it.name}!` };
}

// Free mystery box now and then for active players (checked when they open the home page).
export async function maybeFreeBox(env, me, s) {
  const days = num(s, 'free_box_days', 3);
  if (!days || me.role !== 'USER') return null;
  const now = Date.now(), due = new Date(now - days * 86400000).toISOString();
  if (me.last_free_box_at && me.last_free_box_at > due) return null;
  const lucky = crypto.getRandomValues(new Uint8Array(1))[0] < 90;   // about 35% each day the player shows up
  // claim today's roll first, so refreshing the page can't roll again
  const next = lucky ? new Date(now).toISOString() : new Date(now - (days - 1) * 86400000).toISOString();
  const r = await env.DB.prepare('UPDATE users SET last_free_box_at=? WHERE id=? AND (last_free_box_at IS NULL OR last_free_box_at<=?)').bind(next, me.id, due).run();
  if (!r.meta.changes || !lucky) return null;
  const t = tierOf(me), boxId = t === 'NEPO' ? 'box-nepo' : t === 'MAPO' ? 'box-mapo' : 'box-basic';
  await giveItem(env, me.id, boxId, 1, { gift: true, note: 'Free drop' });
  await notify(env, me.id, 'A free mystery box dropped for you! Open it in your bag.', '/bag');
  return boxId;
}
