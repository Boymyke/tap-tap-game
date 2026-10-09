// Pool creation, joining and listing — shared by players (Mapo/Nepo), sponsors and the super admin.
import { uid, nowIso, json } from '../lib.js';
import { isAdmin, isSponsor, tierOf, isNepo, isPaid, debit, credit, randomCode, poolPassword, clampInt, parseJson, naira, settings, num, toKobo, upgradeError, fundsError, adultError } from '../core.js';

const HEX = /^#[0-9a-fA-F]{6}$/;
export const MAX_WINNERS = 100;
export const NO_LIMIT = 100000;

// Prize shares in basis points (sum 10000). TOP = bigger shares for higher places, EQUAL = same for all.
export function buildSplit(n, style = 'TOP') {
  n = clampInt(n, 1, MAX_WINNERS, 1);
  const PRESET = { 1: [100], 2: [65, 35], 3: [60, 25, 15], 5: [40, 25, 15, 12, 8], 10: [25, 18, 13, 10, 8, 7, 6, 5, 4, 4] };
  let w;
  if (style === 'EQUAL') w = Array(n).fill(1);
  else if (PRESET[n]) w = PRESET[n];
  else w = Array.from({ length: n }, (_, i) => 1 / Math.pow(i + 1, 0.85));
  const sum = w.reduce((a, b) => a + b, 0);
  const bp = w.map(x => Math.floor(x / sum * 10000));
  bp[0] += 10000 - bp.reduce((a, b) => a + b, 0);
  return bp;
}
export function splitText(split, style, vs) {
  const sum = split.reduce((a, b) => a + b, 0) || 1, pct = x => (Math.round(x / sum * 1000) / 10).toString().replace(/\.0$/, '') + '%';
  const who = vs ? ' on each side' : '';
  if (split.length === 1) return vs ? 'Top tapper on each side takes that side’s pot' : 'Winner takes all';
  if (style === 'EQUAL') return `Top ${split.length}${who} share equally (${pct(split[0])} each)`;
  const shown = split.slice(0, 5).map(pct).join(' / ');
  return `Top ${split.length}${who} share: ${shown}${split.length > 5 ? ' / …' : ''}`;
}

