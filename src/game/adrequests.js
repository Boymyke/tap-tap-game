// Home page ad slots: any player or sponsor asks for a slide on everybody's home page (a YouTube video or a
// picture link, a title, where it should go, and what they want). The price comes from the super admin's
// price list (per day / week / month / year) and is paid from the wallet when they apply; a rejected or
// cancelled request is refunded. The admin publishes it as a home slide for a number of days, after which the
// cron takes it down by itself.
import { json, uid, nowIso, allow } from '../lib.js';
import { debit, credit, notify, num, naira, clampInt, settings } from '../core.js';
import { sendMail, announcementEmail } from '../email.js';

export const PERIODS = { DAY: ['day', 1], WEEK: ['week', 7], MONTH: ['month', 30], YEAR: ['year', 365] };
const YT = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
const httpsUrl = u => { try { const x = new URL(String(u).trim()); return x.protocol === 'https:' ? x.href.slice(0, 400) : null; } catch { return null; } };
export const slidePrices = s => Object.fromEntries(Object.keys(PERIODS).map(k => [k, num(s, `slide_price_${k.toLowerCase()}_kobo`, { DAY: 500000, WEEK: 3000000, MONTH: 10000000, YEAR: 100000000 }[k])]));
const SITE = env => env.PUBLIC_URL || 'https://tapammm.live';

