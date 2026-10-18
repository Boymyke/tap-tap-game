// Super admin announcements: every chosen player gets a notification; optionally a pop-up (shown once on
// app pages, never on the game screen) and an email from no-reply@tapammm.live sent by the cron in batches.
import { json, uid, nowIso } from '../lib.js';
import { settings, clampInt, tierOf, parseJson, marketingEmailOn } from '../core.js';
import { sendMail, announcementEmail, giftEmail } from '../email.js';
import { topGamesMessage, unsubUrl } from './gamemail.js';
import { unsubToken } from './blasts.js';

const BATCH = 150;
const AUD = {
  ALL: "role IN ('USER','SPONSOR')",
  PLAYERS: "role='USER'",
  LAPO: "role='USER' AND (tier='LAPO' OR (tier_until IS NOT NULL AND tier_until<=?))",
  MAPO: "role='USER' AND tier='MAPO' AND (tier_until IS NULL OR tier_until>?)",
  NEPO: "role='USER' AND tier='NEPO' AND (tier_until IS NULL OR tier_until>?)",
  SPONSORS: "role='SPONSOR'"
};
const audWhere = a => AUD[a] || AUD.ALL;
const audBinds = (a, now) => (['LAPO', 'MAPO', 'NEPO'].includes(a) ? [now] : []);
// Only Tap Am pages or https links.
export const safeLink = l => { l = String(l || '').trim(); return !l ? '' : /^\/(?!\/)[A-Za-z0-9/_?=&.%-]*$/.test(l) || /^https:\/\/[^\s<>"']+$/i.test(l) ? l.slice(0, 300) : null; };

export async function createAnnouncement(env, admin, d) {
  const title = String(d.title || '').trim().slice(0, 90), body = String(d.body || '').trim().slice(0, 2000);
  if (title.length < 3) return json({ error: 'Give the announcement a title (3+ characters).', field: 'title' }, 400);
  if (body.length < 3) return json({ error: 'Write the message.', field: 'body' }, 400);
  const link = safeLink(d.link); if (link === null) return json({ error: 'The link must be a Tap Am page (like /pools) or start with https://', field: 'link' }, 400);
  const audience = AUD[d.audience] ? d.audience : 'ALL';
  const overlay = d.overlay === true ? 1 : 0;
  const email = ['NEWS', 'SERVICE'].includes(d.email) ? d.email : 'NO';
  if (email === 'NEWS' && !marketingEmailOn(await settings(env))) return json({ error: 'News emails are off: ZeptoMail is for account emails only. Send it as a notification and pop-up, or connect a marketing email service first.', field: 'email' }, 400);
  const days = clampInt(d.days, 1, 30, 3);
  const id = uid(), now = nowIso();
  await env.DB.prepare('INSERT INTO announcements(id,title,body,link,audience,overlay,email,created_by,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
    .bind(id, title, body, link || null, audience, overlay, email, admin.id, now, new Date(Date.now() + days * 86400000).toISOString()).run();
  // One statement puts it in everyone's notifications.
  const n = await env.DB.prepare(`INSERT INTO notifications(id,user_id,text,link) SELECT lower(hex(randomblob(16))), id, ?, ? FROM users WHERE status='ACTIVE' AND ${audWhere(audience)}`)
    .bind(`📣 ${title}: ${body}`.slice(0, 500), link && link.startsWith('/') ? link : '/notifications', ...audBinds(audience, now)).run();
  if (email !== 'NO') await env.DB.prepare("INSERT INTO email_jobs(id,kind,ref_id,audience,service,status) VALUES(?,'ANNOUNCE',?,?,?,'QUEUED')").bind(uid(), id, audience, email === 'SERVICE' ? 1 : 0).run();
  return json({ message: `Sent to ${n.meta.changes} account${n.meta.changes === 1 ? '' : 's'}${overlay ? ' with a pop-up' : ''}${email !== 'NO' ? '. Emails go out over the next few minutes.' : '.'}`, reload: true, id });
}

// The newest pop-up this person hasn't closed (app pages call it; the game screen never does).
export async function pendingOverlay(env, user) {
  if (user.role === 'ADMIN') return null;   // the super admin writes them; no pop-ups on the admin pages
  const now = nowIso();
  const tier = user.role === 'SPONSOR' ? 'SPONSORS' : tierOf(user) || 'LAPO';
  return env.DB.prepare(`SELECT a.id,a.title,a.body,a.link FROM announcements a WHERE a.overlay=1 AND a.active=1 AND a.expires_at>? AND a.created_at>=?
    AND (a.audience='ALL' OR (a.audience='PLAYERS' AND ?='USER') OR a.audience=?) AND NOT EXISTS (SELECT 1 FROM announcement_seen s WHERE s.ann_id=a.id AND s.user_id=?)
    ORDER BY a.created_at DESC LIMIT 1`).bind(now, String(user.created_at || '').replace(' ', 'T') || '2000', user.role, tier, user.id).first();
}

// Cron: queued emails, 150 per run per job. ANNOUNCE: marketing ("NEWS") only goes to people who said yes;
// "SERVICE" (important account news) goes to every active account in the audience. TOPGAMES: Mapo and Nepo
// babies who said yes to game emails. GIFT: the players the super admin sent a gift to (service email).
export async function processEmailJobs(env, origin) {
  const jobs = (await env.DB.prepare("SELECT j.*, a.title, a.body, a.link FROM email_jobs j LEFT JOIN announcements a ON a.id=j.ref_id WHERE j.status IN ('QUEUED','SENDING') ORDER BY j.created_at LIMIT 3").all()).results;
  const now = nowIso();
  const marketing = marketingEmailOn(await settings(env));
  for (const j of jobs) {
    const payload = parseJson(j.payload, null);
    let users;
    if (!marketing && (j.kind === 'TOPGAMES' || (j.kind === 'ANNOUNCE' && !j.service))) {   // marketing email is off: drop it
      await env.DB.prepare("UPDATE email_jobs SET status='SKIPPED', done_at=? WHERE id=?").bind(now, j.id).run(); continue;
    }
    if (j.kind === 'GIFT' && !payload?.ids) {   // a whole tier (or every player)
      users = (await env.DB.prepare(`SELECT id, email FROM users WHERE status='ACTIVE' AND email IS NOT NULL AND ${audWhere(j.audience)} AND id>? ORDER BY id LIMIT ${BATCH}`)
        .bind(...audBinds(j.audience, now), j.cursor || '').all()).results;
    } else if (j.kind === 'GIFT') {
      const ids = (payload?.ids || []).filter(x => x > (j.cursor || '')).sort().slice(0, BATCH);
      users = ids.length ? (await env.DB.prepare(`SELECT id, email FROM users WHERE status='ACTIVE' AND email IS NOT NULL AND id IN (${ids.map(() => '?').join(',')}) ORDER BY id`).bind(...ids).all()).results : [];
      if (ids.length) users.last = ids[ids.length - 1];
    } else if (j.kind === 'TOPGAMES') {
      users = (await env.DB.prepare(`SELECT id, email FROM users WHERE status='ACTIVE' AND role='USER' AND email IS NOT NULL AND email_games=1 AND tier IN ('MAPO','NEPO') AND (tier_until IS NULL OR tier_until>?) AND id>? ORDER BY id LIMIT ${BATCH}`)
        .bind(now, j.cursor || '').all()).results;
    } else if (j.kind === 'ANNOUNCE' && j.title) {
      users = (await env.DB.prepare(`SELECT id, email FROM users WHERE status='ACTIVE' AND email IS NOT NULL AND ${audWhere(j.audience)} ${j.service ? '' : 'AND email_news=1'} AND id>? ORDER BY id LIMIT ${BATCH}`)
        .bind(...audBinds(j.audience, now), j.cursor || '').all()).results;
    } else { await env.DB.prepare("UPDATE email_jobs SET status='DONE', done_at=? WHERE id=?").bind(now, j.id).run(); continue; }
    const last = users.last || (users.length ? users[users.length - 1].id : j.cursor);
    const done = j.kind === 'GIFT' && payload?.ids ? !users.last || payload.ids.filter(x => x > last).length === 0 : users.length < BATCH;
    const claim = await env.DB.prepare("UPDATE email_jobs SET status=?, cursor=?, done_at=? WHERE id=? AND COALESCE(cursor,'')=? AND status IN ('QUEUED','SENDING')").bind(done ? 'DONE' : 'SENDING', last || '', done ? now : null, j.id, j.cursor || '').run();
    if (!claim.meta.changes) continue;
    let sent = 0;
    for (const u of users) {
      try {
        let msg;
        if (j.kind === 'GIFT') msg = giftEmail({ site: origin, what: payload.what, note: payload.note || '', url: origin + (payload.link || '/me') });
        else if (j.kind === 'TOPGAMES') msg = topGamesMessage(env, payload, await unsubUrl(env, u.id, 'games'));
        else {
          const link = j.link ? (j.link.startsWith('/') ? origin + j.link : j.link) : origin + '/dashboard';
          msg = announcementEmail({ title: j.title, message: j.body, link, linkLabel: 'Open Tap Am', service: !!j.service, site: origin, unsub: j.service ? '' : `${origin}/unsub?u=${encodeURIComponent(u.id)}&t=${await unsubToken(env, u.id)}` });
        }
        const r = await sendMail(env, u.email, msg); if (r.sent || r.test) sent++;
      } catch (e) { console.error('email job', j.kind, e?.message); }
    }
    if (sent) await env.DB.prepare('UPDATE email_jobs SET sent=sent+? WHERE id=?').bind(sent, j.id).run();
  }
  return jobs.length;
}

// Super admin: email any open pool (a sponsor's or Tap Am's) to players who said yes to pool news. Free.
export async function emailPool(env, admin, d) {
  if (!marketingEmailOn(await settings(env))) return json({ error: 'Pool news emails are off: ZeptoMail is for account emails only. Connect a marketing email service first.' }, 400);
  const pool = await env.DB.prepare("SELECT id, sponsor_user_id, name FROM pools WHERE id=? AND status NOT IN ('CANCELLED') AND settled_at IS NULL").bind(String(d.pool || '')).first();
  if (!pool) return json({ error: 'Pick a pool that is still open.', field: 'pool' }, 400);
  const aud = ['ALL', 'LAPO', 'MAPO', 'NEPO'].includes(d.audience) ? d.audience : 'ALL';
  if (await env.DB.prepare("SELECT 1 FROM email_blasts WHERE pool_id=? AND status IN ('QUEUED','SENDING')").bind(pool.id).first()) return json({ error: 'This pool is already being emailed.' }, 409);
  await env.DB.prepare('INSERT INTO email_blasts(id,pool_id,sponsor_id,audience,price_kobo) VALUES(?,?,?,?,0)').bind(uid(), pool.id, pool.sponsor_user_id || admin.id, aud).run();
  return json({ message: `“${pool.name}” will be emailed to players who said yes to pool news, starting in the next few minutes.`, reload: true });
}

export async function siteLinks(env) {
  const s = await settings(env);
  return { whatsapp: s.whatsapp_community || '', twitter: s.social_twitter || '', instagram: s.social_instagram || '', tiktok: s.social_tiktok || '' };
}
