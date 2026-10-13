// Tap-offs: one player challenges another to a 1-on-1 match. The other player accepts or declines.
// Optional stake (when the super admin has switched stakes on): each player puts the same amount from their
// wallet; Tap Am holds both until the match ends and the winner takes it all. Every money step is guarded
// by a status claim in one statement, so double clicks, two tabs or scripts can't take or pay twice.
import { json, uid, nowIso, passwordOk } from '../lib.js';
import { tierOf, credit, debit, notify, settings, num, naira, clampInt, toKobo, randomCode, poolPassword, fundsError, adultError } from '../core.js';
import { initRoom, roomCall, startInstantIfFull, PLAYER_DURATIONS } from './pools.js';

const EXPIRE_HOURS = 24;
const iso = ms => new Date(ms).toISOString();
const errPw = r => json({ error: r.error, field: 'password' }, r.status);

async function needAdult(env, me, data) {
  if (me.adult_confirmed_at) return null;
  if (data.adult !== true) return adultError();
  await env.DB.prepare('UPDATE users SET adult_confirmed_at=? WHERE id=?').bind(nowIso(), me.id).run();
  return null;
}

export async function createChallenge(env, me, data) {
  const s = await settings(env);
  const to = await env.DB.prepare("SELECT id, username FROM users WHERE username=? AND role='USER' AND status='ACTIVE'").bind(String(data.to || '').trim()).first();
  if (!to) return json({ error: 'No player with that nickname.', field: 'to' }, 404);
  if (to.id === me.id) return json({ error: 'You no fit challenge yourself.', field: 'to' }, 400);
  const dur = Math.round(Number(data.duration) || 60);
  if (!PLAYER_DURATIONS.includes(dur)) return json({ error: 'Pick how long the tap-off runs.', field: 'duration' }, 400);
  const stake = data.stake === undefined || String(data.stake).trim() === '' ? 0 : clampInt(toKobo(data.stake), 0, 10000000000, -1);
  if (stake < 0) return json({ error: 'Enter the stake as a number, or leave it empty.', field: 'stake' }, 400);
  if (stake > 0) {
    if (s.stakes_on !== '1') return json({ error: 'Money stakes are switched off for now. Send the challenge without a stake.', field: 'stake' }, 403);
    if (stake < 10000) return json({ error: 'A stake must be at least ₦100.', field: 'stake' }, 400);
    const adult = await needAdult(env, me, data); if (adult) return adult;
    const pw = await passwordOk(env, me.id, data.password); if (!pw.ok) return errPw(pw);
  }
  const open = Number((await env.DB.prepare("SELECT COUNT(*) n FROM challenges WHERE from_id=? AND to_id=? AND status='PENDING'").bind(me.id, to.id).first())?.n || 0);
  if (open) return json({ error: `You already sent ${to.username} a challenge. Wait for them to answer.`, field: 'to' }, 409);
  const id = uid();
  if (stake > 0 && !await debit(env, me.id, stake, { type: 'STAKE', reference: id, note: `Tap-off stake vs ${to.username}` })) return fundsError(`You need ${naira(stake)} in your wallet for this stake.`);
  await env.DB.prepare('INSERT INTO challenges(id,from_id,to_id,stake_kobo,duration_seconds,status,expires_at) VALUES(?,?,?,?,?,?,?)')
    .bind(id, me.id, to.id, stake, dur, 'PENDING', iso(Date.now() + EXPIRE_HOURS * 3600000)).run();
  await notify(env, to.id, `${me.username} challenged you to a ${dur < 120 ? dur + '-second' : dur / 60 + '-minute'} tap-off${stake ? ` for ${naira(stake)} each (winner takes ${naira(stake * 2)})` : ''}! Accept or decline.`, '/challenges');
  return json({ message: `Challenge sent to ${to.username}.${stake ? ` Your ${naira(stake)} stake is held until the match ends.` : ''}`, reload: true, id });
}

// Refunds the challenger's held stake once (the status claim decides who refunds).
async function closeChallenge(env, c, status, note) {
  const r = await env.DB.prepare("UPDATE challenges SET status=?, responded_at=? WHERE id=? AND status='PENDING'").bind(status, nowIso(), c.id).run();
  if (!r.meta.changes) return false;
  if (c.stake_kobo > 0) await credit(env, c.from_id, c.stake_kobo, { type: 'REFUND', reference: c.id, note });
  return true;
}

