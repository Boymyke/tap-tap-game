// Sponsor (and admin) API for ads, plus image uploads to R2 and serving them.
import { json, readJson, uid, nowIso } from '../lib.js';
import { requireRole, isNepo, loadUser, notify } from '../core.js';
import { allow } from '../lib.js';

const YT = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
const safeUrl = u => { try { const x = new URL(u); return ['https:', 'http:'].includes(x.protocol) ? x.href : null; } catch { return null; } };
const TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAX_UPLOAD = 3 * 1024 * 1024;

function sniff(bytes) {
  const b = bytes;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
  return null;
}

export async function handleSponsorApi(req, env, path, user) {
  // ── uploads (sponsors, admin, Nepo babies for pool skins) ──
  if (path === '/api/upload' && req.method === 'POST') {
    const deny = requireRole(user, ['SPONSOR', 'ADMIN', 'USER']); if (deny) return deny;
    if (user.role === 'USER' && !isNepo(await loadUser(env, user.id))) return json({ error: 'Uploads na for Nepo babies and sponsors.', code: 'UPGRADE', need: 'NEPO', redirect: '/plans', go: 'See plans' }, 403);
    if (!env.MEDIA) return json({ error: 'Picture uploads are not switched on yet (the admin needs to enable storage). Use a YouTube video for now.' }, 503);
    if (!await allow(env, 'upload:' + user.id, 30, 3600)) return json({ error: 'Too many uploads. Wait small.' }, 429);
    const origin = req.headers.get('origin');
    if (origin && new URL(origin).host !== new URL(req.url).host) return json({ error: 'Request blocked.' }, 403);
    const form = await req.formData().catch(() => null);
    const file = form?.get('file');
    if (!file || typeof file === 'string') return json({ error: 'Pick an image.' }, 400);
    if (file.size > MAX_UPLOAD) return json({ error: 'Image too big (3 MB max).' }, 413);
    const buf = new Uint8Array(await file.arrayBuffer());
    const type = sniff(buf);
    if (!type) return json({ error: 'Use a PNG, JPG, WebP or GIF image.' }, 415);
    const key = `u/${new Date().toISOString().slice(0, 7)}/${uid()}.${TYPES[type]}`;
    await env.MEDIA.put(key, buf, { httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' } });
    await env.DB.prepare('INSERT INTO media(key,owner_id,content_type,size) VALUES(?,?,?,?)').bind(key, user.id, type, buf.length).run();
    return json({ url: `/media/${key}` });
  }

  // ── sponsor profile ──
  if (path === '/api/sponsor/profile' && req.method === 'POST') {
    const deny = requireRole(user, ['SPONSOR']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    const company = String(data.company || '').trim();
    if (company.length < 2 || company.length > 60) return json({ error: 'Company name must be 2–60 characters.', field: 'company' }, 400);
    const website = data.website ? safeUrl(data.website) : null;
    if (data.website && !website) return json({ error: 'Enter a full link, like https://yourbrand.com', field: 'website' }, 400);
    const logo = /^\/media\//.test(data.logo_url || '') ? data.logo_url : null;
    await env.DB.prepare('INSERT INTO sponsor_profiles(user_id,company,website,logo_url) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET company=excluded.company,website=excluded.website,logo_url=COALESCE(excluded.logo_url,sponsor_profiles.logo_url)').bind(user.id, company, website, logo).run();
    return json({ message: 'Profile saved', reload: true });
  }

  // ── ads (sponsor's own; admin can create global ones) ──
  if (path === '/api/promos' && req.method === 'POST') {
    const deny = requireRole(user, ['SPONSOR', 'ADMIN']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    const title = String(data.title || '').trim();
    if (title.length < 2 || title.length > 60) return json({ error: 'Title must be 2–60 characters.', field: 'title' }, 400);
    const kind = data.kind === 'YOUTUBE' ? 'YOUTUBE' : 'IMAGE';
    let image = null, video = null;
    if (kind === 'IMAGE') { if (!/^\/media\//.test(data.image_url || '')) return json({ error: 'Upload a picture for the ad.', field: 'image_url' }, 400); image = data.image_url; }
    else { const m = YT.exec(String(data.video_url || '')); if (!m) return json({ error: 'Paste a YouTube link, like https://youtu.be/abc123XYZ00', field: 'video_url' }, 400); video = m[1]; }
    const target = data.target_url ? safeUrl(data.target_url) : null;
    if (data.target_url && !target) return json({ error: 'Enter a full link, like https://yourbrand.com', field: 'target_url' }, 400);
    const duration = Number(data.duration_seconds);
    if (![5, 10, 30].includes(duration)) return json({ error: 'Pick how long the ad shows: 5, 10 or 30 seconds.', field: 'duration_seconds' }, 400);
    const placement = 'ALL';   // ads show before the game, in the lobby and before results
    if (!await allow(env, 'promo:' + user.id, 30, 3600)) return json({ error: 'Too many ads in one hour. Wait small.' }, 429);
    let poolId = data.pool_id || null;
    if (poolId) {
      const p = await env.DB.prepare('SELECT created_by FROM pools WHERE id=?').bind(poolId).first();
      if (!p || (user.role !== 'ADMIN' && p.created_by !== user.id)) return json({ error: 'You can only attach ads to your own pools.', field: 'pool_id' }, 403);
    }
    await env.DB.prepare('INSERT INTO promos(id,title,owner_id,kind,image_url,video_id,target_url,placement,pool_id,approved,duration_seconds) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
      .bind(uid(), title, user.id, kind, image, video, target, placement, poolId, user.role === 'ADMIN' ? 1 : 0, duration).run();
    if (user.role !== 'ADMIN') { const admins = (await env.DB.prepare("SELECT id FROM users WHERE role='ADMIN'").all()).results; for (const a of admins) await notify(env, a.id, `New ad “${title}” waiting for approval.`, '/admin/ads'); }
    return json({ message: user.role === 'ADMIN' ? 'Ad is live' : 'Ad saved. It goes live once Tap Am approves it.', reload: true });
  }
  // ── sponsors ask for the home page slideshow; the admin approves it ──
  const hm = path.match(/^\/api\/promos\/([^/]+)\/home$/);
  if (hm && req.method === 'POST') {
    const deny = requireRole(user, ['SPONSOR']); if (deny) return deny;
    const { data, response } = await readJson(req); if (response) return response;
    const ad = await env.DB.prepare('SELECT * FROM promos WHERE id=? AND owner_id=?').bind(hm[1], user.id).first();
    if (!ad) return json({ error: 'Ad not found.' }, 404);
    if (!ad.approved) return json({ error: 'Your ad must be approved before it can go on the home page.' }, 409);
    if (await env.DB.prepare("SELECT 1 FROM slides WHERE promo_id=? AND status IN ('REQUESTED','LIVE')").bind(ad.id).first()) return json({ error: 'You already asked for this ad. We go reply soon.' }, 409);
    const sub = String(data.subtitle || '').trim().slice(0, 120);
    await env.DB.prepare("INSERT INTO slides(id,title,subtitle,image_url,link,color,promo_id,sponsor_id,status,created_by) VALUES(?,?,?,?,?,?,?,?,'REQUESTED',?)")
      .bind(uid(), ad.title, sub, ad.image_url, ad.target_url ? `/go/${ad.id}` : null, '#FF8A2A', ad.id, user.id, user.id).run();
    const admins = (await env.DB.prepare("SELECT id FROM users WHERE role='ADMIN'").all()).results;
    for (const a of admins) await notify(env, a.id, `A sponsor asked for a home page slot: “${ad.title}”.`, '/admin/slides');
    return json({ message: 'Request sent. The Tap Am team go check am.', reload: true });
  }
  const pm = path.match(/^\/api\/promos\/([^/]+)\/(toggle|delete)$/);
  if (pm && req.method === 'POST') {
    const deny = requireRole(user, ['SPONSOR', 'ADMIN']); if (deny) return deny;
    const p = await env.DB.prepare('SELECT owner_id,active FROM promos WHERE id=?').bind(pm[1]).first();
    if (!p || (user.role !== 'ADMIN' && p.owner_id !== user.id)) return json({ error: 'Ad not found.' }, 404);
    if (pm[2] === 'delete') await env.DB.batch([env.DB.prepare('DELETE FROM promos WHERE id=?').bind(pm[1]), env.DB.prepare('UPDATE pools SET promo_id=NULL WHERE promo_id=?').bind(pm[1]), env.DB.prepare("UPDATE slides SET status='REJECTED' WHERE promo_id=?").bind(pm[1])]);
    else await env.DB.prepare('UPDATE promos SET active=? WHERE id=?').bind(p.active ? 0 : 1, pm[1]).run();
    return json({ message: 'Done', reload: true });
  }
  return null;
}

export async function serveMedia(env, key) {
  if (!env.MEDIA || !/^u\/\d{4}-\d{2}\/[0-9a-f-]{36}\.(png|jpg|webp|gif)$/.test(key)) return new Response('Not found', { status: 404 });
  const obj = await env.MEDIA.get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  return new Response(obj.body, { headers: { 'content-type': obj.httpMetadata?.contentType || 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'" } });
}

export async function promoClick(env, id, ip = 'unknown') {
  const p = await env.DB.prepare('SELECT target_url FROM promos WHERE id=? AND approved=1').bind(id).first();
  if (!p?.target_url) return null;
  // count at most 2 clicks per visitor per ad every 10 minutes, so scripts can't inflate sponsor numbers
  if (await allow(env, `pc:${ip}:${id}`, 2, 600)) await env.DB.prepare('UPDATE promos SET clicks=clicks+1 WHERE id=?').bind(id).run();
  return p.target_url;
}
