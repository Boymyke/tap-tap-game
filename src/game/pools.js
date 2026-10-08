// Pool creation, joining and listing — shared by players (Nepo), sponsors and the super admin.
import { uid, nowIso, json } from '../lib.js';
import { isNepo, isAdmin, isSponsor, debit, credit, randomCode, poolPassword, clampInt, parseJson, naira, settings, num } from '../core.js';

export const SPLITS = {
  winner: [100],
  top3: [60, 25, 15],
  top5: [40, 25, 15, 12, 8],
  top10: [25, 18, 13, 10, 8, 7, 6, 5, 4, 4]
};
const HEX = /^#[0-9a-fA-F]{6}$/;

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

// Can this user join this pool? Returns null or a reason.
export function joinBlocked(pool, user) {
  if (!user || user.role !== 'USER') return 'Only player accounts can join pools.';
  const nepo = isNepo(user);
  if (pool.audience === 'NEPO' && !nepo) return 'This pool na for Nepo babies only.';
  if (pool.audience === 'LAPO' && nepo) return 'This pool na for Lapo babies only.';
  return null;
}

// ── create ──────────────────────────────────────────────────────────────────
export async function createPool(env, user, d) {
  const s = await settings(env);
  const admin = isAdmin(user), sponsor = isSponsor(user), nepo = isNepo(user);
  if (!admin && !sponsor && !nepo) return json({ error: 'Only Nepo babies, sponsors and the admin fit create pools.' }, 403);

  const name = String(d.name || '').trim(), description = String(d.description || '').trim();
  if (name.length < 3 || name.length > 60) return json({ error: 'Pool name must be 3–60 characters.', field: 'name' }, 400);
  if (description.length > 300) return json({ error: 'Description too long (300 max).', field: 'description' }, 400);
  const start = Date.parse(d.starts_at), end = Date.parse(d.ends_at), now = Date.now();
  if (!start || !end) return json({ error: 'Pick when the pool starts and ends.', field: 'starts_at' }, 400);
  if (start < now - 60000) return json({ error: 'Start time don pass already.', field: 'starts_at' }, 400);
  if (end - start < 30000) return json({ error: 'A pool must run at least 30 seconds.', field: 'ends_at' }, 400);
  if (end - start > 7 * 86400000) return json({ error: 'A pool fit run 7 days max.', field: 'ends_at' }, 400);
  if (!admin && d.ack !== true) return json({ error: 'Tick the box to confirm you understand the pool can’t be deleted.', field: 'ack' }, 400);

  let kind = String(d.kind || 'FREE').toUpperCase();
  if (sponsor) kind = 'SPONSORED';
  else if (!admin && !['FREE', 'PAID'].includes(kind)) kind = 'FREE';
  if (!['FREE', 'PAID', 'SPONSORED'].includes(kind)) kind = 'FREE';
  const audience = ['ALL', 'LAPO', 'NEPO'].includes(String(d.audience).toUpperCase()) ? String(d.audience).toUpperCase() : 'ALL';
  const entryFee = kind === 'PAID' ? clampInt(Number(d.entry_fee) * 100, 0, 100000000, 0) : 0;
  if (kind === 'PAID' && entryFee < 10000) return json({ error: 'Entry fee for a paid pool must be at least ₦100.', field: 'entry_fee' }, 400);
  let prize = clampInt(Number(d.prize || 0) * 100, 0, 10000000000, 0);
  if (kind === 'SPONSORED' && prize < 100000) return json({ error: 'A sponsored prize must be at least ₦1,000.', field: 'prize' }, 400);
  const splitKey = SPLITS[d.split] ? d.split : 'winner';
  const split = SPLITS[splitKey];
  const tie = d.tie_rule === 'SPLIT' ? 'SPLIT' : 'FIRST';
  const isPrivate = d.is_private === true;
  const gameType = d.game_type === 'MATCH' ? 'MATCH' : 'STANDARD';
  const sideA = gameType === 'MATCH' ? String(d.side_a || '').trim().slice(0, 24) : null;
  const sideB = gameType === 'MATCH' ? String(d.side_b || '').trim().slice(0, 24) : null;
  if (gameType === 'MATCH' && (!sideA || !sideB || sideA.toLowerCase() === sideB.toLowerCase())) return json({ error: 'Enter two different sides for a VS pool.', field: 'side_a' }, 400);
  const theme = HEX.test(d.theme_color || '') ? d.theme_color : null;
  const skin = /^\/media\/[A-Za-z0-9/_.-]+$/.test(d.skin_url || '') ? d.skin_url : null;
  const maxPlayers = clampInt(d.max_players, 2, 100000, 1000);
  const cut = kind === 'PAID' ? num(s, 'house_cut_pct', 0) : 0;

  // who pays the starting prize
  const id = uid();
  if (prize > 0 && !admin) {
    const ok = await debit(env, user.id, prize, { type: 'POOL_PRIZE', reference: id, note: name });
    if (!ok) return json({ error: `You need ${naira(prize)} in your wallet to fund this prize.`, field: 'prize' }, 402);
  }
  let code; for (let i = 0; i < 5; i++) { code = 'TAP' + randomCode(5); if (!await env.DB.prepare('SELECT 1 FROM pools WHERE hashtag=?').bind(code).first()) break; }
  const password = isPrivate ? poolPassword() : null;
  const sponsorName = sponsor ? ((await env.DB.prepare('SELECT company FROM sponsor_profiles WHERE user_id=?').bind(user.id).first())?.company || user.username) : null;
  const pool = {
    id, name, description, starts_at: new Date(start).toISOString(), ends_at: new Date(end).toISOString(), kind, audience,
    entry_fee_kobo: entryFee, prize_kobo: prize, winners_count: split.length, split: JSON.stringify(split), tie_rule: tie, house_cut_pct: cut,
    is_private: isPrivate ? 1 : 0, join_password: password, sponsor_user_id: sponsor ? user.id : null, sponsor_name: sponsorName,
    theme_color: theme, skin_url: skin, game_type: gameType, side_a: sideA, side_b: sideB, boosters_allowed: d.boosters_allowed === false ? 0 : 1,
    max_players: maxPlayers, hashtag: code, created_by: user.id, status: start > now ? 'SCHEDULED' : 'LIVE', min_tier: audience === 'NEPO' ? 'NEPO' : 'LAPO'
  };
  const cols = Object.keys(pool);
  await env.DB.prepare(`INSERT INTO pools(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`).bind(...cols.map(c => pool[c])).run();
  await initRoom(env, pool);
  return json({ message: 'Pool created', id, code, password, redirect: `/pool/${id}` });
}

