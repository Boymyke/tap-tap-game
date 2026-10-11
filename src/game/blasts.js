// Sponsor email blasts: a sponsor pays to have Tap Am email their pool to players who said yes to
// pool news (users.email_news = 1), filtered by tier. The cron sends up to 150 per run per blast.
import { nowIso } from '../lib.js';
import { naira } from '../core.js';
import { sendMail, poolNewsEmail } from '../email.js';

const BATCH = 150;
export async function processEmailBlasts(env, origin) {
  const blasts = (await env.DB.prepare("SELECT b.*, p.name, p.prize_kobo, p.ends_at, COALESCE(sp.company, u.username) AS sponsor FROM email_blasts b JOIN pools p ON p.id=b.pool_id LEFT JOIN sponsor_profiles sp ON sp.user_id=b.sponsor_id LEFT JOIN users u ON u.id=b.sponsor_id WHERE b.status IN ('QUEUED','SENDING') ORDER BY b.created_at LIMIT 3").all()).results;
  const now = nowIso();
  for (const b of blasts) {
    if (b.ends_at <= now) { await env.DB.prepare("UPDATE email_blasts SET status='DONE', done_at=? WHERE id=?").bind(now, b.id).run(); continue; }
    const tierWhere = { ALL: '1=1', LAPO: "(tier='LAPO' OR tier_until<=?)", MAPO: "tier='MAPO' AND (tier_until IS NULL OR tier_until>?)", NEPO: "tier='NEPO' AND (tier_until IS NULL OR tier_until>?)" }[b.audience] || '1=1';
    const binds = b.audience === 'ALL' ? [] : [now];
    const users = (await env.DB.prepare(`SELECT id, email FROM users WHERE role='USER' AND status='ACTIVE' AND email_news=1 AND email IS NOT NULL AND id>? AND ${tierWhere} ORDER BY id LIMIT ${BATCH}`).bind(b.cursor || '', ...binds).all()).results;
    const msg = poolNewsEmail({ pool: b.name, sponsor: b.sponsor || 'A sponsor', url: `${origin}/pool/${b.pool_id}`, prize: b.prize_kobo ? naira(b.prize_kobo) : '' });
    let sent = 0;
    for (const u of users) { try { const r = await sendMail(env, u.email, msg); if (r.sent || r.test) sent++; } catch (e) { console.error('blast email', e?.message); } }
    const last = users.length ? users[users.length - 1].id : b.cursor;
    const done = users.length < BATCH;
    await env.DB.prepare('UPDATE email_blasts SET status=?, sent=sent+?, cursor=?, done_at=? WHERE id=?').bind(done ? 'DONE' : 'SENDING', sent, last, done ? now : null, b.id).run();
  }
  return blasts.length;
}
