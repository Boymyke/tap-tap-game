// Sponsor email blasts: a sponsor pays to have Tap Am email their pool to players who said yes to
// pool news (users.email_news = 1), filtered by tier. The cron sends up to 150 per run per blast.
// Every email carries a one-click "stop these emails" link signed for that player.
import { nowIso, sha256Hex, safeEqual, appSecret } from '../lib.js';
import { naira } from '../core.js';
import { sendMail, poolNewsEmail } from '../email.js';

const BATCH = 150;
export const unsubToken = async (env, userId) => (await sha256Hex(`${await appSecret(env, 'OTP_PEPPER')}:unsub:${userId}`)).slice(0, 32);
export const unsubOk = async (env, userId, token) => /^[0-9a-f]{32}$/.test(String(token || '')) && safeEqual(await unsubToken(env, userId), String(token));

export async function processEmailBlasts(env, origin) {
  const blasts = (await env.DB.prepare("SELECT b.*, p.name, p.prize_kobo, p.ends_at, COALESCE(sp.company, u.username) AS sponsor FROM email_blasts b JOIN pools p ON p.id=b.pool_id LEFT JOIN sponsor_profiles sp ON sp.user_id=b.sponsor_id LEFT JOIN users u ON u.id=b.sponsor_id WHERE b.status IN ('QUEUED','SENDING') ORDER BY b.created_at LIMIT 3").all()).results;
  const now = nowIso();
  for (const b of blasts) {
    if (b.ends_at <= now) { await env.DB.prepare("UPDATE email_blasts SET status='DONE', done_at=? WHERE id=?").bind(now, b.id).run(); continue; }
    const tierWhere = { ALL: '1=1', LAPO: "(tier='LAPO' OR tier_until<=?)", MAPO: "tier='MAPO' AND (tier_until IS NULL OR tier_until>?)", NEPO: "tier='NEPO' AND (tier_until IS NULL OR tier_until>?)" }[b.audience] || '1=1';
    const binds = b.audience === 'ALL' ? [] : [now];
    const users = (await env.DB.prepare(`SELECT id, email FROM users WHERE role='USER' AND status='ACTIVE' AND email_news=1 AND email IS NOT NULL AND id>? AND ${tierWhere} ORDER BY id LIMIT ${BATCH}`).bind(b.cursor || '', ...binds).all()).results;
    const last = users.length ? users[users.length - 1].id : b.cursor;
    const done = users.length < BATCH;
    // Claim this batch before sending (move the cursor), so two runs at once never email anyone twice.
    const claim = await env.DB.prepare("UPDATE email_blasts SET status=?, cursor=?, done_at=? WHERE id=? AND COALESCE(cursor,'')=? AND status IN ('QUEUED','SENDING')")
      .bind(done ? 'DONE' : 'SENDING', last, done ? now : null, b.id, b.cursor || '').run();
    if (!claim.meta.changes) continue;
    let sent = 0;
    for (const u of users) {
      try {
        const msg = poolNewsEmail({ pool: b.name, sponsor: b.sponsor || 'A sponsor', url: `${origin}/pool/${b.pool_id}`, prize: b.prize_kobo ? naira(b.prize_kobo) : '', unsub: `${origin}/unsub?u=${encodeURIComponent(u.id)}&t=${await unsubToken(env, u.id)}` });
        const r = await sendMail(env, u.email, msg); if (r.sent || r.test) sent++;
      } catch (e) { console.error('blast email', e?.message); }
    }
    if (sent) await env.DB.prepare('UPDATE email_blasts SET sent=sent+? WHERE id=?').bind(sent, b.id).run();
  }
  return blasts.length;
}