// ── list ────────────────────────────────────────────────────────────────────
export async function listPools(env, user, { scope = 'open', limit = 40 } = {}) {
  const now = nowIso(), dayAgo = new Date(Date.now() - 86400000).toISOString();
  const uidv = user?.id || '';
  let where = "p.status!='CANCELLED' AND p.ends_at>?";
  const binds = [now];
  if (scope === 'mine') { where = 'pe.user_id IS NOT NULL AND p.ends_at>?'; binds[0] = dayAgo; }
  else if (scope === 'created') { where = 'p.created_by=?'; binds[0] = uidv; }
  else if (scope === 'recent') { where = 'p.ends_at<=? AND p.ends_at>?'; binds.push(new Date(Date.now() - 7 * 86400000).toISOString()); }
  const r = await env.DB.prepare(`SELECT p.*, (SELECT COUNT(*) FROM pool_entries x WHERE x.pool_id=p.id) AS players, pe.user_id AS joined, pe.taps AS my_taps, pe.final_rank, pe.prize_kobo AS my_prize, pe.booster_item
    FROM pools p LEFT JOIN pool_entries pe ON pe.pool_id=p.id AND pe.user_id=?
    WHERE ${where} AND (p.is_private=0 OR pe.user_id IS NOT NULL OR p.created_by=?)
    ORDER BY CASE WHEN p.starts_at<=? AND p.ends_at>? THEN 0 ELSE 1 END, p.starts_at ASC LIMIT ?`)
    .bind(uidv, ...binds, uidv, now, now, limit).all();
  return r.results;
}

export async function getPool(env, id, user) {
  return env.DB.prepare(`SELECT p.*, (SELECT COUNT(*) FROM pool_entries x WHERE x.pool_id=p.id) AS players, pe.user_id AS joined, pe.taps AS my_taps, pe.final_rank, pe.prize_kobo AS my_prize, pe.booster_item, pe.side_choice
    FROM pools p LEFT JOIN pool_entries pe ON pe.pool_id=p.id AND pe.user_id=? WHERE p.id=? OR p.hashtag=?`).bind(user?.id || '', id, String(id).toUpperCase()).first();
}

// ── join ────────────────────────────────────────────────────────────────────
export async function joinPool(env, user, pool, d) {
  const block = joinBlocked(pool, user); if (block) return json({ error: block }, 403);
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
    let paid = await debit(env, user.id, fee, { type: 'ENTRY_FEE', reference: pool.id, note: pool.name });
    if (!paid && d.use_winnings === true) paid = await debit(env, user.id, fee, { balance: 'WINNINGS', type: 'ENTRY_FEE', reference: pool.id, note: pool.name });
    if (!paid) return json({ error: `You need ${naira(fee)} in your wallet to join. Fund your wallet first.`, code: 'FUNDS', redirect: '/wallet' }, 402);
  }
  const ins = await env.DB.prepare('INSERT OR IGNORE INTO pool_entries(pool_id,user_id,side_choice,paid_kobo) VALUES(?,?,?,?)').bind(pool.id, user.id, side, fee).run();
  if (!ins.meta.changes && fee > 0) {   // raced with another join: give the money back
    await credit(env, user.id, fee, { type: 'REFUND', reference: pool.id, note: 'Double join' });
  } else if (fee > 0) {
    await env.DB.prepare('UPDATE pools SET prize_kobo=prize_kobo+? WHERE id=?').bind(fee, pool.id).run();
  }
  await initRoom(env, pool);
  await roomCall(env, pool.id, '/join', { uid: user.id, name: user.username, tier: isNepo(user) ? 'NEPO' : 'LAPO', side });
  return json({ message: fee ? `You don join! ${naira(fee)} entry paid.` : 'You don join!', redirect: `/pool/${pool.id}` });
}

export function poolPublic(p) {
  return {
    id: p.id, name: p.name, description: p.description, code: p.hashtag, kind: p.kind, audience: p.audience, startsAt: p.starts_at, endsAt: p.ends_at,
    entryFee: p.entry_fee_kobo, prize: p.prize_kobo, split: parseJson(p.split, [100]), tie: p.tie_rule, private: !!p.is_private, players: p.players,
    sponsor: p.sponsor_name, theme: p.theme_color, skin: p.skin_url, gameType: p.game_type, sideA: p.side_a, sideB: p.side_b, boosters: !!p.boosters_allowed,
    joined: !!p.joined, state: poolState(p)
  };
}