export const roomFor = (env, poolId) => env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName(poolId));
export async function roomCall(env, poolId, path, body) {
  const res = await roomFor(env, poolId).fetch('https://room' + path, body === undefined ? undefined : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { ok: res.ok, status: res.status, data: await res.json() };
}
export const initRoom = (env, pool) => roomCall(env, pool.id, '/init', { pool });

export function poolState(p, now = Date.now()) {
  if (p.status === 'CANCELLED') return 'cancelled';
  if (p.settled_at) return 'ended';
  const s = Date.parse(p.starts_at), e = Date.parse(p.ends_at);
  return now < s ? 'soon' : now < e ? 'live' : 'ended';
}

// Can this user join this pool? Returns null or { why, need }.
export function joinBlock(pool, user) {
  if (!user || user.role !== 'USER') return { why: 'Only player accounts can join pools.' };
  const t = tierOf(user);
  if (pool.audience === 'NEPO' && t !== 'NEPO') return { why: 'This pool na for Nepo babies only.', need: 'NEPO' };
  if (pool.audience === 'MAPO' && t === 'LAPO') return { why: 'This pool na for Mapo and Nepo babies.', need: 'MAPO' };
  if (pool.audience === 'LAPO' && t !== 'LAPO') return { why: 'This pool na for Lapo babies only.' };
  return null;
}
export const joinBlocked = (pool, user) => joinBlock(pool, user)?.why || null;

// ── create ──────────────────────────────────────────────────────────────────
export async function createPool(env, user, d) {
  const s = await settings(env);
  const admin = isAdmin(user), sponsor = isSponsor(user), player = user.role === 'USER';
  if (player && !isPaid(user)) return upgradeError('Creating pools na for Mapo and Nepo babies. Upgrade to create your own pool.');
  if (!admin && !sponsor && !player) return json({ error: 'You no fit create pools.' }, 403);

  const name = String(d.name || '').trim(), description = String(d.description || '').trim();
  if (name.length < 3 || name.length > 60) return json({ error: 'Pool name must be 3–60 characters.', field: 'name' }, 400);
  if (description.length > 300) return json({ error: 'Description too long (300 max).', field: 'description' }, 400);
  const start = Date.parse(d.starts_at), end = Date.parse(d.ends_at), now = Date.now();
  if (!start) return json({ error: 'Pick when the pool starts.', field: 'starts_at' }, 400);
  if (!end) return json({ error: 'Pick when the pool ends.', field: 'ends_at' }, 400);
  if (start < now - 60000) return json({ error: 'Start time don pass already.', field: 'starts_at' }, 400);
  if (end - start < 30000) return json({ error: 'A pool must run at least 30 seconds.', field: 'ends_at' }, 400);
  if (end - start > 7 * 86400000) return json({ error: 'A pool fit run 7 days max.', field: 'ends_at' }, 400);
  if (start - now > 60 * 86400000) return json({ error: 'Start within the next 60 days.', field: 'starts_at' }, 400);
  if (!admin && d.ack !== true) return json({ error: 'Tick the box to confirm you understand the pool can’t be deleted.', field: 'ack' }, 400);

  let kind = String(d.kind || 'FREE').toUpperCase();
  if (sponsor) kind = 'SPONSORED';
  else if (!admin && !['FREE', 'PAID'].includes(kind)) kind = 'FREE';
  if (!['FREE', 'PAID', 'SPONSORED'].includes(kind)) kind = 'FREE';
  const audience = ['ALL', 'LAPO', 'MAPO', 'NEPO'].includes(String(d.audience).toUpperCase()) ? String(d.audience).toUpperCase() : 'ALL';
  const entryFee = kind === 'PAID' ? clampInt(toKobo(d.entry_fee), 0, 100000000, 0) : 0;
  if (kind === 'PAID' && entryFee < 10000) return json({ error: 'Entry fee for a paid pool must be at least ₦100.', field: 'entry_fee' }, 400);
  let prize = kind === 'FREE' ? 0 : clampInt(toKobo(d.prize || 0), 0, 10000000000, 0);
  if (kind === 'SPONSORED' && prize < 100000) return json({ error: 'A sponsored prize must be at least ₦1,000.', field: 'prize' }, 400);
  const winners = clampInt(d.winners, 1, MAX_WINNERS, 1);
  const style = d.split_style === 'EQUAL' ? 'EQUAL' : 'TOP';
  const split = buildSplit(winners, style);
  const tie = d.tie_rule === 'SPLIT' ? 'SPLIT' : 'FIRST';
  const isPrivate = d.is_private === true;
  const gameType = d.game_type === 'MATCH' ? 'MATCH' : 'STANDARD';
  const sideA = gameType === 'MATCH' ? String(d.side_a || '').trim().slice(0, 24) : null;
  const sideB = gameType === 'MATCH' ? String(d.side_b || '').trim().slice(0, 24) : null;
  if (gameType === 'MATCH' && !sideA) return json({ error: 'Name side A for the VS pool.', field: 'side_a' }, 400);
  if (gameType === 'MATCH' && (!sideB || sideA.toLowerCase() === sideB.toLowerCase())) return json({ error: 'Name side B (different from side A).', field: 'side_b' }, 400);
  // colours: sponsors, the admin and Nepo babies
  const canColour = admin || sponsor || isNepo(user);
  const theme = canColour && HEX.test(d.theme_color || '') ? d.theme_color : null;
  const bg = canColour && HEX.test(d.bg_color || '') ? d.bg_color : null;
  const maxRaw = String(d.max_players ?? '').replace(/[,\s]/g, '');
  const maxPlayers = maxRaw === '' ? NO_LIMIT : clampInt(maxRaw, 2, NO_LIMIT, NO_LIMIT);
  if (maxRaw !== '' && (!/^\d+$/.test(maxRaw) || +maxRaw < 2)) return json({ error: 'Max players must be 2 or more (or leave it empty).', field: 'max_players' }, 400);
  const cut = kind === 'PAID' ? num(s, 'house_cut_pct', 0) : 0;
  if (kind === 'PAID' || prize > 0) {   // money involved: the creator must be an adult
    if (player && !user.adult_confirmed_at) { if (d.adult !== true) return adultError(); await env.DB.prepare('UPDATE users SET adult_confirmed_at=? WHERE id=?').bind(nowIso(), user.id).run(); }
  }

  // Sponsors: pool with or without their ad. "With ad" needs one of their approved ads.
  let promoId = null;
  if ((sponsor || admin) && d.with_ad === 'YES') {
    const ad = await env.DB.prepare('SELECT id,owner_id,approved,active FROM promos WHERE id=?').bind(String(d.promo_id || '')).first();
    if (!ad || (!admin && ad.owner_id !== user.id)) return json({ error: 'Pick one of your ads, or create an ad first.', field: 'promo_id', redirect: sponsor ? '/sponsor/ads' : '/admin/ads', go: 'Create an ad' }, 400);
    if (!ad.approved) return json({ error: 'That ad is still waiting for approval. Pick an approved ad or choose “Without ad”.', field: 'promo_id' }, 400);
    promoId = ad.id;
  }

  const id = uid();
  if (prize > 0 && !admin) {
    const ok = await debit(env, user.id, prize, { type: 'POOL_PRIZE', reference: id, note: name });
    if (!ok) return json({ error: `You need ${naira(prize)} in your wallet to fund this prize.`, field: 'prize', code: 'FUNDS', redirect: '/wallet', go: 'Fund wallet' }, 402);
  }
  let code; for (let i = 0; i < 5; i++) { code = 'TAP' + randomCode(5); if (!await env.DB.prepare('SELECT 1 FROM pools WHERE hashtag=?').bind(code).first()) break; }
  const password = isPrivate ? poolPassword() : null;
  const sponsorName = sponsor ? ((await env.DB.prepare('SELECT company FROM sponsor_profiles WHERE user_id=?').bind(user.id).first())?.company || user.username) : null;
  const pool = {
    id, name, description, starts_at: new Date(start).toISOString(), ends_at: new Date(end).toISOString(), kind, audience,
    entry_fee_kobo: entryFee, prize_kobo: prize, winners_count: split.length, split: JSON.stringify(split), split_style: style, tie_rule: tie, house_cut_pct: cut,
    is_private: isPrivate ? 1 : 0, join_password: password, sponsor_user_id: sponsor ? user.id : null, sponsor_name: sponsorName,
    theme_color: theme, bg_color: bg, game_type: gameType, side_a: sideA, side_b: sideB, vs_split: gameType === 'MATCH' ? 1 : 0, boosters_allowed: d.boosters_allowed === false ? 0 : 1,
    max_players: maxPlayers, hashtag: code, created_by: user.id, status: start > now ? 'SCHEDULED' : 'LIVE', min_tier: audience === 'ALL' ? 'LAPO' : audience, promo_id: promoId
  };
  const cols = Object.keys(pool);
  await env.DB.prepare(`INSERT INTO pools(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`).bind(...cols.map(c => pool[c])).run();
  await initRoom(env, pool);
  return json({ message: 'Pool created', id, code, password, redirect: `/pool/${id}` });
}

// ── list ────────────────────────────────────────────────────────────────────
const LIST_SQL = `SELECT p.*, (SELECT COUNT(*) FROM pool_entries x WHERE x.pool_id=p.id) AS players, pe.user_id AS joined, pe.taps AS my_taps, pe.final_rank, pe.prize_kobo AS my_prize, pe.booster_item, cu.role AS creator_role
    FROM pools p LEFT JOIN pool_entries pe ON pe.pool_id=p.id AND pe.user_id=? LEFT JOIN users cu ON cu.id=p.created_by`;
export function listStmt(env, user, { scope = 'open', limit = 40, offset = 0 } = {}) {
  const now = nowIso(), dayAgo = new Date(Date.now() - 86400000).toISOString(), weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const uidv = user?.id || '';
  const W = {
    open: ["p.status!='CANCELLED' AND p.ends_at>?", [now]],
    sponsored: ["p.status!='CANCELLED' AND p.ends_at>? AND p.kind='SPONSORED'", [now]],
    live: ["p.status!='CANCELLED' AND p.starts_at<=? AND p.ends_at>? AND p.kind!='SPONSORED'", [now, now]],
    'players-soon': ["p.status!='CANCELLED' AND p.starts_at>? AND cu.role='USER'", [now]],
    soon: ["p.status!='CANCELLED' AND p.starts_at>?", [now]],
    mine: ['pe.user_id IS NOT NULL AND p.ends_at>?', [dayAgo]],
    created: ['p.created_by=?', [uidv]],
    recent: ['p.ends_at<=? AND p.ends_at>?', [now, weekAgo]]
  }[scope] || ["p.status!='CANCELLED' AND p.ends_at>?", [now]];
  const order = scope === 'recent' || scope === 'created' ? 'p.ends_at DESC' : `CASE WHEN p.starts_at<=? AND p.ends_at>? THEN 0 ELSE 1 END, p.starts_at ASC`;
  const orderBinds = scope === 'recent' || scope === 'created' ? [] : [now, now];
  return env.DB.prepare(`${LIST_SQL} WHERE ${W[0]} AND (p.is_private=0 OR pe.user_id IS NOT NULL OR p.created_by=?) ORDER BY ${order} LIMIT ? OFFSET ?`)
    .bind(uidv, ...W[1], uidv, ...orderBinds, limit, offset);
}
export async function listPools(env, user, opts = {}) { return (await listStmt(env, user, opts).all()).results; }

export async function getPool(env, id, user) {
  return env.DB.prepare(`SELECT p.*, (SELECT COUNT(*) FROM pool_entries x WHERE x.pool_id=p.id) AS players, pe.user_id AS joined, pe.taps AS my_taps, pe.final_rank, pe.prize_kobo AS my_prize, pe.booster_item, pe.boosters_used, pe.side_choice
    FROM pools p LEFT JOIN pool_entries pe ON pe.pool_id=p.id AND pe.user_id=? WHERE p.id=? OR p.hashtag=?`).bind(user?.id || '', id, String(id).toUpperCase()).first();
}

// ── join ────────────────────────────────────────────────────────────────────
export async function joinPool(env, user, pool, d) {
  const block = joinBlock(pool, user);
  if (block) return block.need ? upgradeError(block.why, block.need) : json({ error: block.why }, 403);
  const state = poolState(pool);
  if (state === 'ended' || state === 'cancelled') return json({ error: 'This pool don close.' }, 409);
  if (pool.joined) return json({ message: 'You don already join', redirect: `/pool/${pool.id}` });
  if (pool.is_private) {
    const given = String(d.password || '').trim().toUpperCase();
    if (!given || given !== String(pool.join_password).toUpperCase()) return json({ error: 'That password no correct.', field: 'password' }, 403);
  }
  if (Number(pool.players) >= Number(pool.max_players)) return json({ error: 'This pool don full.' }, 409);
  let side = null;
  if (pool.game_type === 'MATCH') {
    side = [pool.side_a, pool.side_b].find(x => x && x.toLowerCase() === String(d.side || '').toLowerCase());
    if (!side) return json({ error: `Pick a side: ${pool.side_a} or ${pool.side_b}.`, field: 'side' }, 400);
  }
  const fee = Number(pool.entry_fee_kobo || 0);
  if (fee > 0) {
    if (!user.adult_confirmed_at) { if (d.adult !== true) return adultError(); await env.DB.prepare('UPDATE users SET adult_confirmed_at=? WHERE id=?').bind(nowIso(), user.id).run(); }
    let paid = await debit(env, user.id, fee, { type: 'ENTRY_FEE', reference: pool.id, note: pool.name });
    if (!paid && d.use_winnings === true) paid = await debit(env, user.id, fee, { balance: 'WINNINGS', type: 'ENTRY_FEE', reference: pool.id, note: pool.name });
    if (!paid) return fundsError(`You need ${naira(fee)} in your wallet to join. Fund your wallet first.`);
  }
  const ins = await env.DB.prepare('INSERT OR IGNORE INTO pool_entries(pool_id,user_id,side_choice,paid_kobo) VALUES(?,?,?,?)').bind(pool.id, user.id, side, fee).run();
  if (!ins.meta.changes && fee > 0) {   // raced with another join: give the money back
    await credit(env, user.id, fee, { type: 'REFUND', reference: pool.id, note: 'Double join' });
  } else if (fee > 0) {
    await env.DB.prepare('UPDATE pools SET prize_kobo=prize_kobo+? WHERE id=?').bind(fee, pool.id).run();
  }
  await initRoom(env, pool);
  await roomCall(env, pool.id, '/join', { uid: user.id, name: user.username, tier: tierOf(user), side });
  return json({ message: fee ? `You don join! ${naira(fee)} entry paid.` : 'You don join!', redirect: `/pool/${pool.id}` });
}

export function poolPublic(p) {
  const split = parseJson(p.split, [100]);
  return {
    id: p.id, name: p.name, description: p.description, code: p.hashtag, kind: p.kind, audience: p.audience, startsAt: p.starts_at, endsAt: p.ends_at,
    entryFee: p.entry_fee_kobo, prize: p.prize_kobo, split, splitStyle: p.split_style || 'TOP', tie: p.tie_rule, private: !!p.is_private, players: p.players,
    sponsor: p.sponsor_name, theme: p.theme_color, bg: p.bg_color, gameType: p.game_type, sideA: p.side_a, sideB: p.side_b, vsSplit: !!p.vs_split, boosters: !!p.boosters_allowed,
    houseCut: Number(p.house_cut_pct || 0), maxPlayers: Number(p.max_players || NO_LIMIT), promoId: p.promo_id || null, createdBy: p.created_by, creatorRole: p.creator_role || null,
    joined: !!p.joined, state: poolState(p)
  };
}

// VS pools: each side's pot right now (before any service fee), for the pool page.
export async function computeSidePots(env, p) {
  const rows = (await env.DB.prepare('SELECT side_choice AS s, COALESCE(SUM(paid_kobo),0) AS f FROM pool_entries WHERE pool_id=? GROUP BY side_choice').bind(p.id).all()).results;
  const fees = { [p.side_a]: 0, [p.side_b]: 0 };
  for (const r of rows) if (fees[r.s] !== undefined) fees[r.s] = Number(r.f);
  const seed = Math.max(0, Number(p.prize_kobo || 0) - fees[p.side_a] - fees[p.side_b]);
  return { [p.side_a]: fees[p.side_a] + Math.floor(seed / 2), [p.side_b]: fees[p.side_b] + Math.ceil(seed / 2) };
}