export async function submitAdRequest(env, user, d) {
  if (!['USER', 'SPONSOR'].includes(user.role)) return json({ error: 'Only players and sponsors can apply.' }, 403);
  if (!await allow(env, 'adreq:' + user.id, 5, 86400)) return json({ error: 'You can apply 5 times a day. Try again tomorrow.' }, 429);
  const open = Number((await env.DB.prepare("SELECT COUNT(*) n FROM ad_requests WHERE user_id=? AND status='PENDING'").bind(user.id).first())?.n || 0);
  if (open >= 3) return json({ error: 'You have 3 requests waiting already. Wait for Tap Am to reply.' }, 409);
  const title = String(d.title || '').trim();
  if (title.length < 3 || title.length > 60) return json({ error: 'Title must be 3–60 characters.', field: 'title' }, 400);
  let youtube = null, image = null;
  if (String(d.youtube_url || '').trim()) { const m = YT.exec(String(d.youtube_url)); if (!m) return json({ error: 'Paste a YouTube link, like https://youtu.be/abc123XYZ00', field: 'youtube_url' }, 400); youtube = `https://youtu.be/${m[1]}`; }
  if (String(d.image_url || '').trim()) { image = httpsUrl(d.image_url); if (!image) return json({ error: 'Paste the full https:// link to the picture (Google Drive, Docs, Dropbox…).', field: 'image_url' }, 400); }
  if (!youtube && !image) return json({ error: 'Add a YouTube link or a link to your picture.', field: 'youtube_url' }, 400);
  const target = String(d.target_url || '').trim() ? httpsUrl(d.target_url) : null;
  if (String(d.target_url || '').trim() && !target) return json({ error: 'Enter the full https:// link people should go to.', field: 'target_url' }, 400);
  const details = String(d.details || '').trim().slice(0, 600);
  const period = PERIODS[d.period] ? d.period : null;
  if (!period) return json({ error: 'Pick how long: days, weeks, months or a year.', field: 'period' }, 400);
  const units = clampInt(d.units, 1, period === 'YEAR' ? 2 : period === 'MONTH' ? 12 : period === 'WEEK' ? 12 : 30, 1);
  const price = slidePrices(await settings(env))[period] * units;
  const id = uid();
  if (price > 0 && !await debit(env, user.id, price, { type: 'SLIDE_AD', reference: id, note: `Home page ad: ${title}` }))
    return json({ error: `This costs ${naira(price)}. Add money to your wallet first.`, code: 'FUNDS', redirect: '/wallet', go: 'Fund wallet' }, 402);
  await env.DB.prepare('INSERT INTO ad_requests(id,user_id,title,youtube_url,image_url,target_url,details,period,units,price_kobo,paid_from) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, user.id, title, youtube, image, target, details || null, period, units, price, price > 0 ? 'WALLET' : null).run();
  const admins = (await env.DB.prepare("SELECT id FROM users WHERE role='ADMIN'").all()).results;
  for (const a of admins) await notify(env, a.id, `New home page ad request: “${title}” (${units} ${PERIODS[period][0]}${units === 1 ? '' : 's'}, ${naira(price)}).`, '/admin/ad-requests');
  return json({ message: price > 0 ? `Request sent. ${naira(price)} was taken from your wallet — it comes back if Tap Am can’t run it.` : 'Request sent. Tap Am will reply soon.', reload: true });
}

export async function cancelAdRequest(env, user, id) {
  const r = await env.DB.prepare("UPDATE ad_requests SET status='CANCELLED', updated_at=? WHERE id=? AND user_id=? AND status='PENDING'").bind(nowIso(), id, user.id).run();
  if (!r.meta.changes) return json({ error: 'Only requests still waiting can be cancelled.' }, 409);
  const q = await env.DB.prepare('SELECT price_kobo, title FROM ad_requests WHERE id=?').bind(id).first();
  if (q?.price_kobo > 0) await credit(env, user.id, q.price_kobo, { type: 'REFUND', reference: id, note: `Home page ad cancelled: ${q.title}` });
  return json({ message: q?.price_kobo > 0 ? `Cancelled. ${naira(q.price_kobo)} is back in your wallet.` : 'Cancelled.', reload: true });
}

async function tell(env, req, text, { email = false, title, message } = {}) {
  await notify(env, req.user_id, text, '/advertise');
  if (!email) return false;
  const u = await env.DB.prepare("SELECT email FROM users WHERE id=? AND status='ACTIVE'").bind(req.user_id).first();
  if (!u?.email) return false;
  try { const r = await sendMail(env, u.email, announcementEmail({ site: SITE(env), service: true, title, message, link: SITE(env) + '/advertise', linkLabel: 'See your request' })); return !!(r.sent || r.test); }
  catch (e) { console.error('ad request email', e?.message); return false; }
}

// Super admin: publish (make it a live home slide for N days), reject (refund), or take it down early.
export async function adminAdRequest(env, admin, id, action, d) {
  const req = await env.DB.prepare('SELECT * FROM ad_requests WHERE id=?').bind(id).first();
  if (!req) return json({ error: 'Request not found.' }, 404);
  const email = d.email === true, note = String(d.note || '').trim().slice(0, 300);
  if (action === 'publish') {
    if (req.status !== 'PENDING') return json({ error: 'Only waiting requests can be published.' }, 409);
    const days = clampInt(d.days, 1, 730, PERIODS[req.period][1] * req.units);
    let image = String(d.image_url || '').trim();
    if (image && !/^\/media\/[A-Za-z0-9/_.-]+$/.test(image) && !httpsUrl(image)) return json({ error: 'Upload the picture or paste a direct https:// image link.', field: 'image_url' }, 400);
    const yt = req.youtube_url ? YT.exec(req.youtube_url)?.[1] : null;
    if (!image) image = yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : '';
    if (!image) return json({ error: 'Their picture link is not a picture we can show. Download it and upload it here.', field: 'image_url' }, 400);
    const until = new Date(Date.now() + days * 86400000).toISOString(), slideId = uid();
    const claim = await env.DB.prepare("UPDATE ad_requests SET status='LIVE', slide_id=?, live_until=?, admin_note=?, updated_at=? WHERE id=? AND status='PENDING'").bind(slideId, until, note || null, nowIso(), id).run();
    if (!claim.meta.changes) return json({ error: 'This request just changed. Refresh.' }, 409);
    await env.DB.prepare("INSERT INTO slides(id,title,subtitle,image_url,link,color,sponsor_id,status,cta,created_by,expires_at,request_id,note) VALUES(?,?,?,?,?,?,?,'LIVE',?,?,?,?,?)")
      .bind(slideId, req.title, '', image, req.target_url || req.youtube_url || null, '#FF8A2A', req.user_id, String(d.cta || '').trim().slice(0, 20) || (req.youtube_url && !req.target_url ? 'Watch am' : 'Check am'), admin.id, until, id, 'Ad request').run();
    const mailed = await tell(env, req, `Your home page ad “${req.title}” is live for ${days} day${days === 1 ? '' : 's'}!${note ? ' ' + note : ''}`, { email, title: 'Your Tap Am home page ad is live', message: `Your ad “${req.title}” is now on the Tap Am home page for ${days} day${days === 1 ? '' : 's'} (until ${until.slice(0, 10)}). It comes down by itself after that.${note ? `\n\n${note}` : ''}` });
    return json({ message: `Published for ${days} day${days === 1 ? '' : 's'}.${mailed ? ' They got an email.' : ''}`, reload: true });
  }
  if (action === 'reject') {
    if (note.length < 3) return json({ error: 'Tell them why (at least 3 characters).', field: 'note' }, 400);
    const r = await env.DB.prepare("UPDATE ad_requests SET status='REJECTED', admin_note=?, updated_at=? WHERE id=? AND status='PENDING'").bind(note, nowIso(), id).run();
    if (!r.meta.changes) return json({ error: 'Only waiting requests can be rejected.' }, 409);
    if (req.price_kobo > 0) await credit(env, req.user_id, req.price_kobo, { type: 'REFUND', reference: id, note: `Home page ad not approved: ${req.title}` });
    const mailed = await tell(env, req, `Your home page ad “${req.title}” wasn’t approved: ${note}${req.price_kobo > 0 ? ` Your ${naira(req.price_kobo)} is back in your wallet.` : ''}`, { email, title: 'About your Tap Am home page ad', message: `We couldn’t run your ad “${req.title}”.\n\n${note}${req.price_kobo > 0 ? `\n\nYour ${naira(req.price_kobo)} is back in your wallet.` : ''}` });
    return json({ message: `Rejected${req.price_kobo > 0 ? ' and refunded' : ''}.${mailed ? ' They got an email.' : ''}`, reload: true });
  }
  if (action === 'end') {
    const r = await env.DB.prepare("UPDATE ad_requests SET status='ENDED', live_until=?, updated_at=? WHERE id=? AND status='LIVE'").bind(nowIso(), nowIso(), id).run();
    if (!r.meta.changes) return json({ error: 'Only live ads can be taken down.' }, 409);
    if (req.slide_id) await env.DB.prepare("UPDATE slides SET status='ENDED' WHERE id=?").bind(req.slide_id).run();
    await tell(env, req, `Your home page ad “${req.title}” has come down.${note ? ' ' + note : ''}`, { email, title: 'Your Tap Am home page ad has ended', message: `Your ad “${req.title}” is no longer on the home page.${note ? `\n\n${note}` : ''}` });
    return json({ message: 'Taken down.', reload: true });
  }
  return json({ error: 'Unknown action.' }, 400);
}

// Cron: slides whose days are up come down by themselves, and their owners are told.
export async function expireSlides(env) {
  const now = nowIso();
  const due = (await env.DB.prepare("SELECT id, user_id, title, slide_id FROM ad_requests WHERE status='LIVE' AND live_until<=? LIMIT 50").bind(now).all()).results;
  await env.DB.prepare("UPDATE slides SET status='ENDED' WHERE status='LIVE' AND expires_at IS NOT NULL AND expires_at<=?").bind(now).run();
  for (const r of due) {
    const c = await env.DB.prepare("UPDATE ad_requests SET status='ENDED', updated_at=? WHERE id=? AND status='LIVE'").bind(now, r.id).run();
    if (c.meta.changes) await notify(env, r.user_id, `Your home page ad “${r.title}” has finished its run. Apply again any time.`, '/advertise');
  }
  return due.length;
}
