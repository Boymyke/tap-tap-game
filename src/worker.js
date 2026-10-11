// Tap Am worker: routes pages and APIs, settles ended pools, pays automatic payouts, gives badges
// and runs health checks on a schedule.
import { authPage } from './ui/auth.js';
import { legalPage, LEGAL_PATHS } from './ui/legal.js';
import { landingPage, demoPools } from './ui/landing.js';
import { howToPlayPage, merchPage, faqPage, aboutPage, offlinePage, errorPage } from './ui/pages.js';
import { dashboardPage, poolsPage, poolPage, createPoolPage } from './ui/player.js';
import { storePage, bagPage, walletPage, plansPage, txLabel } from './ui/shop.js';
import { mePage, settingsPage, calcPage, notificationsPage, topPage, ranksPage, suggestPoolPage, invitePage } from './ui/profile.js';
import { anyPage } from './ui/kit.js';
import { playPage } from './ui/game.js';
import { sponsorHome, sponsorPools, sponsorAds, sponsorLeads } from './ui/sponsor.js';
import { adminLoginPage, adminHome, adminHealth, adminUsers, adminUser, adminGifts, adminPools, adminStore, adminRanks, adminAds, adminSlides, adminBackgrounds, adminWithdrawals, adminSuggestions, adminMerch, adminBadges, adminCodes, setupPage, suggestPage } from './ui/admin.js';
import { emailProblem } from './auth-rules.js';
import { handleAuthApi } from './auth-api.js';
import { handlePlayApi, maybeFreeBox } from './api/play.js';
import { handleMoneyApi, payCallback, paystackOn, testPayments, BANKS, autoPayouts } from './api/money.js';
import { handleAdminApi } from './api/admin.js';
import { handleSponsorApi, serveMedia, promoClick } from './api/sponsor.js';
import { handleVoiceApi } from './api/voice.js';
import { json, html, uid, nowIso, sessionCookie, hashPassword, currentUser, createSession, destroySession, readJson, allow, clientIp, safeEqual, sameOrigin } from './lib.js';
import { PATTERNS } from './ui/patterns.js';
import { isAdmin, tierLabel, tierOf, getWallet, settings, num, parseJson, itemLock, ensureWallet, randomCode, periodKeys, bump, metricStmt, lagosDay } from './core.js';
import { perks, PLANS, themeFor, soundFor, backgroundCss } from './tiers.js';
import { allRanks, rankInfo } from './game/ranks.js';
import { listStmt, getPool, poolPublic, roomCall, joinBlock, computeSidePots } from './game/pools.js';
import { awardBadges } from './game/badges.js';
import { processEmailBlasts } from './game/blasts.js';
import { logAuth, decryptPhrase, canKeepCopies } from './phrase.js';
import { runChecks, healthSweep } from './health.js';

export { GameRoom, TapMeter } from './game/room.js';

// ── small helpers ───────────────────────────────────────────────────────────
const go = (req, path, status = 302) => Response.redirect(new URL(path, req.url), status);
const homeFor = u => (u?.role === 'ADMIN' ? '/admin' : u?.role === 'SPONSOR' ? '/sponsor' : '/dashboard');
const loginFirst = (req, url) => go(req, '/login?next=' + encodeURIComponent(url.pathname + url.search));
const payMode = env => (paystackOn(env) ? 'paystack' : testPayments(env) ? 'test' : 'off');
const pageNum = q => Math.max(1, Math.min(1000, parseInt(q.get('page') || '1', 10) || 1));
const csvCell = v => { const s = String(v ?? ''); return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? "'" : '') + s.replace(/"/g, '""')}"` : s; };   // also defuses spreadsheet formulas
const csv = (name, header, rows) => new Response('﻿' + [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n'), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${name}"`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });

// Backgrounds rarely change: cache them per isolate.
let bgCache = null, bgAt = 0;
async function backgrounds(env) {
  if (bgCache && Date.now() - bgAt < 60000) return bgCache;
  bgCache = (await env.DB.prepare('SELECT * FROM backgrounds WHERE active=1 ORDER BY sort, name').all()).results; bgAt = Date.now();
  return bgCache;
}
// Theme + background for this user (Nepo only; everybody else gets the default look).
async function lookFor(env, user) {
  if (!user || user.role !== 'USER') return { theme: 'grape', bgCss: '' };
  const prefs = parseJson(user.prefs, {});
  const theme = themeFor(user, prefs);
  let bgCss = '';
  if (tierOf(user) === 'NEPO' && prefs.bg) { const b = (await backgrounds(env)).find(x => x.id === prefs.bg); if (b) bgCss = backgroundCss(b); }
  return { theme, bgCss };
}
async function base(env, user) {
  const s = await settings(env);
  const look = await lookFor(env, user);
  const tierKey = tierOf(user);
  return { user, wallet: user.wallet, unread: user.unread, tier: tierLabel(user), tierKey, perk: tierKey ? perks(tierKey, s) : null, s, ...look };
}

// ── landing data ────────────────────────────────────────────────────────────
async function siteStats(env) {
  const since = new Date(Date.now() - 120000).toISOString();
  const r = await env.DB.prepare('SELECT (SELECT COUNT(*) FROM visitors WHERE last_seen>?) AS online,(SELECT COUNT(*) FROM visitors) AS visits').bind(since).first();
  return { online: Math.max(1, Number(r?.online || 0)), visits: Number(r?.visits || 0) };
}
// Real pools first (sponsored first). When the admin switch is on, sample sponsored pools fill the deck.
async function featuredPools(env, user) {
  const s = await settings(env);
  const real = (await env.DB.prepare(`SELECT p.*, (SELECT COUNT(*) FROM pool_entries x WHERE x.pool_id=p.id) AS players FROM pools p
    WHERE p.ends_at>? AND p.status!='CANCELLED' AND p.is_private=0 ORDER BY CASE p.kind WHEN 'SPONSORED' THEN 0 WHEN 'PAID' THEN 1 ELSE 2 END, p.starts_at ASC LIMIT 6`).bind(nowIso()).all()).results;
  const colors = ['green', 'orange', 'gold', 'mustard'];
  const mapped = real.map((p, i) => ({
    name: p.name, sponsor: p.sponsor_name, players: p.players, endsAt: p.ends_at, prize: Math.round(p.prize_kobo / 100),
    vs: p.game_type === 'MATCH' && p.side_a ? [p.side_a.slice(0, 3).toUpperCase(), p.side_b.slice(0, 3).toUpperCase()] : null,
    tier: { NEPO: 'Nepo only', MAPO: 'Mapo + Nepo', LAPO: 'Lapo only' }[p.audience] || '', color: p.kind === 'SPONSORED' ? 'orange' : p.kind === 'PAID' ? 'gold' : colors[i % 4],
    kind: p.kind, href: user ? `/pool/${p.id}` : '/signup'
  }));
  if (s.landing_demo_pools !== '1') return mapped;
  const href = user ? homeFor(user) : '/signup';
  return [...mapped, ...demoPools().map(p => ({ ...p, href }))].slice(0, 6);
}

