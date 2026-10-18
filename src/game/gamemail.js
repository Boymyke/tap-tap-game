// Game emails: pool invites, "your invite is starting", "game starts in 10 seconds" for players who left the
// lobby, and the daily top-games email for Mapo and Nepo babies. Every list is capped so one pool can't burn
// the day's email allowance, and each email is claimed in the database before it is sent (never sent twice).
import { nowIso, uid } from '../lib.js';
import { naira, settings, lagosDay, marketingEmailOn } from '../core.js';
import { sendMail, inviteEmail, startingEmail, topGamesEmail } from '../email.js';
import { unsubToken } from './blasts.js';
import { holdIfShort, neededOf } from './pools.js';

const SITE = env => env.PUBLIC_URL || 'https://tapammm.live';
const MAX_PER_POOL = 40;
const lagosTime = iso => { try { return new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso)); } catch { return iso; } };
const unsubUrl = async (env, userId, k) => `${SITE(env)}/unsub?k=${k}&u=${encodeURIComponent(userId)}&t=${await unsubToken(env, userId)}`;

async function fromName(env, pool) {
  if (pool.sponsor_name) return pool.sponsor_name;
  const c = pool.created_by ? await env.DB.prepare('SELECT username, role FROM users WHERE id=?').bind(pool.created_by).first() : null;
  return !c || c.role === 'ADMIN' ? 'Tap Am' : c.username;
}

// Email invited players who haven't had an invite email for this pool (and haven't joined).
// starting = the pool is going live now (invites added after the pool was made get their email then).
export async function emailInvitees(env, pool, { starting = false, userIds = null } = {}) {
  const site = SITE(env);
  const rows = (await env.DB.prepare(`SELECT u.id, u.email FROM pool_invites iv JOIN users u ON u.id=iv.user_id
    WHERE iv.pool_id=? AND iv.emailed_at IS NULL AND u.status='ACTIVE' AND u.allow_invites=1 AND u.email IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM pool_entries pe WHERE pe.pool_id=iv.pool_id AND pe.user_id=iv.user_id) LIMIT ${MAX_PER_POOL}`).bind(pool.id).all()).results
    .filter(r => !userIds || userIds.includes(r.id));
  if (!rows.length) return 0;
  const from = await fromName(env, pool);
  const mine = [];
  for (const r of rows) {   // claim first: two runs at once never email the same person twice
    const claim = await env.DB.prepare('UPDATE pool_invites SET emailed_at=? WHERE pool_id=? AND user_id=? AND emailed_at IS NULL').bind(nowIso(), pool.id, r.id).run();
    if (claim.meta.changes) mine.push(r);
  }
  let sent = 0;
  const base = { site, from, pool: pool.name, url: `${site}/pool/${pool.id}`, prize: pool.prize_kobo ? naira(pool.prize_kobo) : '', entry: pool.entry_fee_kobo ? naira(pool.entry_fee_kobo) : '',
    when: pool.status === 'WAITING' ? 'When enough join' : lagosTime(pool.starts_at), needed: pool.status === 'WAITING' ? neededOf(pool) : 0, starting };
  await Promise.all(mine.map(async r => {
    try { const res = await sendMail(env, r.email, inviteEmail({ ...base, unsub: await unsubUrl(env, r.id, 'invites') })); if (res.sent || res.test) sent++; }
    catch (e) { console.error('invite email', e?.message); }
  }));
  return sent;
}

// Called by the game room 10 seconds before the start. absent = players who joined but aren't in the lobby or
// on the pool page. Returns { held } when a scheduled pool is short of players (it waits for them instead).
export async function prestart(env, poolId, absent = []) {
  const held = await holdIfShort(env, poolId);
  if (held) return { held };
  const pool = await env.DB.prepare('SELECT * FROM pools WHERE id=?').bind(poolId).first();
  if (!pool || pool.settled_at || pool.status === 'CANCELLED' || pool.status === 'PAUSED' || pool.status === 'WAITING') return {};
  const site = SITE(env);
  let lobby = 0;
  if (absent.length) {
    const ids = absent.slice(0, MAX_PER_POOL);
    const users = (await env.DB.prepare(`SELECT id, email FROM users WHERE status='ACTIVE' AND email IS NOT NULL AND id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all()).results;
    await Promise.all(users.map(async u => {
      try { const r = await sendMail(env, u.email, startingEmail({ site, pool: pool.name, url: `${site}/play?pools=${pool.id}`, secs: 10 })); if (r.sent || r.test) lobby++; }
      catch (e) { console.error('starting email', e?.message); }
    }));
  }
  const invites = await emailInvitees(env, pool, { starting: true });
  return { lobby, invites };
}

// Cron (once a day, after 12:00 Lagos): the top live and open pools, emailed to Mapo and Nepo babies who said
// yes to game emails. Queued as an email job so the cron sends it in batches.
export async function queueTopGames(env) {
  const s = await settings(env);
  if (s.top_games_email === '0' || !marketingEmailOn(s)) return null;   // marketing: only with a marketing email service
  const day = lagosDay();
  if (new Date(Date.now() + 3600000).getUTCHours() < 12) return null;
  const now = nowIso();
  const games = (await env.DB.prepare(`SELECT p.id, p.name, p.prize_kobo, p.entry_fee_kobo, p.starts_at, p.ends_at, p.status, (SELECT COUNT(*) FROM pool_entries x WHERE x.pool_id=p.id) AS players
    FROM pools p WHERE p.is_private=0 AND p.settled_at IS NULL AND p.status NOT IN ('CANCELLED','PAUSED') AND p.ends_at>? AND p.ends_at>datetime('now','+20 minutes')
    ORDER BY p.prize_kobo DESC, players DESC LIMIT 5`).bind(now).all()).results;
  if (!games.length) return null;
  const r = await env.DB.prepare("INSERT INTO email_jobs(id,kind,ref_id,audience,service,status,payload) SELECT ?, 'TOPGAMES', ?, 'MAPO_NEPO', 0, 'QUEUED', ? WHERE NOT EXISTS (SELECT 1 FROM email_jobs WHERE kind='TOPGAMES' AND ref_id=?)")
    .bind(uid(), day, JSON.stringify(games.map(g => ({ id: g.id, name: g.name, prize: g.prize_kobo, entry: g.entry_fee_kobo, startsAt: g.starts_at, live: g.status === 'LIVE' || (g.status === 'SCHEDULED' && g.starts_at <= now) }))), day).run();
  return r.meta.changes ? games.length : null;
}

export function topGamesMessage(env, payload, unsub) {
  const site = SITE(env);
  const games = (payload || []).map(g => ({ name: g.name, url: `${site}/pool/${g.id}`, prize: g.prize ? naira(g.prize) : '', entry: g.entry ? naira(g.entry) : '', live: g.live, when: g.live ? 'Live now' : lagosTime(g.startsAt) }));
  return topGamesEmail({ site, games, unsub });
}
export { unsubUrl };