export async function answerChallenge(env, me, id, action, data) {
  const c = await env.DB.prepare('SELECT c.*, f.username AS from_name, t.username AS to_name FROM challenges c JOIN users f ON f.id=c.from_id JOIN users t ON t.id=c.to_id WHERE c.id=?').bind(id).first();
  if (!c) return json({ error: 'Challenge not found.' }, 404);
  if (action === 'cancel') {
    if (c.from_id !== me.id) return json({ error: 'Only the player who sent it can cancel it.' }, 403);
    if (!await closeChallenge(env, c, 'CANCELLED', 'Tap-off cancelled')) return json({ error: 'This challenge was already answered.' }, 409);
    return json({ message: c.stake_kobo ? `Challenge cancelled. Your ${naira(c.stake_kobo)} is back.` : 'Challenge cancelled.', reload: true });
  }
  if (c.to_id !== me.id) return json({ error: 'This challenge is not for you.' }, 403);
  if (c.status !== 'PENDING' || Date.parse(c.expires_at) <= Date.now()) return json({ error: 'This challenge is no longer open.' }, 409);
  if (action === 'decline') {
    if (!await closeChallenge(env, c, 'DECLINED', `${c.to_name} declined your tap-off`)) return json({ error: 'This challenge was already answered.' }, 409);
    await notify(env, c.from_id, `${c.to_name} declined your tap-off.${c.stake_kobo ? ` Your ${naira(c.stake_kobo)} is back in your wallet.` : ''}`, '/challenges');
    return json({ message: 'Challenge declined.', reload: true });
  }
  // accept: claim it first, then take the stake; if the money isn't there, put the challenge back
  if (c.stake_kobo > 0) {
    const s = await settings(env);
    if (s.stakes_on !== '1') return json({ error: 'Money stakes are switched off for now, so this tap-off can’t start. Ask them to send it again without a stake.' }, 403);
    const adult = await needAdult(env, me, data); if (adult) return adult;
    const pw = await passwordOk(env, me.id, data.password); if (!pw.ok) return errPw(pw);
  }
  const claim = await env.DB.prepare("UPDATE challenges SET status='ACCEPTED', responded_at=? WHERE id=? AND status='PENDING' AND expires_at>?").bind(nowIso(), c.id, nowIso()).run();
  if (!claim.meta.changes) return json({ error: 'This challenge is no longer open.' }, 409);
  if (c.stake_kobo > 0 && !await debit(env, me.id, c.stake_kobo, { type: 'STAKE', reference: c.id, note: `Tap-off stake vs ${c.from_name}` })) {
    await env.DB.prepare("UPDATE challenges SET status='PENDING', responded_at=NULL WHERE id=? AND status='ACCEPTED' AND pool_id IS NULL").bind(c.id).run();
    return fundsError(`You need ${naira(c.stake_kobo)} in your wallet to accept this stake.`);
  }
  const poolId = uid();
  try {
    const now = Date.now(), wait = now + 3600000;
    let code; for (let i = 0; i < 5; i++) { code = 'TAP' + randomCode(5); if (!await env.DB.prepare('SELECT 1 FROM pools WHERE hashtag=?').bind(code).first()) break; }
    const pool = {
      id: poolId, name: `Tap-off: ${c.from_name} vs ${c.to_name}`.slice(0, 60), description: c.stake_kobo ? `Winner takes ${naira(c.stake_kobo * 2)}.` : 'A 1-on-1 tap-off.',
      starts_at: iso(wait), ends_at: iso(wait + c.duration_seconds * 1000), kind: c.stake_kobo ? 'PAID' : 'FREE', audience: 'ALL', instant: 1, duration_seconds: c.duration_seconds,
      entry_fee_kobo: 0, prize_kobo: c.stake_kobo * 2, winners_count: 1, split: '[10000]', split_style: 'TOP', tie_rule: 'SPLIT', house_cut_pct: 0,
      is_private: 1, join_password: poolPassword(), max_players: 2, hashtag: code, created_by: c.from_id, status: 'WAITING', min_tier: 'LAPO',
      boosters_allowed: 1, allow_own_pad: 1, time_topup: 0, challenge_id: c.id
    };
    const cols = Object.keys(pool);
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO pools(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`).bind(...cols.map(k => pool[k])),
      env.DB.prepare('INSERT INTO pool_entries(pool_id,user_id,paid_kobo) VALUES(?,?,?)').bind(poolId, c.from_id, c.stake_kobo),
      env.DB.prepare('INSERT INTO pool_entries(pool_id,user_id,paid_kobo) VALUES(?,?,?)').bind(poolId, c.to_id, c.stake_kobo),
      env.DB.prepare('UPDATE challenges SET pool_id=? WHERE id=?').bind(poolId, c.id)]);
    const room = await initRoom(env, pool); if (!room.ok) throw new Error('game room did not start');
    for (const u of await env.DB.prepare('SELECT id, username, tier, tier_until, role, emoji FROM users WHERE id IN (?,?)').bind(c.from_id, c.to_id).all().then(r => r.results))
      await roomCall(env, poolId, '/join', { uid: u.id, name: u.username, tier: tierOf(u), side: null, emoji: u.emoji || null });
    await startInstantIfFull(env, poolId);   // both seats are taken: the countdown starts now
  } catch (e) {
    console.error('tap-off start failed', c.id, e?.message);
    await env.DB.batch([env.DB.prepare('DELETE FROM pool_entries WHERE pool_id=?').bind(poolId), env.DB.prepare('DELETE FROM pools WHERE id=?').bind(poolId),
      env.DB.prepare("UPDATE challenges SET status='CANCELLED' WHERE id=?").bind(c.id)]).catch(() => {});
    await roomCall(env, poolId, '/reset').catch(() => {});
    if (c.stake_kobo > 0) { await credit(env, c.from_id, c.stake_kobo, { type: 'REFUND', reference: c.id, note: 'Tap-off did not start' }); await credit(env, c.to_id, c.stake_kobo, { type: 'REFUND', reference: c.id, note: 'Tap-off did not start' }); }
    return json({ error: 'Server wahala: the tap-off could not start and every stake is back. Try again in a minute.' }, 503);
  }
  return json({ message: 'Challenge accepted! The tap-off starts in 15 seconds.', redirect: `/play?pools=${poolId}` });
}

// Cron: challenges nobody answered in time expire, and the held stake goes back.
export async function expireChallenges(env) {
  const rows = (await env.DB.prepare("SELECT * FROM challenges WHERE status='PENDING' AND expires_at<=? LIMIT 50").bind(nowIso()).all()).results;
  for (const c of rows) if (await closeChallenge(env, c, 'EXPIRED', 'Tap-off not answered in time')) await notify(env, c.from_id, `Your tap-off challenge wasn’t answered in ${EXPIRE_HOURS} hours.${c.stake_kobo ? ` Your ${naira(c.stake_kobo)} is back.` : ''}`, '/challenges');
  return rows.length;
}

export async function challengeLists(env, me) {
  const sql = `SELECT c.*, f.username AS from_name, f.emoji AS from_emoji, t.username AS to_name, t.emoji AS to_emoji, p.settled_at, pe.prize_kobo AS my_prize, pe.final_rank
    FROM challenges c JOIN users f ON f.id=c.from_id JOIN users t ON t.id=c.to_id LEFT JOIN pools p ON p.id=c.pool_id LEFT JOIN pool_entries pe ON pe.pool_id=c.pool_id AND pe.user_id=?`;
  const [inc, out, past] = await env.DB.batch([
    env.DB.prepare(`${sql} WHERE c.to_id=? AND c.status='PENDING' AND c.expires_at>? ORDER BY c.created_at DESC LIMIT 30`).bind(me.id, me.id, nowIso()),
    env.DB.prepare(`${sql} WHERE c.from_id=? AND c.status='PENDING' AND c.expires_at>? ORDER BY c.created_at DESC LIMIT 30`).bind(me.id, me.id, nowIso()),
    env.DB.prepare(`${sql} WHERE (c.from_id=? OR c.to_id=?) AND c.status!='PENDING' ORDER BY COALESCE(c.responded_at,c.created_at) DESC LIMIT 20`).bind(me.id, me.id, me.id)]);
  return { incoming: inc.results, outgoing: out.results, past: past.results };
}