// ── site API: presence, merch, suggestions, logout, first admin ─────────────
// Recent real winners for the "just won" toasts (landing + sign-up). Names are partly hidden, and
// players who hide their profile show as "A player". Cached for a minute per isolate.
let winCache = null, winAt = 0;
const maskName = n => String(n).slice(0, 3) + '***';
async function recentWinners(env) {
  if (winCache && Date.now() - winAt < 60000) return winCache;
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const rows = (await env.DB.prepare(`SELECT u.username, u.prefs, pe.prize_kobo, p.name FROM pool_entries pe JOIN pools p ON p.id=pe.pool_id JOIN users u ON u.id=pe.user_id
    WHERE pe.prize_kobo>0 AND p.settled_at IS NOT NULL AND p.settled_at>? ORDER BY p.settled_at DESC LIMIT 20`).bind(since).all()).results;
  winCache = rows.map(r => ({ who: parseJson(r.prefs, {}).hideProfile ? 'A player' : maskName(r.username), amount: Number(r.prize_kobo), pool: r.name }));
  winAt = Date.now();
  return winCache;
}

async function handleSiteApi(req, env, path) {
  if (path === '/api/winners' && req.method === 'GET') return json({ winners: await recentWinners(env) }, 200, { 'cache-control': 'public, max-age=60' });
  if (path === '/api/presence' && req.method === 'POST') {
    const { data, response } = await readJson(req); if (response) return response;
    const vid = String(data.vid || '');
    if (!/^[0-9a-z-]{10,40}$/i.test(vid)) return json({ error: 'Bad visitor id' }, 400);
    if (await allow(env, 'presence:' + clientIp(req), 120, 3600)) {
      const now = nowIso();
      await env.DB.prepare('INSERT INTO visitors(vid,first_seen,last_seen) VALUES(?,?,?) ON CONFLICT(vid) DO UPDATE SET last_seen=excluded.last_seen').bind(vid, now, now).run();
    }
    return json(await siteStats(env));
  }
  if (path === '/api/merch/notify' && req.method === 'POST') {
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'merch:' + clientIp(req), 20, 3600)) return json({ error: 'Too many tries. Wait small.' }, 429);
    const email = String(data.email || '').trim().toLowerCase(), item = String(data.item || '');
    if (emailProblem(email)) return json({ error: 'That email no look correct.' }, 400);
    if (!/^[a-z0-9-]{2,40}$/.test(item)) return json({ error: 'Unknown item.' }, 400);
    await env.DB.prepare('INSERT OR IGNORE INTO merch_interest(email,item,created_at) VALUES(?,?,?)').bind(email, item, nowIso()).run();
    return json({ message: 'Saved' });
  }
  if (path === '/api/logout' && req.method === 'POST') {
    const who = await currentUser(req, env);
    if (who) await logAuth(env, who.id, 'LOGOUT', req);
    await destroySession(req, env);
    return json({ message: 'Logged out' }, 200, { 'set-cookie': sessionCookie('', 0) });
  }
  if (path === '/api/suggestions' && req.method === 'POST') {
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'suggest:' + clientIp(req), 10, 3600)) return json({ error: 'Too many tries. Wait small.' }, 429);
    const message = String(data.message || '').trim();
    if (message.length < 3) return json({ error: 'Write small more.', field: 'message' }, 400);
    const user = await currentUser(req, env);
    await env.DB.prepare('INSERT INTO suggestions(id,user_id,name,email,message) VALUES(?,?,?,?,?)').bind(uid(), user?.id || null, String(data.name || '').trim().slice(0, 60) || null, user?.email || null, message.slice(0, 2000)).run();
    return json({ message: 'Thank you! We don receive am.' });
  }
  if (path === '/api/setup-admin' && req.method === 'POST') {
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'setup:' + clientIp(req), 10, 3600)) return json({ error: 'Too many tries.' }, 429);
    if (!env.ADMIN_SETUP_KEY || !safeEqual(String(data.setupKey || ''), env.ADMIN_SETUP_KEY)) return json({ error: 'Wrong setup key.', field: 'setupKey' }, 403);
    if (await env.DB.prepare("SELECT 1 FROM users WHERE role='ADMIN' LIMIT 1").first()) return json({ error: 'Admin already exists.' }, 409);
    const username = String(data.username || '').trim(), email = String(data.email || '').trim().toLowerCase(), password = String(data.password || '');
    if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) return json({ error: '3–24 letters, numbers or _.', field: 'username' }, 400);
    if (emailProblem(email)) return json({ error: 'Enter a valid email.', field: 'email' }, 400);
    if (password.length < 10) return json({ error: 'Use at least 10 characters.', field: 'password' }, 400);
    const hp = await hashPassword(password); const id = uid(), now = nowIso();
    await env.DB.prepare("INSERT INTO users(id,username,email,password_hash,password_salt,password_iter,role,tier,email_verified_at) VALUES(?,?,?,?,?,?,'ADMIN','LAPO',?)").bind(id, username, email, hp.hash, hp.salt, hp.iterations, now).run();
    await ensureWallet(env, id);
    return json({ message: 'Super admin created', redirect: '/admin' }, 200, { 'set-cookie': sessionCookie(await createSession(id, env)) });
  }
  return null;
}

// ── scheduled jobs ──────────────────────────────────────────────────────────
async function sweep(env, cron) {
  const cutoff = new Date(Date.now() - 20000).toISOString();
  const due = (await env.DB.prepare("SELECT id FROM pools WHERE settled_at IS NULL AND status NOT IN ('CANCELLED','PAUSED') AND ends_at<? LIMIT 25").bind(cutoff).all()).results;
  for (const p of due) { try { await roomCall(env, p.id, '/settle', { id: p.id }); } catch (e) { console.error('sweep settle', p.id, e?.message); } }
  const now = nowIso();
  const res = await env.DB.batch([
    env.DB.prepare("INSERT INTO settings(key,value) VALUES('cron_last',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(now),
    env.DB.prepare('DELETE FROM auth_throttle WHERE reset_at<?').bind(now),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(now),
    env.DB.prepare('DELETE FROM voice_sessions WHERE updated_at<?').bind(new Date(Date.now() - 120000).toISOString()),
    env.DB.prepare('DELETE FROM email_codes WHERE expires_at<?').bind(new Date(Date.now() - 86400000).toISOString()),
    env.DB.prepare('DELETE FROM visitors WHERE last_seen<?').bind(new Date(Date.now() - 400 * 86400000).toISOString()),
    // a withdrawal claim left half-done (worker stopped between claim and debit): keep it if the money was taken, else drop it
    env.DB.prepare("UPDATE withdrawals SET status='PENDING' WHERE status='HOLD' AND datetime(created_at)<datetime(?) AND EXISTS (SELECT 1 FROM wallet_transactions t WHERE t.reference=withdrawals.id AND t.type='WITHDRAW')").bind(new Date(Date.now() - 600000).toISOString()),
    env.DB.prepare("DELETE FROM withdrawals WHERE status='HOLD' AND datetime(created_at)<datetime(?)").bind(new Date(Date.now() - 600000).toISOString())
  ]);
  const size = res[0]?.meta?.size_after;
  if (size) await env.DB.prepare("INSERT INTO settings(key,value) VALUES('db_bytes',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(String(size)).run();
  // paid tiers ending in ~3 days: remind once
  const soon = (await env.DB.prepare("SELECT id,tier,tier_until FROM users WHERE tier IN ('MAPO','NEPO') AND tier_until BETWEEN ? AND ? AND id NOT IN (SELECT user_id FROM notifications WHERE text LIKE 'Your % ends on%' AND created_at>?)")
    .bind(new Date(Date.now() + 2 * 86400000).toISOString(), new Date(Date.now() + 3 * 86400000).toISOString(), new Date(Date.now() - 5 * 86400000).toISOString()).all()).results;
  for (const u of soon) await env.DB.prepare('INSERT INTO notifications(id,user_id,text,link) VALUES(?,?,?,?)').bind(uid(), u.id, `Your ${u.tier === 'NEPO' ? 'Nepo' : 'Mapo'} ends on ${u.tier_until.slice(0, 10)}. Renew to keep your perks.`, '/plans').run();
  try { await autoPayouts(env); } catch (e) { console.error('auto payouts', e?.message); }
  try { await awardBadges(env); } catch (e) { console.error('badges', e?.message); }
  try { await processEmailBlasts(env, env.PUBLIC_URL || 'https://www.tapammm.live'); } catch (e) { console.error('blasts', e?.message); }
  const minute = new Date().getUTCMinutes();
  if (minute % 15 < 5) { try { await healthSweep(env); } catch (e) { console.error('health', e?.message); } }
  return due.length;
}

// ── entry ───────────────────────────────────────────────────────────────────
export default {
  async fetch(req, env, ctx) {
    const requestId = uid();
    let user = null;
    try {
      const url = new URL(req.url);
      const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;
      if (path.startsWith('/api/')) {
        if (req.method !== 'GET' && path !== '/api/paystack/webhook' && !sameOrigin(req)) return json({ error: 'Request blocked.' }, 403);
        const site = await handleSiteApi(req, env, path); if (site) return site;
        const auth = await handleAuthApi(req, env, path); if (auth) return auth;
        if (path === '/api/paystack/webhook') return (await handleMoneyApi(req, env, path, null)) || json({ error: 'Not found' }, 404);
        user = await currentUser(req, env);
        const res = (await handlePlayApi(req, env, path, user)) || (await handleMoneyApi(req, env, path, user)) || (await handleAdminApi(req, env, path, user))
          || (await handleSponsorApi(req, env, path, user)) || (await handleVoiceApi(req, env, path, user)) || json({ error: 'Not found' }, 404);
        if (user?._renewCookie && !res.headers.has('set-cookie')) { const r2 = new Response(res.body, res); r2.headers.append('set-cookie', user._renewCookie); return r2; }
        return res;
      }
      if (path.startsWith('/media/')) return serveMedia(env, path.slice(7));
      user = await currentUser(req, env);
      const res = await route(req, env, url, path, user);
      if (user?._renewCookie && !res.headers.has('set-cookie')) { const r2 = new Response(res.body, res); r2.headers.append('set-cookie', user._renewCookie); return r2; }
      return res;
    } catch (e) {
      console.error('fatal', requestId, e?.stack || e);
      if (ctx?.waitUntil) ctx.waitUntil(bump(env, 'errors')); else bump(env, 'errors');
      if (new URL(req.url).pathname.startsWith('/api/')) return json({ error: 'Server wahala. Try again.', requestId }, 500);
      return html(errorPage(500, { user, ref: requestId.slice(0, 8) }), 500);
    }
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(sweep(env, event.cron)); }
};

// ── pages ───────────────────────────────────────────────────────────────────
async function route(req, env, url, path, user) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return html(errorPage(400, { user }), 405);
  const q = url.searchParams;

  switch (path) {
    case '/': { const [stats, pools] = await Promise.all([siteStats(env), featuredPools(env, user)]); return html(landingPage({ user, pools, stats })); }
    case '/login': case '/signup':
      if (user) return go(req, homeFor(user));
      return html(authPage(path.slice(1), { ref: q.get('ref') || '', sponsor: q.get('type') === 'sponsor' }));
    case '/how-to-play': return html(howToPlayPage(user));
    case '/merch': return html(merchPage(user, (await env.DB.prepare('SELECT * FROM merch WHERE active=1 ORDER BY sort, created_at DESC LIMIT 60').all()).results));
    case '/faq': return html(faqPage(user));
    case '/about': return html(aboutPage(user));
    case '/offline': return html(offlinePage());
    case '/policy': return go(req, '/rules', 301);
    case '/suggest': return html(suggestPage(user));
    case '/admin/setup': if (isAdmin(user)) return go(req, '/admin'); return html(setupPage());
    case '/admin/login': if (isAdmin(user)) return go(req, '/admin'); return html(adminLoginPage(), 200, { 'x-robots-tag': 'noindex' });
    case '/pay/callback': return go(req, await payCallback(req, env));
    case '/nepo': return go(req, '/plans', 301);
    case '/leaderboard': return go(req, '/top', 301);
    case '/plans': {
      const s = await settings(env);
      const b = user ? await base(env, user) : { theme: 'grape', bgCss: '' };
      const p = plansPage({ user, tierKey: user ? tierOf(user) : null, until: user?.tier_until, settings: s, plans: { ...PLANS(s), MAPO_pools: perks('MAPO', s).pools, NEPO_pools: perks('NEPO', s).pools }, payMode: payMode(env), wallet: user?.wallet });
      return html(anyPage({ user, title: 'Plans', body: p.body, css: p.css, script: p.script, active: '/me', theme: b.theme, bgCss: b.bgCss, description: 'Lapo (free), Mapo and Nepo: compare what each Tap Am tier gets.' }));
    }
    case '/ranks': {
      const b = user ? await base(env, user) : { theme: 'grape', bgCss: '' };
      return html(ranksPage({ user, ranks: await allRanks(env), myLevel: user?.role === 'USER' ? user.rank_level : 0, theme: b.theme, bgCss: b.bgCss }));
    }
    case '/top': return topRoute(env, q, user);
  }
  const goM = path.match(/^\/go\/([0-9a-f-]{36})$/);
  if (goM) { const t = await promoClick(env, goM[1], clientIp(req)); return t ? Response.redirect(t, 302) : go(req, '/'); }
  const slM = path.match(/^\/s\/([0-9a-z-]{8,40})$/);
  if (slM) {   // home slide click: count it, then go to its link (only Tap Am pages or https links)
    const sl = await env.DB.prepare("SELECT link FROM slides WHERE id=? AND status='LIVE'").bind(slM[1]).first();
    if (sl && await allow(env, `sc:${clientIp(req)}:${slM[1]}`, 2, 600)) await env.DB.prepare('UPDATE slides SET clicks=clicks+1 WHERE id=?').bind(slM[1]).run();
    const link = sl?.link || '/pools';
    return /^\/(?!\/)[a-z0-9/_?=&.-]*$/i.test(link) || /^https:\/\//i.test(link) ? Response.redirect(new URL(link, req.url).href, 302) : go(req, '/pools');
  }
  const resM = path.match(/^\/results\/([^/]+)$/);
  if (resM) return go(req, `/pool/${resM[1]}`);
  if (LEGAL_PATHS.includes(path.slice(1))) return html(legalPage(path.slice(1), user));

  const APP = /^\/(dashboard|pools|pool|play|store|bag|wallet|me|settings|calc|notifications|suggest-pool|invite|sponsor|admin)(\/|\.|$)/;
  if (!APP.test(path)) return html(errorPage(404, { user }), 404);
  if (!user) return path.startsWith('/admin') ? go(req, '/admin/login') : loginFirst(req, url);

  if (path.startsWith('/admin')) return isAdmin(user) ? adminRoute(req, env, url, path, user) : html(errorPage(404, { user }), 404);
  if (path.startsWith('/sponsor')) return user.role === 'SPONSOR' ? sponsorRoute(req, env, url, path, user) : go(req, homeFor(user));

  if (path === '/invite') return inviteRoute(env, url, user);
  const b = await base(env, user);
  const origin = env.PUBLIC_URL || url.origin;
  switch (path) {
    case '/dashboard': {
      if (user.role !== 'USER') return go(req, homeFor(user));
      try { await maybeFreeBox(env, user, b.s); } catch (e) { console.error('free box', e?.message); }
      if (!user.referral_code) {   // accounts made before referrals existed
        for (let i = 0; i < 5 && !user.referral_code; i++) { const c = randomCode(6); const r = await env.DB.prepare('UPDATE users SET referral_code=? WHERE id=? AND referral_code IS NULL AND NOT EXISTS (SELECT 1 FROM users WHERE referral_code=?)').bind(c, user.id, c).run(); if (r.meta.changes) user.referral_code = c; }
      }
      // one round trip for everything on the home page
      const [slides, sponsored, live, upcoming, mine] = await env.DB.batch([
        env.DB.prepare("SELECT s.*, sp.company AS sponsor FROM slides s LEFT JOIN sponsor_profiles sp ON sp.user_id=s.sponsor_id WHERE s.status='LIVE' ORDER BY s.sort, s.created_at DESC LIMIT 8"),
        listStmt(env, user, { scope: 'sponsored', limit: 8 }), listStmt(env, user, { scope: 'live', limit: 8 }), listStmt(env, user, { scope: 'players-soon', limit: 8 }), listStmt(env, user, { scope: 'mine', limit: 10 })]);
      const ranks = await allRanks(env);
      if (slides.results.length) env.DB.prepare(`UPDATE slides SET views=views+1 WHERE id IN (${slides.results.map(() => '?').join(',')})`).bind(...slides.results.map(x => x.id)).run().catch(() => {});
      return html(dashboardPage({ ...b, rank: rankInfo(ranks, user), slides: slides.results, sponsored: sponsored.results.map(poolPublic), live: live.results.map(poolPublic), upcoming: upcoming.results.map(poolPublic),
        mine: mine.results.map(poolPublic).filter(p => p.state !== 'ended' && p.state !== 'cancelled'), origin, referralBatch: num(b.s, 'referral_batch', 10) }));
    }
    case '/pools': {
      const scope = ['open', 'live', 'sponsored', 'players-soon', 'mine', 'created', 'recent'].includes(q.get('scope')) ? q.get('scope') : 'open';
      const pools = (await listStmt(env, user, { scope, limit: 60 }).all()).results.map(poolPublic);
      return html(poolsPage({ ...b, scope, pools }));
    }
    case '/pools/new': {
      if (user.role === 'USER' && !b.perk?.create) return go(req, '/plans');
      const ads = user.role === 'SPONSOR' || user.role === 'ADMIN' ? (await env.DB.prepare(user.role === 'ADMIN' ? 'SELECT id,title,approved,active FROM promos WHERE approved=1 ORDER BY created_at DESC LIMIT 100' : 'SELECT id,title,approved,active FROM promos WHERE owner_id=? ORDER BY created_at DESC').bind(...(user.role === 'ADMIN' ? [] : [user.id])).all()).results : [];
      let blast = null, lapoLeft = null;
      if (user.role === 'SPONSOR') {   // price + how many players would get the email, per tier
        const now = nowIso();
        const c = await env.DB.prepare(`SELECT COUNT(*) a, SUM(CASE WHEN tier='LAPO' OR tier_until<=? THEN 1 ELSE 0 END) l, SUM(CASE WHEN tier='MAPO' AND (tier_until IS NULL OR tier_until>?) THEN 1 ELSE 0 END) m, SUM(CASE WHEN tier='NEPO' AND (tier_until IS NULL OR tier_until>?) THEN 1 ELSE 0 END) n FROM users WHERE role='USER' AND status='ACTIVE' AND email_news=1`).bind(now, now, now).first();
        blast = { price: num(b.s, 'email_blast_kobo', 2500000), counts: { ALL: Number(c?.a || 0), LAPO: Number(c?.l || 0), MAPO: Number(c?.m || 0), NEPO: Number(c?.n || 0) } };
      }
      if (user.role === 'USER' && b.tierKey === 'LAPO') {
        const max = num(b.s, 'lapo_pools_per_day', 3);
        const dayStart = new Date(Date.parse(lagosDay() + 'T00:00:00Z') - 3600000).toISOString().replace('T', ' ').slice(0, 19);
        const made = Number((await env.DB.prepare('SELECT COUNT(*) n FROM pools WHERE created_by=? AND created_at>=?').bind(user.id, dayStart).first())?.n || 0);
        lapoLeft = { max, left: Math.max(0, max - made) };
      }
      return html(createPoolPage({ ...b, role: user.role, ads, blast, lapoLeft }));
    }
    case '/play': return playRoute(req, env, url, user, b);
    case '/store': {
      if (user.role !== 'USER') return go(req, homeFor(user));
      const tab = ['SKIN', 'BOX'].includes(q.get('tab')) ? q.get('tab') : 'BOOSTER';
      const items = (await env.DB.prepare("SELECT s.*, COALESCE(i.quantity,0) AS owned FROM store_items s LEFT JOIN inventory i ON i.item_id=s.id AND i.user_id=? WHERE s.active=1 AND s.kind IN ('BOOSTER','SKIN','BOX') ORDER BY s.sort, s.price_kobo").bind(user.id).all()).results
        .map(i => ({ ...i, lock: itemLock(i, user), equipped: i.kind === 'SKIN' && user.equipped_skin === i.id }));
      return html(storePage({ ...b, items, tab, group: q.get('g') }));
    }
    case '/bag': {
      const inv = (await env.DB.prepare(`SELECT s.id AS item_id, s.name, s.kind, s.multiplier, s.duration_seconds, s.audience, s.config, s.per_game_limit, COALESCE(i.quantity,0) AS quantity, s.price_kobo, s.min_rank
        FROM store_items s LEFT JOIN inventory i ON i.item_id=s.id AND i.user_id=? WHERE ((i.quantity>0) OR (s.kind='SKIN' AND s.price_kobo=0 AND s.active=1)) AND s.kind IN ('BOOSTER','SKIN','BOX') ORDER BY s.sort`).bind(user.id).all()).results
        .filter(i => i.quantity > 0 || !itemLock(i, user)).map(i => ({ ...i, equipped: i.kind === 'SKIN' && user.equipped_skin === i.item_id }));
      // Patterns this player owns (from any skin they have, free ones included) for "Your tap area".
      const patterns = [...new Set(inv.filter(i => i.kind === 'SKIN').map(i => parseJson(i.config, {}).pattern).filter(k => PATTERNS[k]))];
      return html(bagPage({ ...b, inv, nepo: b.tierKey === 'NEPO', paid: b.tierKey === 'MAPO' || b.tierKey === 'NEPO', prefs: parseJson(user.prefs, {}), patterns }));
    }
    case '/wallet': {
      const pg = pageNum(q);
      const [tx, wd] = await env.DB.batch([
        env.DB.prepare('SELECT type,amount_kobo,balance,note,created_at FROM wallet_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 21 OFFSET ?').bind(user.id, (pg - 1) * 20),
        env.DB.prepare('SELECT * FROM withdrawals WHERE user_id=? ORDER BY created_at DESC LIMIT 10').bind(user.id)]);
      const flash = q.get('paid') === '1' ? 'Payment received. Your wallet don update.' : q.get('paid') === '0' ? 'Payment no go through. No money was taken.' : '';
      return html(walletPage({ ...b, tx: tx.results.slice(0, 20), page: pg, hasNext: tx.results.length > 20, withdrawals: wd.results, minWithdraw: b.perk ? b.perk.minWithdraw : 0, banks: BANKS, payMode: payMode(env), flash, perDay: Math.max(1, num(b.s, 'withdrawals_per_day', 1)) }));
    }
    case '/wallet/history.csv': {
      if (!await allow(env, 'csv:' + user.id, 20, 3600)) return new Response('Too many downloads. Try again later.', { status: 429 });
      const rows = (await env.DB.prepare('SELECT created_at,type,balance,amount_kobo,note,reference FROM wallet_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 5000').bind(user.id).all()).results;
      return csv(`tap-am-history-${lagosDay()}.csv`, ['Date (UTC)', 'Type', 'Balance', 'Amount (NGN)', 'Note', 'Reference'], rows.map(r => [r.created_at, txLabel(r.type), r.balance, (r.amount_kobo / 100).toFixed(2), r.note || '', r.reference || '']));
    }
    case '/me': {
      if (user.role !== 'USER') return go(req, homeFor(user));
      // Taps by day for the picked month, by month for the picked year (Lagos time).
      const keys = periodKeys(), thisYear = keys.YEAR.slice(1);
      const y = /^\d{4}$/.test(q.get('y') || '') ? q.get('y') : thisYear;
      const m = /^(0[1-9]|1[0-2])$/.test(q.get('m') || '') ? q.get('m') : (y === thisYear ? keys.MONTH.slice(6) : '12');
      const [badges, days, months, years, today, month] = await env.DB.batch([
        env.DB.prepare('SELECT b.kind,b.period,b.taps,sb.name AS sname,sb.meaning AS smeaning,sb.color AS scolor,sb.label AS slabel FROM badges b LEFT JOIN special_badges sb ON b.kind=\'X:\' || sb.id WHERE b.user_id=? AND (b.kind NOT LIKE \'X:%\' OR sb.active=1) ORDER BY b.created_at DESC LIMIT 40').bind(user.id),
        env.DB.prepare('SELECT period,taps FROM tap_stats WHERE user_id=? AND period>=? AND period<=? ORDER BY period').bind(user.id, `D${y}-${m}-01`, `D${y}-${m}-31`),
        env.DB.prepare('SELECT period,taps FROM tap_stats WHERE user_id=? AND period>=? AND period<=? ORDER BY period').bind(user.id, `M${y}-01`, `M${y}-12`),
        env.DB.prepare("SELECT substr(period,2,4) AS y FROM tap_stats WHERE user_id=? AND period LIKE 'Y%' ORDER BY period DESC").bind(user.id),
        env.DB.prepare('SELECT taps FROM tap_stats WHERE user_id=? AND period=?').bind(user.id, keys.DAY),
        env.DB.prepare('SELECT taps FROM tap_stats WHERE user_id=? AND period=?').bind(user.id, keys.MONTH)]);
      const yearList = [...new Set([thisYear, ...years.results.map(r => r.y)])].sort().reverse();
      return html(mePage({ ...b, rank: rankInfo(await allRanks(env), user), until: user.tier_until, badges: badges.results,
        taps: { y, m, years: yearList, days: days.results, months: months.results, today: Number(today.results[0]?.taps || 0), month: Number(month.results[0]?.taps || 0), lifetime: Number(user.lifetime_taps || 0) } }));
    }
    case '/settings': {
      if (user.role !== 'USER') return go(req, homeFor(user));
      return html(settingsPage({ ...b, prefs: parseJson(user.prefs, {}), backgrounds: await backgrounds(env) }));
    }
    case '/calc': if (!b.perk?.calc) return go(req, '/plans'); return html(calcPage(b));
    case '/suggest-pool': {
      const mine = (await env.DB.prepare("SELECT message,status,created_at FROM suggestions WHERE user_id=? AND kind='POOL' ORDER BY created_at DESC LIMIT 10").bind(user.id).all()).results;
      return html(suggestPoolPage({ ...b, mine }));
    }
    case '/notifications': {
      const notes = (await env.DB.prepare('SELECT text,link,read,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 60').bind(user.id).all()).results;
      return html(notificationsPage({ ...b, notes }));
    }
  }

  const pm = path.match(/^\/pool\/([^/]+)$/);
  if (pm) return poolRoute(req, env, pm[1], user, b, origin);
  return html(errorPage(404, { user }), 404);
}

async function topRoute(env, q, user) {
  const period = ['DAY', 'WEEK', 'MONTH', 'YEAR', 'ALL'].includes(q.get('p')) ? q.get('p') : 'DAY';
  const ranks = await allRanks(env);
  const name = lvl => ranks.find(r => r.level === lvl)?.name || '';
  let rows, me = null;
  if (period === 'ALL') {
    rows = (await env.DB.prepare("SELECT id,username,rank_level,lifetime_taps AS taps FROM users WHERE role='USER' AND status='ACTIVE' AND lifetime_taps>0 ORDER BY lifetime_taps DESC LIMIT 50").all()).results;
    if (user?.role === 'USER' && !rows.some(r => r.id === user.id) && user.lifetime_taps > 0) me = { taps: user.lifetime_taps, pos: 1 + Number((await env.DB.prepare("SELECT COUNT(*) n FROM users WHERE role='USER' AND status='ACTIVE' AND lifetime_taps>?").bind(user.lifetime_taps).first())?.n || 0) };
  } else {
    const key = periodKeys()[period];
    rows = (await env.DB.prepare("SELECT u.id,u.username,u.rank_level,t.taps FROM tap_stats t JOIN users u ON u.id=t.user_id WHERE t.period=? AND u.status='ACTIVE' ORDER BY t.taps DESC LIMIT 50").bind(key).all()).results;
    if (user?.role === 'USER' && !rows.some(r => r.id === user.id)) {
      const mine = await env.DB.prepare('SELECT taps FROM tap_stats WHERE period=? AND user_id=?').bind(key, user.id).first();
      if (mine) me = { taps: mine.taps, pos: 1 + Number((await env.DB.prepare('SELECT COUNT(*) n FROM tap_stats WHERE period=? AND taps>?').bind(key, mine.taps).first())?.n || 0) };
    }
  }
  const b = user ? await base(env, user) : { theme: 'grape', bgCss: '' };
  const label = { DAY: 'today', WEEK: 'this week', MONTH: 'this month', YEAR: 'this year', ALL: 'of all time' }[period];
  return html(topPage({ user, period, rows: rows.map(r => ({ ...r, rank_name: name(r.rank_level) })), me, label, badgeKind: period === 'ALL' ? 'DAY' : period, theme: b.theme, bgCss: b.bgCss }));
}

async function poolRoute(req, env, id, user, b, origin) {
  const p = await getPool(env, id, user);
  if (!p) return html(errorPage(404, { user }), 404);
  const pub = poolPublic(p);
  const isCreator = p.created_by === user.id || isAdmin(user);
  if (isCreator) pub.password = p.join_password;
  let board = null, results = null;
  if (p.settled_at && pub.state !== 'cancelled') {
    const rows = (await env.DB.prepare(`SELECT pe.user_id, pe.final_rank AS r, u.username AS n, pe.taps AS s, u.tier, u.tier_until, u.role, pe.side_choice AS side, pe.prize_kobo AS prize
      FROM pool_entries pe JOIN users u ON u.id=pe.user_id WHERE pe.pool_id=? AND pe.final_rank IS NOT NULL ORDER BY pe.taps DESC, pe.final_rank LIMIT 100`).bind(p.id).all()).results;
    results = rows.map((r, i) => ({ r: p.vs_split ? r.r : i + 1, n: r.n, s: r.s, t: tierOf(r), side: r.side, prize: r.prize, me: r.user_id === user.id }));
    const teams = {};
    if (p.side_a) for (const r of (await env.DB.prepare('SELECT side_choice, SUM(taps) t FROM pool_entries WHERE pool_id=? GROUP BY side_choice').bind(p.id).all()).results) if (r.side_choice) teams[r.side_choice] = r.t;
    board = { top: results, me: p.joined ? { rank: p.final_rank, score: p.my_taps } : null, teams };
  } else if (pub.state !== 'cancelled') {
    try { board = (await roomCall(env, p.id, `/board?uid=${encodeURIComponent(user.id)}&n=20`)).data; } catch { board = null; }
  }
  const jb = user.role === 'USER' ? joinBlock(p, user) : { why: 'Only player accounts can join pools.' };
  const myBoosters = user.role === 'USER' ? Number((await env.DB.prepare("SELECT COALESCE(SUM(i.quantity),0) n FROM inventory i JOIN store_items s ON s.id=i.item_id WHERE i.user_id=? AND s.kind='BOOSTER'").bind(user.id).first())?.n || 0) : 0;
  const entries = isCreator ? (await env.DB.prepare('SELECT u.username, pe.joined_at, pe.paid_kobo, pe.side_choice FROM pool_entries pe JOIN users u ON u.id=pe.user_id WHERE pe.pool_id=? ORDER BY pe.joined_at DESC LIMIT 200').bind(p.id).all()).results : null;
  const sidePots = p.vs_split && p.side_a ? await computeSidePots(env, p) : null;
  return html(poolPage({ ...b, pool: pub, board, results, isCreator, joinBlock: jb, myBoosters, entries, origin, sidePots }));
}

async function playRoute(req, env, url, user, b) {
  if (user.role !== 'USER') return go(req, homeFor(user));
  const ids = [...new Set(String(url.searchParams.get('pools') || url.searchParams.get('pool') || '').split(',').map(s => s.trim()).filter(Boolean))].slice(0, 20);
  if (!ids.length) return go(req, '/pools?scope=mine');
  const pk = b.perk;
  const found = (await Promise.all(ids.map(id => getPool(env, id, user)))).filter(Boolean);
  let joined = found.filter(p => p.joined && p.status !== 'PAUSED').slice(0, pk.pools);
  // Lapo-rules pools are played on their own (no one-tap-counts-in-many).
  if (joined.length > 1) { const normal = joined.filter(p => !p.lapo_rules); joined = normal.length ? normal : joined.slice(0, 1); }
  if (!joined.length) return go(req, found[0] ? `/pool/${found[0].id}` : '/pools');
  const pools = joined.map(p => { const x = poolPublic(p); return { id: x.id, name: x.name, state: x.state, startsAt: x.startsAt, endsAt: x.endsAt, boosters: x.boosters, sideA: x.sideA, sideB: x.sideB, side: p.side_choice || null, prize: x.prize, sponsor: x.sponsor, kind: x.kind, theme: x.theme, padPattern: x.padPattern, allowOwnPad: x.allowOwnPad, bg: x.bg, lapoRules: x.lapoRules }; });
  const prefs = parseJson(user.prefs, {});
  const [skinRow, items] = await env.DB.batch([
    env.DB.prepare("SELECT config FROM store_items WHERE id=? AND kind='SKIN'").bind(user.equipped_skin || 'skin-boy'),
    env.DB.prepare("SELECT s.*, COALESCE(i.quantity,0) AS quantity FROM store_items s LEFT JOIN inventory i ON i.item_id=s.id AND i.user_id=? WHERE s.kind='BOOSTER' AND s.active=1 ORDER BY s.sort").bind(user.id)]);
  const boosters = items.results.filter(x => x.quantity > 0 || itemLock(x, user)).map(x => { const lock = itemLock(x, user); return { id: x.id, name: x.name, mult: x.multiplier, dur: x.duration_seconds, qty: x.quantity, perGame: x.per_game_limit || 0, everybody: x.audience === 'ALL', color: parseJson(x.config, {}).color || '#2E8BFF', lock: lock ? { why: lock.why, need: lock.need } : null }; });
  const voice = { enabled: !!(env.CALLS_APP_ID && env.CALLS_APP_TOKEN), topN: num(b.s, 'voice_top_n', 5), minRank: num(b.s, 'voice_min_rank', 56) };
  const me = { name: user.username, tier: b.tierKey, fingers: pk.fingers, rate: pk.rate, sound: soundFor(user, prefs), muted: !!prefs.muted, vibrate: prefs.vibrate !== false, calc: !!pk.calc, rank: user.rank_level || 1, emoji: user.emoji || null };
  return html(playPage({ user, pools, boosters, skin: parseJson(skinRow.results[0]?.config, { bg: '#2E8BFF', pattern: 'waves' }), prefs, voice, serverNow: nowIso(), me, paid: b.tierKey !== 'LAPO', theme: b.theme, bgCss: b.bgCss }));
}

// ── invite page (players and sponsors) ─────────────────────────────────────
async function inviteRoute(env, url, user) {
  if (user.role !== 'USER' && user.role !== 'SPONSOR') return Response.redirect(new URL(homeFor(user), url).href, 302);
  if (!user.referral_code) {   // older accounts and sponsors made before sponsors could invite
    for (let i = 0; i < 5 && !user.referral_code; i++) { const c = randomCode(6); const r = await env.DB.prepare('UPDATE users SET referral_code=? WHERE id=? AND referral_code IS NULL AND NOT EXISTS (SELECT 1 FROM users WHERE referral_code=?)').bind(c, user.id, c).run(); if (r.meta.changes) user.referral_code = c; }
  }
  const [b, joined] = await Promise.all([base(env, user), env.DB.prepare("SELECT username, created_at FROM users WHERE referred_by=? AND status='ACTIVE' ORDER BY created_at DESC LIMIT 50").bind(user.id).all()]);
  return html(invitePage({ ...b, origin: env.PUBLIC_URL || url.origin, joined: joined.results, referralBatch: num(b.s, 'referral_batch', 10) }));
}

// ── sponsor ─────────────────────────────────────────────────────────────────
async function sponsorRoute(req, env, url, path, user) {
  const b = await base(env, user);
  const q = url.searchParams;
  if (path === '/sponsor/leads.csv') {
    const rows = (await env.DB.prepare('SELECT l.name,l.email,l.phone,l.created_at,l.consent_text,a.title FROM leads l LEFT JOIN promos a ON a.id=l.promo_id WHERE l.sponsor_id=? ORDER BY l.created_at DESC LIMIT 10000').bind(user.id).all()).results;
    return csv(`tap-am-leads-${lagosDay()}.csv`, ['Name', 'Email', 'Phone', 'Ad', 'Date (UTC)', 'Consent'], rows.map(r => [r.name, r.email, r.phone, r.title, r.created_at, r.consent_text]));
  }
  const pools = (await env.DB.prepare('SELECT p.*, (SELECT COUNT(*) FROM pool_entries x WHERE x.pool_id=p.id) AS players FROM pools p WHERE p.created_by=? ORDER BY p.starts_at DESC LIMIT 100').bind(user.id).all()).results.map(poolPublic);
  if (path === '/sponsor') {
    const [profile, ad, leads] = await env.DB.batch([
      env.DB.prepare('SELECT * FROM sponsor_profiles WHERE user_id=?').bind(user.id),
      env.DB.prepare('SELECT COALESCE(SUM(views),0) v, COALESCE(SUM(clicks),0) c FROM promos WHERE owner_id=?').bind(user.id),
      env.DB.prepare('SELECT COUNT(*) n FROM leads WHERE sponsor_id=?').bind(user.id)]);
    const stats = { pools: pools.length, players: pools.reduce((a, p) => a + Number(p.players || 0), 0), views: ad.results[0].v, clicks: ad.results[0].c, leads: leads.results[0].n };
    return html(sponsorHome({ ...b, profile: profile.results[0], stats, pools: pools.filter(p => p.state === 'live' || p.state === 'soon'), flash: q.get('paid') === '1' ? 'Payment received. Your wallet don update.' : '' }));
  }
  if (path === '/sponsor/pools') return html(sponsorPools({ ...b, pools }));
  if (path === '/sponsor/ads') {
    const [ads, slides, prof] = await env.DB.batch([
      env.DB.prepare('SELECT a.*, p.name AS pool_name, (SELECT COUNT(*) FROM leads l WHERE l.promo_id=a.id) AS leads FROM promos a LEFT JOIN pools p ON p.id=a.pool_id WHERE a.owner_id=? ORDER BY a.created_at DESC').bind(user.id),
      env.DB.prepare("SELECT promo_id,status FROM slides WHERE sponsor_id=? AND status IN ('REQUESTED','LIVE','PAUSED')").bind(user.id),
      env.DB.prepare('SELECT lead_capture FROM sponsor_profiles WHERE user_id=?').bind(user.id)]);
    return html(sponsorAds({ ...b, ads: ads.results, pools: pools.filter(p => p.state !== 'ended' && p.state !== 'cancelled'), slides: Object.fromEntries(slides.results.map(s => [s.promo_id, s.status])), leadsOn: !!prof.results[0]?.lead_capture }));
  }
  if (path === '/sponsor/leads') {
    const pg = pageNum(q);
    const [leads, prof] = await env.DB.batch([
      env.DB.prepare('SELECT l.*, a.title FROM leads l LEFT JOIN promos a ON a.id=l.promo_id WHERE l.sponsor_id=? ORDER BY l.created_at DESC LIMIT 51 OFFSET ?').bind(user.id, (pg - 1) * 50),
      env.DB.prepare('SELECT lead_capture FROM sponsor_profiles WHERE user_id=?').bind(user.id)]);
    return html(sponsorLeads({ ...b, leads: leads.results.slice(0, 50), page: pg, hasNext: leads.results.length > 50, on: !!prof.results[0]?.lead_capture }));
  }
  return html(errorPage(404, { user }), 404);
}

// ── admin ───────────────────────────────────────────────────────────────────
async function adminRoute(req, env, url, path, user) {
  const q = url.searchParams;
  const b = { user, unread: user.unread };
  if (path === '/admin') {
    const now = nowIso();
    const s = await env.DB.prepare(`SELECT
      (SELECT COUNT(*) FROM users WHERE role='USER') players,
      (SELECT COUNT(*) FROM users WHERE role='USER' AND tier='MAPO' AND (tier_until IS NULL OR tier_until>?)) mapo,
      (SELECT COUNT(*) FROM users WHERE role='USER' AND tier='NEPO' AND (tier_until IS NULL OR tier_until>?)) nepo,
      (SELECT COUNT(*) FROM users WHERE role='SPONSOR') sponsors,
      (SELECT COUNT(*) FROM pools WHERE starts_at<=? AND ends_at>? AND status!='CANCELLED') live,
      (SELECT COALESCE(SUM(balance_kobo),0) FROM wallets) wallets,
      (SELECT COALESCE(SUM(winnings_kobo),0) FROM wallets) winnings,
      (SELECT COUNT(*) FROM withdrawals WHERE status='PENDING') pendingW,
      (SELECT COUNT(*) FROM promos WHERE approved=0 AND reject_reason IS NULL) pendingAds,
      (SELECT COUNT(*) FROM slides WHERE status='REQUESTED') pendingSlides,
      (SELECT COUNT(*) FROM suggestions WHERE kind='POOL' AND status='NEW') poolIdeas,
      (SELECT COALESCE(SUM(n),0) FROM metrics WHERE key='taps' AND day=?) tapsToday`).bind(now, now, now, now, lagosDay()).first();
    const audit = (await env.DB.prepare('SELECT action,detail,created_at FROM audit_logs ORDER BY created_at DESC LIMIT 15').all()).results;
    return html(adminHome({ ...b, stats: s, settings: await settings(env), audit }));
  }
  if (path === '/admin/health') {
    const { checks, dbBytes } = await runChecks(env);
    const since = new Date(Date.now() - 7 * 86400000 + 3600000).toISOString().slice(0, 10);
    const rows = (await env.DB.prepare("SELECT key,day,n FROM metrics WHERE day>=? AND key IN ('taps','games','players','prizes_kobo','payments_kobo','errors') ORDER BY day DESC").bind(since).all()).results;
    const byDay = {}; for (const r of rows) (byDay[r.day] = byDay[r.day] || { day: r.day })[r.key] = r.n;
    const [alerts, counts] = await env.DB.batch([
      env.DB.prepare('SELECT * FROM alerts ORDER BY COALESCE(resolved_at,"9999") DESC, last_at DESC LIMIT 30'),
      env.DB.prepare('SELECT (SELECT COUNT(*) FROM users) users,(SELECT COUNT(*) FROM pools) pools,(SELECT COUNT(*) FROM pool_entries) entries,(SELECT COUNT(*) FROM wallet_transactions) tx,(SELECT COUNT(*) FROM notifications) notes,(SELECT COUNT(*) FROM tap_stats) stats')]);
    const c = counts.results[0];
    return html(adminHealth({ ...b, checks, dbBytes, metrics: Object.values(byDay), alerts: alerts.results, settings: await settings(env), usage: [['Users', c.users], ['Pools', c.pools], ['Pool entries', c.entries], ['Money records', c.tx], ['Notifications', c.notes], ['Top-tapper rows', c.stats]] }));
  }
  if (path === '/admin/users') {
    const term = String(q.get('q') || '').trim().slice(0, 60), pg = pageNum(q);
    const users = (await env.DB.prepare(`SELECT u.*, w.balance_kobo, w.winnings_kobo FROM users u LEFT JOIN wallets w ON w.user_id=u.id WHERE (?='' OR u.username LIKE ? OR u.email LIKE ?) ORDER BY u.created_at DESC LIMIT 51 OFFSET ?`).bind(term, `%${term}%`, `%${term}%`, (pg - 1) * 50).all()).results;
    return html(adminUsers({ ...b, users: users.slice(0, 50), q: term, page: pg, hasNext: users.length > 50 }));
  }
  const um = path.match(/^\/admin\/users\/([^/]+)$/);
  if (um) {
    const target = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(um[1]).first();
    if (!target) return html(errorPage(404, { user }), 404);
    const ranks = await allRanks(env);
    const [wallet, inv, items, entries, profile, flags] = await Promise.all([
      getWallet(env, target.id),
      env.DB.prepare('SELECT s.name, s.kind, i.quantity FROM inventory i JOIN store_items s ON s.id=i.item_id WHERE i.user_id=? AND i.quantity>0').bind(target.id).all(),
      env.DB.prepare("SELECT id,name,kind,audience FROM store_items WHERE kind IN ('BOOSTER','SKIN','BOX') ORDER BY kind, sort").all(),
      env.DB.prepare('SELECT pe.*, p.name FROM pool_entries pe JOIN pools p ON p.id=pe.pool_id WHERE pe.user_id=? ORDER BY pe.joined_at DESC LIMIT 30').bind(target.id).all(),
      target.role === 'SPONSOR' ? env.DB.prepare('SELECT * FROM sponsor_profiles WHERE user_id=?').bind(target.id).first() : null,
      env.DB.prepare("SELECT COUNT(*) n FROM audit_logs WHERE action='anticheat.flag' AND detail LIKE ?").bind(`%${target.id}%`).first()]);
    return html(adminUser({ ...b, target, wallet, inv: inv.results, items: items.results, entries: entries.results, rankName: ranks.find(r => r.level === target.rank_level)?.name || '', profile, flags: Number(flags?.n || 0) }));
  }
  if (path === '/admin/gifts') {
    const [items, recent] = await env.DB.batch([env.DB.prepare("SELECT id,name,kind,audience FROM store_items WHERE kind IN ('BOOSTER','SKIN','BOX') AND active=1 ORDER BY kind, sort"), env.DB.prepare("SELECT detail,created_at FROM audit_logs WHERE action='gift.bulk' ORDER BY created_at DESC LIMIT 20")]);
    return html(adminGifts({ ...b, items: items.results, recent: recent.results }));
  }
  if (path === '/admin/pools') {
    const scope = ['live', 'ended', 'all'].includes(q.get('scope')) ? q.get('scope') : 'live';
    const now = nowIso();
    const where = scope === 'live' ? 'p.ends_at>?' : scope === 'ended' ? 'p.ends_at<=?' : "?!=''";
    const pools = (await env.DB.prepare(`SELECT p.*, u.username AS creator, (SELECT COUNT(*) FROM pool_entries x WHERE x.pool_id=p.id) AS players FROM pools p LEFT JOIN users u ON u.id=p.created_by WHERE ${where} ORDER BY p.starts_at ${scope === 'live' ? 'ASC' : 'DESC'} LIMIT 150`).bind(now).all()).results
      .map(p => ({ ...poolPublic(p), creator: p.creator, settled: !!p.settled_at && p.status !== 'CANCELLED' }));
    return html(adminPools({ ...b, pools, scope }));
  }
  if (path === '/admin/store') {
    const items = (await env.DB.prepare("SELECT s.*, (SELECT COUNT(*) FROM inventory i WHERE i.item_id=s.id AND i.quantity>0) AS owners FROM store_items s WHERE s.kind IN ('BOOSTER','SKIN') ORDER BY s.kind, s.sort, s.created_at").all()).results;
    return html(adminStore({ ...b, items, edit: items.find(i => i.id === q.get('edit')) || null }));
  }
  if (path === '/admin/ranks') {
    const counts = Object.fromEntries((await env.DB.prepare("SELECT rank_level l, COUNT(*) n FROM users WHERE role='USER' GROUP BY rank_level").all()).results.map(r => [r.l, r.n]));
    const ranks = (await allRanks(env)).map(r => ({ ...r, players: counts[r.level] || 0 }));
    return html(adminRanks({ ...b, ranks, edit: ranks.find(r => String(r.level) === q.get('edit')) || null }));
  }
  if (path === '/admin/ads') {
    const [ads, pools, sponsors] = await env.DB.batch([
      env.DB.prepare('SELECT a.*, COALESCE(sp.company,u.username) AS owner, p.name AS pool_name, (SELECT COUNT(*) FROM leads l WHERE l.promo_id=a.id) AS leads FROM promos a LEFT JOIN users u ON u.id=a.owner_id LEFT JOIN sponsor_profiles sp ON sp.user_id=a.owner_id LEFT JOIN pools p ON p.id=a.pool_id ORDER BY a.approved, a.created_at DESC LIMIT 200'),
      env.DB.prepare("SELECT id,name FROM pools WHERE ends_at>? AND status!='CANCELLED' ORDER BY starts_at LIMIT 100").bind(nowIso()),
      env.DB.prepare('SELECT sp.user_id, sp.company, sp.lead_capture, (SELECT COUNT(*) FROM promos a WHERE a.owner_id=sp.user_id) ads, (SELECT COUNT(*) FROM leads l WHERE l.sponsor_id=sp.user_id) leads FROM sponsor_profiles sp ORDER BY sp.company LIMIT 200')]);
    return html(adminAds({ ...b, ads: ads.results, pools: pools.results, sponsors: sponsors.results }));
  }
  if (path === '/admin/slides') {
    const slides = (await env.DB.prepare('SELECT s.*, sp.company FROM slides s LEFT JOIN sponsor_profiles sp ON sp.user_id=s.sponsor_id ORDER BY CASE s.status WHEN \'REQUESTED\' THEN 0 WHEN \'LIVE\' THEN 1 ELSE 2 END, s.sort, s.created_at DESC LIMIT 100').all()).results;
    return html(adminSlides({ ...b, slides, edit: slides.find(s => s.id === q.get('edit')) || null }));
  }
  if (path === '/admin/backgrounds') return html(adminBackgrounds({ ...b, backgrounds: (await env.DB.prepare('SELECT * FROM backgrounds ORDER BY sort, name').all()).results }));
  if (path === '/admin/withdrawals' || path === '/admin/withdrawals.csv') {
    const rows = (await env.DB.prepare(`SELECT w.*, u.username, (SELECT COUNT(*) FROM audit_logs a WHERE a.action='anticheat.flag' AND a.detail LIKE '%' || w.user_id || '%') AS flags FROM withdrawals w JOIN users u ON u.id=w.user_id ORDER BY CASE w.status WHEN 'PENDING' THEN 0 WHEN 'PROCESSING' THEN 1 ELSE 2 END, w.created_at DESC LIMIT ${path.endsWith('.csv') ? 5000 : 200}`).all()).results;
    if (path.endsWith('.csv')) return csv(`tap-am-payouts-${lagosDay()}.csv`, ['Account name', 'Account number', 'Bank code', 'Bank', 'Amount (NGN)', 'Narration', 'Status', 'Nickname', 'Requested (UTC)', 'Reference'],
      rows.filter(w => q.get('all') === '1' || w.status === 'PENDING').map(w => [w.account_name, w.account_number, w.bank_code, w.bank_name, (w.amount_kobo / 100).toFixed(2), 'Tap Am winnings', w.status, w.username, w.created_at, w.id]));
    const s = await settings(env);
    return html(adminWithdrawals({ ...b, rows, paystack: paystackOn(env), auto: s.auto_payouts === '1' }));
  }
  if (path === '/admin/merch') {
    const items = (await env.DB.prepare('SELECT m.*, (SELECT COUNT(*) FROM merch_interest i WHERE i.item=m.id) AS interested FROM merch m ORDER BY m.sort, m.created_at DESC LIMIT 200').all()).results;
    return html(adminMerch({ ...b, items, edit: items.find(i => i.id === q.get('edit')) || null }));
  }
  if (path === '/admin/codes') return html(adminCodes({ ...b, codes: (await env.DB.prepare('SELECT * FROM promo_codes ORDER BY created_at DESC LIMIT 200').all()).results }));
  if (path === '/admin/badges') {
    const [list, given] = await env.DB.batch([
      env.DB.prepare("SELECT sb.*, (SELECT COUNT(*) FROM badges b WHERE b.kind='X:' || sb.id) AS holders FROM special_badges sb ORDER BY sb.created_at DESC"),
      env.DB.prepare("SELECT b.kind, b.created_at, u.username FROM badges b JOIN users u ON u.id=b.user_id WHERE b.kind LIKE 'X:%' ORDER BY b.created_at DESC LIMIT 60")]);
    return html(adminBadges({ ...b, badges: list.results, given: given.results }));
  }
  if (path === '/admin/suggestions') {
    const rows = (await env.DB.prepare('SELECT * FROM suggestions ORDER BY CASE status WHEN \'NEW\' THEN 0 ELSE 1 END, created_at DESC LIMIT 200').all()).results;
    return html(adminSuggestions({ ...b, rows }));
  }
  return html(errorPage(404, { user }), 404);
}
