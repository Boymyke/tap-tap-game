// Tap Am worker: routes pages and APIs, settles ended pools, pays automatic payouts, gives badges
// and runs health checks on a schedule.
import { authPage } from './ui/auth.js';
import { legalPage, LEGAL_PATHS } from './ui/legal.js';
import { landingPage, demoPools } from './ui/landing.js';
import { howToPlayPage, merchPage, faqPage, aboutPage, offlinePage, errorPage, unsubPage } from './ui/pages.js';
import { dashboardPage, poolsPage, poolPage, createPoolPage, resultsPage } from './ui/player.js';
import { storePage, bagPage, walletPage, plansPage, txLabel } from './ui/shop.js';
import { mePage, settingsPage, calcPage, notificationsPage, topPage, ranksPage, suggestPoolPage, invitePage, winnersPage, playersPage, profilePage, innerCirclePage, advertisePage } from './ui/profile.js';
import { anyPage } from './ui/kit.js';
import { playPage } from './ui/game.js';
import { sponsorHome, sponsorPools, sponsorAds, sponsorLeads } from './ui/sponsor.js';
import { adminLoginPage, adminHome, adminHealth, adminUsers, adminUser, adminGifts, adminPools, adminStore, adminRanks, adminAds, adminSlides, adminBackgrounds, adminWithdrawals, adminSuggestions, adminMerch, adminBadges, adminCodes, adminMoney, setupPage, suggestPage, adminErrors, adminMessages, adminInnerCircle, adminAdRequests } from './ui/admin.js';
import { members as icMembers, invitees as icInvitees, rulesText, DEFAULT_RULES } from './game/inner.js';
import { emailProblem } from './auth-rules.js';
import { emailConfigured } from './email.js';
import { handleAuthApi } from './auth-api.js';
import { handlePlayApi, maybeFreeBox } from './api/play.js';
import { handleMoneyApi, payCallback, gateway, testPayments, banksFor, autoPayouts, reconcileBachs } from './api/money.js';
import { handleAdminApi } from './api/admin.js';
import { handleSponsorApi, serveMedia, promoClick } from './api/sponsor.js';
import { handleVoiceApi } from './api/voice.js';
import { json, html, uid, nowIso, sessionCookie, hashPassword, currentUser, createSession, destroySession, readJson, allow, clientIp, safeEqual, sameOrigin, sha256Hex, likeEsc, logError, memo } from './lib.js';
import { PATTERNS } from './ui/patterns.js';
import { isAdmin, tierLabel, tierOf, getWallet, settings, num, parseJson, itemLock, ensureWallet, randomCode, periodKeys, bump, metricStmt, lagosDay, naira } from './core.js';
import { perks, PLANS, themeFor, soundFor, backgroundCss } from './tiers.js';
import { allRanks, rankInfo } from './game/ranks.js';
import { listStmt, getPool, poolPublic, roomCall, joinBlock, expireWaiting, closeVotes, voteCounts } from './game/pools.js';
import { awardBadges } from './game/badges.js';
import { processEmailBlasts, unsubOk } from './game/blasts.js';
import { challengeLists, expireChallenges } from './game/challenges.js';
import { siteLinks, processEmailJobs } from './game/announce.js';
import { queueTopGames } from './game/gamemail.js';
import { expireSlides, slidePrices } from './game/adrequests.js';
import { challengesPage } from './ui/challenges.js';
import { logAuth, decryptPhrase, canKeepCopies } from './phrase.js';
import { runChecks, healthSweep } from './health.js';

export { GameRoom, TapMeter } from './game/room.js';

// ── small helpers ───────────────────────────────────────────────────────────
const go = (req, path, status = 302) => Response.redirect(new URL(path, req.url), status);
const homeFor = u => (u?.role === 'ADMIN' ? '/admin' : u?.role === 'SPONSOR' ? '/sponsor' : '/dashboard');
const loginFirst = (req, url) => go(req, '/login?next=' + encodeURIComponent(url.pathname + url.search));
const payMode = env => gateway(env) || (testPayments(env) ? 'test' : 'off');
// LIKE search that keeps _ and % as normal letters ("mike_addy" finds mike_addy, not mikeXaddy).
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
  winCache = rows.map(r => ({ who: maskName(r.username), amount: Number(r.prize_kobo), pool: r.name }));
  winAt = Date.now();
  return winCache;
}

// Toasts on the landing and sign-up pages: real recent wins (names partly hidden) mixed with Tap Am tips.
// The tips change every day (picked by the Lagos date). They are tips and news — never invented wins.
const TIPS = [
  ['⚡', 'Instant matches start the moment the last seat fills.'], ['🎯', 'Daily instant match at 1 PM and 8 PM — bring your squad.'],
  ['🥊', 'New: Tap-offs! Challenge any player 1-on-1.'], ['👆', 'Two fingers beat one. Mapo babies tap in 3 pools at once.'],
  ['🚀', 'Boosters stack one after the other — a stronger one jumps the queue.'], ['🎁', 'Free mystery boxes drop for active players.'],
  ['🏆', 'Top tappers of the day, week and month get badges.'], ['💰', 'The top winner of each day, month and year gets a winner badge.'], ['🍚', 'VS pools: pick Jollof or Fried rice. The side with more taps takes the whole pot.'],
  ['⏱', 'In some games, ₦10,000 adds 10 seconds to the clock for everybody.'], ['🔒', 'Private pools: invite your people by name, no password needed.'],
  ['📣', 'Sponsors: put your brand on a pool and reach every player who joins.'], ['🎙', 'Nepo babies in the top 3 fit talk live during a match.'],
  ['📊', 'The booster calculator tells you which booster takes you to the top.'], ['🔁', 'Lost the network? Your taps wait and send when you’re back.'],
  ['🎖', 'Every tap counts toward your rank — 100 ranks to climb.'], ['🤝', 'Invite friends with your link and earn free boosters.'],
  ['🧠', 'Fair play: the server counts every tap. No bots, no wahala.'], ['💸', 'Winnings go straight to your winnings balance after every pool.'],
  ['🗓', 'Schedule a pool for later and share the code with your group.'], ['🎨', 'Nepo babies pick their own backgrounds and tap areas.'],
  ['📱', 'Add Tap Am to your home screen for one-tap play.'], ['🥇', 'Share your results card after every match.']
];
function dailyTips(n = 6) {
  let seed = Number(lagosDay().replace(/-/g, '')) % 2147483647;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  return [...TIPS].map(t => [rnd(), t]).sort((a, b) => a[0] - b[0]).slice(0, n).map(([, [icon, text]]) => ({ icon, text }));
}

async function handleSiteApi(req, env, path) {
  if (path === '/api/links' && req.method === 'GET') return json(await memo('links', 60000, () => siteLinks(env)), 200, { 'cache-control': 'public, max-age=120' });
  if (path === '/api/winners' && req.method === 'GET') return json({ winners: await recentWinners(env), tips: dailyTips() }, 200, { 'cache-control': 'public, max-age=60' });
  // "Stop these emails" link from a pool news email (signed per player, works without logging in)
  if (path === '/api/unsub' && req.method === 'POST') {
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'unsub:' + clientIp(req), 30, 3600)) return json({ error: 'Too many tries. Wait small.' }, 429);
    const id = String(data.u || '').slice(0, 64);
    if (!await unsubOk(env, id, data.t)) return json({ error: 'This link is not valid. Turn emails off in Settings instead.' }, 400);
    const col = { news: 'email_news', games: 'email_games', invites: 'allow_invites' }[data.k] || 'email_news';
    await env.DB.prepare(`UPDATE users SET ${col}=0 WHERE id=?`).bind(id).run();
    return json({ message: { email_news: 'Done. No more pool news emails.', email_games: 'Done. No more top games emails.', allow_invites: 'Done. Nobody can invite you to matches now.' }[col] });
  }
  if (path === '/api/presence' && req.method === 'POST') {
    const { data, response } = await readJson(req); if (response) return response;
    const vid = String(data.vid || '');
    if (!/^[0-9a-z-]{10,40}$/i.test(vid)) return json({ error: 'Bad visitor id' }, 400);
    // per visitor, plus a high per-IP ceiling (many phones share one carrier IP)
    if (await allow(env, 'presenceip:' + clientIp(req), 3000, 3600)) {
      const now = nowIso();
      await env.DB.prepare('INSERT INTO visitors(vid,first_seen,last_seen) VALUES(?,?,?) ON CONFLICT(vid) DO UPDATE SET last_seen=excluded.last_seen').bind(vid, now, now).run();
    }
    return json(await memo('stats', 10000, () => siteStats(env)), 200, { 'cache-control': 'no-store' });
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
    // The setup key is either the ADMIN_SETUP_KEY secret, or a one-time code whose SHA-256 is stored in
    // settings.admin_setup_hash (put there by the developer; deleted as soon as the admin exists).
    const key = String(data.setupKey || '');
    const stored = (await env.DB.prepare("SELECT value FROM settings WHERE key='admin_setup_hash'").first())?.value;
    const keyOk = (env.ADMIN_SETUP_KEY && safeEqual(key, env.ADMIN_SETUP_KEY)) || (stored && key.length >= 16 && safeEqual(await sha256Hex('tapam-setup:' + key), stored));
    if (!keyOk) return json({ error: 'Wrong setup key.', field: 'setupKey' }, 403);
    if (await env.DB.prepare("SELECT 1 FROM users WHERE role='ADMIN' LIMIT 1").first()) return json({ error: 'Admin already exists.' }, 409);
    const username = String(data.username || '').trim(), email = String(data.email || '').trim().toLowerCase(), password = String(data.password || '');
    if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) return json({ error: '3–24 letters, numbers or _.', field: 'username' }, 400);
    if (emailProblem(email)) return json({ error: 'Enter a valid email.', field: 'email' }, 400);
    if (password.length < 10) return json({ error: 'Use at least 10 characters.', field: 'password' }, 400);
    const hp = await hashPassword(password); const id = uid(), now = nowIso();
    // one statement: only creates the admin while there is none, so two setups at once can't make two
    const ins = await env.DB.prepare("INSERT INTO users(id,username,email,password_hash,password_salt,password_iter,role,tier,email_verified_at) SELECT ?,?,?,?,?,?,'ADMIN','LAPO',? WHERE NOT EXISTS (SELECT 1 FROM users WHERE role='ADMIN')").bind(id, username, email, hp.hash, hp.salt, hp.iterations, now).run();
    if (!ins.meta.changes) return json({ error: 'Admin already exists.' }, 409);
    await env.DB.prepare("DELETE FROM settings WHERE key='admin_setup_hash'").run();
    await ensureWallet(env, id);
    return json({ message: 'Super admin created', redirect: '/admin' }, 200, { 'set-cookie': sessionCookie(await createSession(id, env)) });
  }
  return null;
}

// ── scheduled jobs ──────────────────────────────────────────────────────────
async function sweep(env, cron) {
  const cutoff = new Date(Date.now() - 20000).toISOString();
  const due = (await env.DB.prepare("SELECT id FROM pools WHERE settled_at IS NULL AND status NOT IN ('CANCELLED','PAUSED','WAITING') AND ends_at<? LIMIT 25").bind(cutoff).all()).results;
  for (const p of due) { try { await roomCall(env, p.id, '/settle', { id: p.id }); } catch (e) { console.error('sweep settle', p.id, e?.message); } }
  try { await expireWaiting(env); } catch (e) { console.error('instant expiry', e?.message); await logError(env, 'cron instant expiry', e); }
  try { await closeVotes(env); } catch (e) { console.error('close votes', e?.message); await logError(env, 'cron pause votes', e); }
  try { await expireChallenges(env); } catch (e) { console.error('challenge expiry', e?.message); await logError(env, 'cron tap-off expiry', e); }
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
  try { await reconcileBachs(env); } catch (e) { console.error('bachs reconcile', e?.message); }
  try { await awardBadges(env); } catch (e) { console.error('badges', e?.message); }
  try { await processEmailBlasts(env, env.PUBLIC_URL || 'https://tapammm.live'); } catch (e) { console.error('blasts', e?.message); await logError(env, 'cron pool emails', e); }
  try { await expireSlides(env); } catch (e) { console.error('slide expiry', e?.message); await logError(env, 'cron home ad expiry', e); }
  try { await queueTopGames(env); } catch (e) { console.error('top games', e?.message); await logError(env, 'cron top games email', e); }
  try { await processEmailJobs(env, env.PUBLIC_URL || 'https://tapammm.live'); } catch (e) { console.error('announce emails', e?.message); await logError(env, 'cron announcement emails', e); }
  const minute = new Date().getUTCMinutes();
  if (minute % 15 < 5) { try { await healthSweep(env); } catch (e) { console.error('health', e?.message); } }
  return due.length;
}

// API dispatch (the API answers' admin links are rewritten by the caller).
async function apiRoute(req, env, path) {
  if (path === '/api/ping') return json({ ok: true });   // the "back online?" check
  let user = null;
  const site = await handleSiteApi(req, env, path); if (site) return site;
  const auth = await handleAuthApi(req, env, path); if (auth) return auth;
  if (path === '/api/paystack/webhook' || path === '/api/bachs/webhook') return (await handleMoneyApi(req, env, path, null)) || json({ error: 'Not found' }, 404);
  user = await currentUser(req, env);
  const res = (await handlePlayApi(req, env, path, user)) || (await handleMoneyApi(req, env, path, user)) || (await handleAdminApi(req, env, path, user))
    || (await handleSponsorApi(req, env, path, user)) || (await handleVoiceApi(req, env, path, user)) || json({ error: 'Not found' }, 404);
  const out = isAdmin(user) ? await hideAdminPath(env, res) : res;
  if (user?._renewCookie && !out.headers.has('set-cookie')) { const r2 = new Response(out.body, out); r2.headers.append('set-cookie', user._renewCookie); return r2; }
  return out;
}

// ── hidden admin address ────────────────────────────────────────────────────
const adminPath = env => (/^\/[A-Za-z0-9_-]{8,64}$/.test(env.ADMIN_PATH || '') ? env.ADMIN_PATH : '/whotfareyou123456789');
const ADMIN_LINK = /(["'`(=\s])\/admin(?=[\/"'`?#)\s]|$)/g;
// Rewrites /admin links (not /api/admin) in a page, a JSON answer and a redirect to the hidden address.
async function hideAdminPath(env, res) {
  const AP = adminPath(env);
  const loc = res.headers.get('location');
  const type = res.headers.get('content-type') || '';
  if (!loc && !/text\/html|application\/json/.test(type)) return res;
  let body = res.body;
  if (/text\/html|application\/json/.test(type)) { const t = await res.text(); body = t.includes('/admin') ? t.replace(ADMIN_LINK, `$1${AP}`) : t; }
  const out = new Response(body, res);
  out.headers.delete('content-length');
  if (loc) { const u = new URL(loc, 'https://x'); if (/^\/admin(\/|$)/.test(u.pathname)) out.headers.set('location', loc.replace(/\/admin(?=\/|\?|#|$)/, AP)); }
  return out;
}

// ── entry ───────────────────────────────────────────────────────────────────
// Load sampling for the health page: 1 request in 20 records its time (hourly buckets), so the super admin can
// see how busy and how fast the server is without a write on every request.
const SAMPLE = 20;
function sampleLoad(env, ctx, ms, status) {
  if (Math.random() * SAMPLE >= 1) return;
  const hour = 'H' + new Date().toISOString().slice(0, 13);
  const up = (k, n) => env.DB.prepare('INSERT INTO metrics(key,day,n) VALUES(?,?,?) ON CONFLICT(key,day) DO UPDATE SET n=n+excluded.n').bind(k, hour, n);
  const work = env.DB.batch([up('req_n', SAMPLE), up('req_ms', Math.round(ms) * SAMPLE), up('req_slow', ms > 1500 ? SAMPLE : 0), up('req_5xx', status >= 500 ? SAMPLE : 0)]).catch(() => {});
  if (ctx?.waitUntil) ctx.waitUntil(work);
}

export default {
  async fetch(req, env, ctx) {
    const t0 = Date.now();
    const res = await handle(req, env, ctx);
    try { sampleLoad(env, ctx, Date.now() - t0, res.status); } catch {}
    return res;
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(sweep(env, event.cron)); }
};

async function handle(req, env, ctx) {
  {
    const requestId = uid();
    let user = null;
    try {
      const url = new URL(req.url);
      // One address for everybody (www.tapammm.live → tapammm.live), so logins and links don't split.
      if (env.PUBLIC_URL) {
        const pu = new URL(env.PUBLIC_URL);
        if (url.hostname === 'www.' + pu.hostname) return Response.redirect(pu.origin + url.pathname + url.search, req.method === 'GET' || req.method === 'HEAD' ? 301 : 308);
      }
      const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;
      if (path.startsWith('/api/')) {
        if (req.method !== 'GET' && path !== '/api/paystack/webhook' && path !== '/api/bachs/webhook' && !sameOrigin(req)) return json({ error: 'Request blocked.' }, 403);
        // Admin links inside API answers point at the hidden admin address — only for the admin's own requests.
        const res = await apiRoute(req, env, path);
        return path === '/api/login' || path === '/api/admin/login' || path === '/api/setup-admin' ? hideAdminPath(env, res) : res;
      }
      if (path.startsWith('/media/')) return serveMedia(env, path.slice(7));
      // The super admin pages live at a hidden address (ADMIN_PATH, default /whotfareyou123456789).
      // The old /admin pages answer "not found" for everybody, signed in or not.
      if (/^\/admin(\/|\.|$)/.test(path)) { user = await currentUser(req, env); return html(errorPage(404, { user }), 404, { 'x-robots-tag': 'noindex' }); }
      const AP = adminPath(env);
      const secret = path === AP || path.startsWith(AP + '/');
      user = await currentUser(req, env);
      const inner = secret ? '/admin' + path.slice(AP.length) : path;
      let res = await route(req, env, inner === path ? url : Object.assign(new URL(url), { pathname: inner }), inner, user);
      if (secret || isAdmin(user)) res = await hideAdminPath(env, res);
      if (secret) { res = new Response(res.body, res); res.headers.set('x-robots-tag', 'noindex, nofollow'); res.headers.set('cache-control', 'no-store'); }
      if (user?._renewCookie && !res.headers.has('set-cookie')) { const r2 = new Response(res.body, res); r2.headers.append('set-cookie', user._renewCookie); return r2; }
      return res;
    } catch (e) {
      console.error('fatal', requestId, e?.stack || e);
      const where = (() => { try { const u = new URL(req.url); return { method: req.method, path: u.pathname.replace(/[0-9a-f-]{36}/g, ':id'), requestId, user: user?.id || null }; } catch { return { requestId }; } })();
      const work = Promise.all([bump(env, 'errors'), logError(env, 'request ' + where.path, e, where)]);
      if (ctx?.waitUntil) ctx.waitUntil(work); else await work;
      if (new URL(req.url).pathname.startsWith('/api/')) return json({ error: 'Server wahala. Try again.', requestId }, 500);
      return html(errorPage(500, { user, ref: requestId.slice(0, 8) }), 500);
    }
  }
}

// ── pages ───────────────────────────────────────────────────────────────────
async function route(req, env, url, path, user) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return html(errorPage(400, { user }), 405);
  const q = url.searchParams;

  switch (path) {
    case '/': { const [stats, pools] = await Promise.all([memo('stats', 30000, () => siteStats(env)), user ? featuredPools(env, user) : memo('featured', 30000, () => featuredPools(env, null))]); return html(landingPage({ user, pools, stats })); }
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
    case '/unsub': return html(unsubPage(q.get('u') || '', q.get('t') || '', q.get('k') || 'news'), 200, { 'x-robots-tag': 'noindex' });
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
    case '/winners': return winnersRoute(env, q, user);
    case '/players': return playersRoute(env, q, user);
  }
  const payM = path.match(/^\/pay\/callback\/(TA-[a-f0-9]{8,30})$/);
  if (payM) return go(req, await payCallback(req, env, payM[1]));
  const goM = path.match(/^\/go\/([0-9a-f-]{36})$/);
  if (goM) { const t = await promoClick(env, goM[1], clientIp(req)); return t ? Response.redirect(t, 302) : go(req, '/'); }
  const slM = path.match(/^\/s\/([0-9a-z-]{8,40})$/);
  if (slM) {   // home slide click: count it, then go to its link (only Tap Am pages or https links)
    const sl = await env.DB.prepare("SELECT link FROM slides WHERE id=? AND status='LIVE'").bind(slM[1]).first();
    if (sl && await allow(env, `sc:${clientIp(req)}:${slM[1]}`, 2, 600)) await env.DB.prepare('UPDATE slides SET clicks=clicks+1 WHERE id=?').bind(slM[1]).run();
    const link = sl?.link || '/pools';
    return /^\/(?!\/)[a-z0-9/_?=&.-]*$/i.test(link) || /^https:\/\//i.test(link) ? Response.redirect(new URL(link, req.url).href, 302) : go(req, '/pools');
  }
  const uM = path.match(/^\/u\/([A-Za-z0-9_]{3,24})$/);
  if (uM) return profileRoute(env, url, uM[1], user);
  const resM = path.match(/^\/results\/([^/]+)$/);
  if (resM) return go(req, `/pool/${resM[1]}`);
  if (LEGAL_PATHS.includes(path.slice(1))) return html(legalPage(path.slice(1), user));

  const resultsM = path.match(/^\/pool\/([^/]+)\/results$/);
  if (resultsM) return resultsRoute(req, env, url, resultsM[1], user);
  const APP = /^\/(dashboard|pools|pool|play|store|bag|wallet|me|settings|calc|notifications|suggest-pool|invite|challenges|advertise|inner-circle|sponsor|admin)(\/|\.|$)/;
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
        env.DB.prepare("SELECT s.*, sp.company AS sponsor FROM slides s LEFT JOIN sponsor_profiles sp ON sp.user_id=s.sponsor_id WHERE s.status='LIVE' AND (s.expires_at IS NULL OR s.expires_at>?) ORDER BY s.sort, s.created_at DESC LIMIT 8").bind(nowIso()),
        listStmt(env, user, { scope: 'sponsored', limit: 8 }), listStmt(env, user, { scope: 'live', limit: 8 }), listStmt(env, user, { scope: 'players-soon', limit: 8 }), listStmt(env, user, { scope: 'mine', limit: 10 })]);
      const [ranks, stats] = await Promise.all([allRanks(env), memo('stats', 20000, () => siteStats(env))]);
      if (slides.results.length) env.DB.prepare(`UPDATE slides SET views=views+1 WHERE id IN (${slides.results.map(() => '?').join(',')})`).bind(...slides.results.map(x => x.id)).run().catch(() => {});
      return html(dashboardPage({ ...b, rank: rankInfo(ranks, user), slides: slides.results, sponsored: sponsored.results.map(poolPublic), live: live.results.map(poolPublic), upcoming: upcoming.results.map(poolPublic),
        mine: mine.results.map(poolPublic).filter(p => p.state !== 'ended' && p.state !== 'cancelled'), origin, stats, referralBatch: num(b.s, 'referral_batch', 10) }));
    }
    case '/pools': {
      const scope = ['open', 'live', 'sponsored', 'players-soon', 'mine', 'created', 'recent'].includes(q.get('scope')) ? q.get('scope') : 'open';
      const term = String(q.get('q') || '').trim().replace(/^#/, '').slice(0, 40);
      const pg = pageNum(q);
      const [list, mine] = await env.DB.batch([listStmt(env, user, { scope, limit: 31, offset: (pg - 1) * 30, q: term }), listStmt(env, user, { scope: 'mine', limit: 30 })]);
      const rows = list.results;
      const liveIds = user.role === 'USER' ? mine.results.map(poolPublic).filter(p => p.state === 'live').map(p => p.id) : [];
      return html(poolsPage({ ...b, scope, term, page: pg, hasNext: rows.length > 30, pools: rows.slice(0, 30).map(poolPublic), liveIds }));
    }
    case '/pools/new': {
      if (user.role === 'USER' && !b.perk?.create) return go(req, '/plans');
      const ads = user.role === 'SPONSOR' || user.role === 'ADMIN' ? (await env.DB.prepare(user.role === 'ADMIN' ? "SELECT a.id,a.title,a.approved,a.active,CASE WHEN u.role='ADMIN' THEN 'Tap Am' ELSE COALESCE(sp.company,u.username) END AS owner FROM promos a LEFT JOIN users u ON u.id=a.owner_id LEFT JOIN sponsor_profiles sp ON sp.user_id=a.owner_id WHERE a.approved=1 AND a.active=1 ORDER BY a.created_at DESC LIMIT 100" : 'SELECT id,title,approved,active FROM promos WHERE owner_id=? ORDER BY created_at DESC').bind(...(user.role === 'ADMIN' ? [] : [user.id])).all()).results : [];
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
      return html(createPoolPage({ ...b, role: user.role, ads, blast, lapoLeft, opts: { lapo: b.s?.opt_lapo_rules !== '0', boosters: b.s?.opt_boosters !== '0' } }));
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
      if (user.role === 'ADMIN') return go(req, homeFor(user));   // the super admin has no wallet; money is managed in the admin pages
      const pg = pageNum(q);
      const [tx, wd] = await env.DB.batch([
        env.DB.prepare('SELECT type,amount_kobo,balance,note,created_at FROM wallet_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 21 OFFSET ?').bind(user.id, (pg - 1) * 20),
        env.DB.prepare('SELECT * FROM withdrawals WHERE user_id=? ORDER BY created_at DESC LIMIT 10').bind(user.id)]);
      let flash = q.get('paid') === '1' ? 'Payment received. Your wallet don update.' : q.get('paid') === '0' ? 'Payment no go through. No money was taken.' : q.get('paid') === 'wait' ? 'We dey confirm your payment. Your wallet updates in a minute.' : '';
      let added = 0;
      if (q.get('paid') === '1' && /^TA-[a-f0-9]{8,30}$/.test(q.get('ref') || '')) {   // only this player's own, confirmed payment
        const p = await env.DB.prepare("SELECT amount_kobo FROM payments WHERE reference=? AND user_id=? AND status='SUCCESS' AND purpose IN ('FUND','SPONSOR_FUND')").bind(q.get('ref'), user.id).first();
        if (p) { added = Number(p.amount_kobo); flash = `${naira(added)} don land for your wallet!`; }
      }
      return html(walletPage({ ...b, tx: tx.results.slice(0, 20), page: pg, hasNext: tx.results.length > 20, withdrawals: wd.results, minWithdraw: b.perk ? b.perk.minWithdraw : 0, banks: await banksFor(env), payMode: payMode(env), flash, added, perDay: Math.max(1, num(b.s, 'withdrawals_per_day', 1)), dayCap: num(b.s, 'withdraw_daily_max_kobo', 100000000) }));
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
        env.DB.prepare('SELECT b.kind,b.period,b.taps,b.amount_kobo,sb.name AS sname,sb.meaning AS smeaning,sb.color AS scolor,sb.label AS slabel FROM badges b LEFT JOIN special_badges sb ON b.kind=\'X:\' || sb.id WHERE b.user_id=? AND (b.kind NOT LIKE \'X:%\' OR sb.active=1) ORDER BY b.created_at DESC LIMIT 40').bind(user.id),
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
      if (user.role === 'ADMIN') return go(req, homeFor(user));
      const events = (await env.DB.prepare('SELECT kind, ip, ua, created_at FROM auth_events WHERE user_id=? ORDER BY created_at DESC LIMIT 20').bind(user.id).all()).results;
      return html(settingsPage({ ...b, prefs: parseJson(user.prefs, {}), backgrounds: await backgrounds(env), events }));
    }
    case '/calc': if (!b.perk?.calc) return go(req, '/plans'); return html(calcPage(b));
    case '/suggest-pool': {
      const mine = (await env.DB.prepare("SELECT message,status,created_at FROM suggestions WHERE user_id=? AND kind='POOL' ORDER BY created_at DESC LIMIT 10").bind(user.id).all()).results;
      return html(suggestPoolPage({ ...b, mine }));
    }
    case '/advertise': {   // players and sponsors apply for a home page slot
      if (user.role !== 'USER' && user.role !== 'SPONSOR') return go(req, homeFor(user));
      const mine = (await env.DB.prepare('SELECT * FROM ad_requests WHERE user_id=? ORDER BY created_at DESC LIMIT 30').bind(user.id).all()).results;
      return html(advertisePage({ ...b, mine, prices: slidePrices(b.s) }));
    }
    case '/inner-circle': {   // the rules: inner circle members (and the super admin) only
      if (!user.inner_circle && user.role !== 'ADMIN') return html(errorPage(404, { user }), 404);
      return html(innerCirclePage({ ...b, rules: rulesText(b.s), count: Number(user.referral_count || 0) }));
    }
    case '/notifications': {
      const pg = pageNum(q);
      const notes = (await env.DB.prepare('SELECT id,text,link,read,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 31 OFFSET ?').bind(user.id, (pg - 1) * 30).all()).results;
      return html(notificationsPage({ ...b, notes: notes.slice(0, 30), page: pg, hasNext: notes.length > 30 }));
    }
    case '/challenges': {
      if (user.role !== 'USER') return go(req, homeFor(user));
      return html(challengesPage({ ...b, lists: await challengeLists(env, user), on: b.s.tapoffs_on === '1', stakesOn: b.s.stakes_on === '1', opts: { lapo: b.s.opt_lapo_rules !== '0', boosters: b.s.opt_boosters !== '0' }, to: String(q.get('to') || '').slice(0, 24) }));
    }
  }

  const pm = path.match(/^\/pool\/([^/]+)$/);
  if (pm) return poolRoute(req, env, pm[1], user, b, origin);
  return html(errorPage(404, { user }), 404);
}

// Top tappers: every player in order (50 a page), with a nickname search. All time comes first.
async function topRoute(env, q, user) {
  const period = ['DAY', 'WEEK', 'MONTH', 'YEAR', 'ALL'].includes(q.get('p')) ? q.get('p') : 'ALL';
  const term = String(q.get('q') || '').trim().slice(0, 24), pg = pageNum(q);
  const ranks = await allRanks(env);
  const name = lvl => ranks.find(r => r.level === lvl)?.name || '';
  const like = term ? likeEsc(term) + '%' : '';
  let rows, me = null;
  if (period === 'ALL') {
    rows = await memo(`top:ALL:${like}:${pg}`, 30000, async () => (await env.DB.prepare(`SELECT * FROM (SELECT id,username,rank_level,emoji,lifetime_taps AS taps, ROW_NUMBER() OVER (ORDER BY lifetime_taps DESC, created_at) AS pos FROM users WHERE role='USER' AND status='ACTIVE' AND lifetime_taps>0) WHERE (?='' OR username LIKE ? ESCAPE '\\') ORDER BY pos LIMIT 51 OFFSET ?`).bind(like, like, (pg - 1) * 50).all()).results);
    if (user?.role === 'USER' && !term && user.lifetime_taps > 0 && !rows.some(r => r.id === user.id)) me = { taps: user.lifetime_taps, pos: 1 + Number((await env.DB.prepare("SELECT COUNT(*) n FROM users WHERE role='USER' AND status='ACTIVE' AND lifetime_taps>?").bind(user.lifetime_taps).first())?.n || 0) };
  } else {
    const key = periodKeys()[period];
    rows = await memo(`top:${key}:${like}:${pg}`, 30000, async () => (await env.DB.prepare(`SELECT * FROM (SELECT u.id,u.username,u.rank_level,u.emoji,t.taps, ROW_NUMBER() OVER (ORDER BY t.taps DESC, u.created_at) AS pos FROM tap_stats t JOIN users u ON u.id=t.user_id WHERE t.period=? AND u.status='ACTIVE') WHERE (?='' OR username LIKE ? ESCAPE '\\') ORDER BY pos LIMIT 51 OFFSET ?`).bind(key, like, like, (pg - 1) * 50).all()).results);
    if (user?.role === 'USER' && !term && !rows.some(r => r.id === user.id)) {
      const mine = await env.DB.prepare('SELECT taps FROM tap_stats WHERE period=? AND user_id=?').bind(key, user.id).first();
      if (mine) me = { taps: mine.taps, pos: 1 + Number((await env.DB.prepare('SELECT COUNT(*) n FROM tap_stats WHERE period=? AND taps>?').bind(key, mine.taps).first())?.n || 0) };
    }
  }
  const b = user ? await base(env, user) : { theme: 'grape', bgCss: '' };
  const label = { DAY: 'today', WEEK: 'this week', MONTH: 'this month', YEAR: 'this year', ALL: 'of all time' }[period];
  return html(topPage({ user, period, rows: rows.slice(0, 50).map(r => ({ ...r, rank_name: name(r.rank_level) })), hasNext: rows.length > 50, page: pg, term, me, label, badgeKind: period === 'ALL' ? 'DAY' : period, theme: b.theme, bgCss: b.bgCss }));
}

// Period start (Lagos time) for winner boards.
function periodStart(period) {
  const now = Date.now(), l = new Date(now + 3600000);
  const day = Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate()) - 3600000;
  if (period === 'DAY') return new Date(day).toISOString();
  if (period === 'WEEK') { const dow = (l.getUTCDay() + 6) % 7; return new Date(day - dow * 86400000).toISOString(); }
  if (period === 'MONTH') return new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), 1) - 3600000).toISOString();
  if (period === 'YEAR') return new Date(Date.UTC(l.getUTCFullYear(), 0, 1) - 3600000).toISOString();
  return '0000';
}
// Top winners: prize money won per player (from settled pools). Winnings are public.
async function topWinners(env, period, { limit = 50, offset = 0, term = '' } = {}) {
  const like = term ? likeEsc(term) + '%' : '';
  return (await env.DB.prepare(`SELECT * FROM (SELECT u.id, u.username, u.emoji, u.rank_level, SUM(pe.prize_kobo) AS won, COUNT(*) AS prizes, ROW_NUMBER() OVER (ORDER BY SUM(pe.prize_kobo) DESC) AS pos
    FROM pool_entries pe JOIN pools p ON p.id=pe.pool_id JOIN users u ON u.id=pe.user_id
    WHERE pe.prize_kobo>0 AND p.settled_at IS NOT NULL AND p.settled_at>=? AND u.status='ACTIVE' GROUP BY u.id) WHERE (?='' OR username LIKE ? ESCAPE '\\') ORDER BY pos LIMIT ? OFFSET ?`).bind(periodStart(period), like, like, limit + 1, offset).all()).results;
}
async function winnersRoute(env, q, user) {
  const period = ['DAY', 'WEEK', 'MONTH', 'YEAR', 'ALL'].includes(q.get('p')) ? q.get('p') : 'ALL';
  const term = String(q.get('q') || '').trim().slice(0, 24), pg = pageNum(q);
  const rows = await memo(`win:${period}:${term}:${pg}`, 30000, () => topWinners(env, period, { offset: (pg - 1) * 50, term }));   // cached 30 s per server
  const b = user ? await base(env, user) : { theme: 'grape', bgCss: '' };
  return html(winnersPage({ user, period, term, page: pg, hasNext: rows.length > 50, rows: rows.slice(0, 50), theme: b.theme, bgCss: b.bgCss }));
}

// Player search + public profiles. Winnings and badges are public.
async function playersRoute(env, q, user) {
  const term = String(q.get('q') || '').trim().slice(0, 24);
  const rows = term.length >= 2 ? (await env.DB.prepare("SELECT username, emoji, rank_level, tier, tier_until, lifetime_taps FROM users WHERE role='USER' AND status='ACTIVE' AND username LIKE ? ESCAPE '\\' ORDER BY lifetime_taps DESC LIMIT 30").bind(likeEsc(term) + '%').all()).results : [];
  const ranks = await allRanks(env);
  const b = user ? await base(env, user) : { theme: 'grape', bgCss: '' };
  return html(playersPage({ user, term, rows: rows.map(r => ({ ...r, rank_name: ranks.find(x => x.level === r.rank_level)?.name || '', tierName: tierLabel(r) })), theme: b.theme, bgCss: b.bgCss }));
}
async function profileRoute(env, url, nick, user) {
  const p = await env.DB.prepare("SELECT id, username, emoji, rank_level, tier, tier_until, lifetime_taps, games_played, wins, created_at, role, status FROM users WHERE username=?").bind(nick).first();
  if (!p || p.role !== 'USER' || p.status !== 'ACTIVE') return html(errorPage(404, { user }), 404);
  const own = user?.id === p.id;
  const [won, badges, bcount] = await Promise.all([
    env.DB.prepare('SELECT COALESCE(SUM(prize_kobo),0) n, COUNT(*) c FROM pool_entries WHERE user_id=? AND prize_kobo>0').bind(p.id).first(),
    env.DB.prepare("SELECT b.kind,b.period,b.taps,b.amount_kobo,sb.name AS sname,sb.meaning AS smeaning,sb.color AS scolor,sb.label AS slabel FROM badges b LEFT JOIN special_badges sb ON b.kind='X:' || sb.id WHERE b.user_id=? AND (b.kind NOT LIKE 'X:%' OR sb.active=1) ORDER BY b.created_at DESC LIMIT 40").bind(p.id).all(),
    env.DB.prepare('SELECT COUNT(*) n FROM badges WHERE user_id=?').bind(p.id).first()]);
  const ranks = await allRanks(env);
  const b = user ? await base(env, user) : { theme: 'grape', bgCss: '' };
  const tapoffsOn = (await settings(env)).tapoffs_on === '1';
  return html(profilePage({ user, tapoffsOn, p: { ...p, tierName: tierLabel(p) }, own, won: won ? Number(won.n) : null, prizes: won ? Number(won.c) : null, badges: badges.results, badgeTotal: Number(bcount?.n || 0), rank: rankInfo(ranks, p), origin: env.PUBLIC_URL || url.origin, theme: b.theme, bgCss: b.bgCss }));
}

// Public results page for a finished pool (anyone with the link can see it; it's made to be shared).
async function resultsRoute(req, env, url, id, user) {
  const p = await env.DB.prepare('SELECT * FROM pools WHERE id=? OR hashtag=?').bind(id, String(id).toUpperCase()).first();
  if (!p) return html(errorPage(404, { user }), 404);
  if (!p.settled_at || p.status === 'CANCELLED') return go(req, user ? `/pool/${p.id}` : '/');
  const rows = (await env.DB.prepare(`SELECT pe.user_id, u.username n, u.rank_level k, pe.taps s, pe.prize_kobo prize, pe.side_choice side, pe.final_rank
    FROM pool_entries pe JOIN users u ON u.id=pe.user_id WHERE pe.pool_id=? AND pe.taps>0 ORDER BY pe.taps DESC, pe.reached_at ASC LIMIT 10`).bind(p.id).all()).results
    .map(r => ({ n: r.n, k: r.k, s: r.s, side: r.side, me: r.user_id === user?.id, prize: r.prize }));
  const players = Number((await env.DB.prepare('SELECT COUNT(*) n FROM pool_entries WHERE pool_id=?').bind(p.id).first())?.n || 0);
  let vs = null;
  if (p.vs_split && p.side_a) {
    const t = (await env.DB.prepare('SELECT side_choice s, COALESCE(SUM(taps),0) t, COUNT(*) c, COALESCE(SUM(prize_kobo),0) w FROM pool_entries WHERE pool_id=? GROUP BY side_choice').bind(p.id).all()).results;
    const by = k => Object.fromEntries(t.map(r => [r.s, Number(r[k])]));
    const taps = by('t'), a = taps[p.side_a] || 0, bb = taps[p.side_b] || 0;
    vs = { taps, count: by('c'), won: by('w'), winners: a === bb ? (a ? [p.side_a, p.side_b] : []) : [a > bb ? p.side_a : p.side_b] };
  }
  const me = user ? await env.DB.prepare('SELECT final_rank, taps, prize_kobo FROM pool_entries WHERE pool_id=? AND user_id=?').bind(p.id, user.id).first() : null;
  const b = user ? await base(env, user) : { theme: 'grape', bgCss: '' };
  return html(resultsPage({ user, pool: p, rows, vs, players, me, origin: env.PUBLIC_URL || url.origin, theme: b.theme, bgCss: b.bgCss }));
}

async function poolRoute(req, env, id, user, b, origin) {
  const p = await getPool(env, id, user);
  if (!p) return html(errorPage(404, { user }), 404);
  const pub = poolPublic(p);
  const isCreator = p.created_by === user.id || isAdmin(user);
  if (isCreator) pub.password = p.join_password;
  let board = null, results = null;
  if (p.settled_at && pub.state !== 'cancelled') {
    const rows = (await env.DB.prepare(`SELECT pe.user_id, pe.final_rank AS r, u.username AS n, u.rank_level AS k, pe.taps AS s, u.tier, u.tier_until, u.role, pe.side_choice AS side, pe.prize_kobo AS prize
      FROM pool_entries pe JOIN users u ON u.id=pe.user_id WHERE pe.pool_id=? AND pe.final_rank IS NOT NULL ORDER BY pe.taps DESC, pe.final_rank LIMIT 100`).bind(p.id).all()).results;
    results = rows.map((r, i) => ({ r: p.vs_split ? r.r : i + 1, n: r.n, k: r.k, s: r.s, t: tierOf(r), side: r.side, prize: r.prize, me: r.user_id === user.id }));
    const teams = {};
    if (p.side_a) for (const r of (await env.DB.prepare('SELECT side_choice, SUM(taps) t FROM pool_entries WHERE pool_id=? GROUP BY side_choice').bind(p.id).all()).results) if (r.side_choice) teams[r.side_choice] = r.t;
    board = { top: results, me: p.joined ? { rank: p.final_rank, score: p.my_taps } : null, teams };
  } else if (pub.state !== 'cancelled') {
    try { board = (await roomCall(env, p.id, `/board?uid=${encodeURIComponent(user.id)}&n=20`)).data; } catch { board = null; }
  }
  const jb = user.role === 'USER' ? joinBlock(p, user) : { why: 'Only player accounts can join pools.' };
  const myBoosters = user.role === 'USER' ? Number((await env.DB.prepare("SELECT COALESCE(SUM(i.quantity),0) n FROM inventory i JOIN store_items s ON s.id=i.item_id WHERE i.user_id=? AND s.kind='BOOSTER'").bind(user.id).first())?.n || 0) : 0;
  const entries = isCreator ? (await env.DB.prepare('SELECT u.username, u.rank_level, pe.joined_at, pe.paid_kobo, pe.side_choice FROM pool_entries pe JOIN users u ON u.id=pe.user_id WHERE pe.pool_id=? ORDER BY pe.joined_at DESC LIMIT 200').bind(p.id).all()).results : null;
  const votes = pub.pauseMode === 'VOTE' ? { ...(await voteCounts(env, p.id)), mine: (await env.DB.prepare('SELECT choice FROM pool_votes WHERE pool_id=? AND user_id=?').bind(p.id, user.id).first())?.choice || null } : null;
  return html(poolPage({ ...b, pool: pub, board, results, isCreator, joinBlock: jb, myBoosters, entries, origin, votes }));
}

async function playRoute(req, env, url, user, b) {
  if (user.role !== 'USER') return go(req, homeFor(user));
  const ids = [...new Set(String(url.searchParams.get('pools') || url.searchParams.get('pool') || '').split(',').map(s => s.trim()).filter(Boolean))].slice(0, 20);
  if (!ids.length) return go(req, '/pools?scope=mine');
  const pk = b.perk;
  const found = (await Promise.all(ids.map(id => getPool(env, id, user)))).filter(Boolean);
  let joined = found.filter(p => p.joined && p.status !== 'PAUSED' && p.status !== 'WAITING').slice(0, pk.pools);   // instant matches still filling wait on their pool page
  // Lapo-rules pools are played on their own (no one-tap-counts-in-many).
  if (joined.length > 1) { const normal = joined.filter(p => !p.lapo_rules); joined = normal.length ? normal : joined.slice(0, 1); }
  if (!joined.length) return go(req, found[0] ? `/pool/${found[0].id}` : '/pools');
  const pools = joined.map(p => { const x = poolPublic(p); return { id: x.id, name: x.name, state: x.state, startsAt: x.startsAt, endsAt: x.endsAt, boosters: x.boosters, sideA: x.sideA, sideB: x.sideB, side: p.side_choice || null, prize: x.prize, sponsor: x.sponsor, kind: x.kind, theme: x.theme, padPattern: x.padPattern, allowOwnPad: x.allowOwnPad, bg: x.bg, lapoRules: x.lapoRules, timeTopup: x.timeTopup }; });
  const prefs = parseJson(user.prefs, {});
  const [skinRow, items] = await env.DB.batch([
    env.DB.prepare("SELECT config FROM store_items WHERE id=? AND kind='SKIN'").bind(user.equipped_skin || 'skin-boy'),
    env.DB.prepare("SELECT s.*, COALESCE(i.quantity,0) AS quantity FROM store_items s LEFT JOIN inventory i ON i.item_id=s.id AND i.user_id=? WHERE s.kind='BOOSTER' AND s.active=1 ORDER BY s.sort").bind(user.id)]);
  // The boosters you own first; then 3 you don't have yet (ones you can buy right now before locked ones), at the bottom.
  const toB = x => { const lock = itemLock(x, user); return { id: x.id, name: x.name, mult: x.multiplier, dur: x.duration_seconds, qty: x.quantity, perGame: x.per_game_limit || 0, everybody: x.audience === 'ALL', color: parseJson(x.config, {}).color || '#2E8BFF', price: x.price_kobo, owned: x.quantity > 0, lock: lock ? { why: lock.why, need: lock.need } : null }; };
  const owned = items.results.filter(x => x.quantity > 0).map(toB);
  const extra = items.results.filter(x => x.quantity <= 0).map(toB).sort((a, c) => (!!a.lock - !!c.lock) || a.price - c.price).slice(0, 3);
  const boosters = [...owned, ...extra];
  const voice = { enabled: !!(env.CALLS_APP_ID && env.CALLS_APP_TOKEN) && b.s.voice_on !== '0', topN: num(b.s, 'voice_top_n', 3) };
  const me = { name: user.username, tier: b.tierKey, fingers: pk.fingers, rate: pk.rate, sound: soundFor(user, prefs), muted: !!prefs.muted, vibrate: prefs.vibrate !== false, calc: !!pk.calc, rank: user.rank_level || 1, emoji: user.emoji || null };
  return html(playPage({ user, pools, boosters, skin: parseJson(skinRow.results[0]?.config, { bg: '#2E8BFF', pattern: 'waves' }), prefs, voice, serverNow: nowIso(), me, paid: b.tierKey !== 'LAPO', theme: b.theme, bgCss: b.bgCss }));
}

// ── invite page (players and sponsors) ─────────────────────────────────────
async function inviteRoute(env, url, user) {
  if (user.role !== 'USER' && user.role !== 'SPONSOR') return Response.redirect(new URL(homeFor(user), url).href, 302);
  if (!user.referral_code) {   // older accounts and sponsors made before sponsors could invite
    for (let i = 0; i < 5 && !user.referral_code; i++) { const c = randomCode(6); const r = await env.DB.prepare('UPDATE users SET referral_code=? WHERE id=? AND referral_code IS NULL AND NOT EXISTS (SELECT 1 FROM users WHERE referral_code=?)').bind(c, user.id, c).run(); if (r.meta.changes) user.referral_code = c; }
  }
  // inner circle members also see what each person they brought has spent (never their wallet)
  const [b, joined] = await Promise.all([base(env, user), user.inner_circle ? icInvitees(env, user.id, { limit: 200 }).then(r => ({ results: r.filter(x => x.status === 'ACTIVE') }))
    : env.DB.prepare("SELECT username, created_at FROM users WHERE referred_by=? AND status='ACTIVE' ORDER BY created_at DESC LIMIT 50").bind(user.id).all()]);
  return html(invitePage({ ...b, origin: env.PUBLIC_URL || url.origin, joined: joined.results, inner: !!user.inner_circle, referralBatch: num(b.s, 'referral_batch', 10) }));
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
      env.DB.prepare('SELECT a.*, p.name AS pool_name, (SELECT COUNT(*) FROM leads l WHERE l.promo_id=a.id) AS leads, (SELECT COUNT(*) FROM pools x WHERE x.promo_id=a.id AND x.ends_at>strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\')) AS in_pools FROM promos a LEFT JOIN pools p ON p.id=a.pool_id WHERE a.owner_id=? ORDER BY a.created_at DESC').bind(user.id),
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
      (SELECT COALESCE(SUM(n),0) FROM metrics WHERE key='taps' AND day=?) tapsToday,
      (SELECT COALESCE(SUM(amount_kobo),0) FROM pool_time_buys) timeBought,
      (SELECT COALESCE(SUM(amount_kobo),0) FROM pool_time_buys WHERE created_at>=?) timeBoughtToday,
      (SELECT COALESCE(SUM(amount_kobo),0) FROM payments WHERE status='SUCCESS' AND datetime(COALESCE(verified_at,created_at))>=datetime(?)) paidToday,
      (SELECT COALESCE(SUM(amount_kobo),0) FROM payments WHERE status='SUCCESS') paidAll`).bind(now, now, now, now, lagosDay(), new Date(Date.parse(lagosDay() + 'T00:00:00Z') - 3600000).toISOString().replace('T', ' ').slice(0, 19), new Date(Date.parse(lagosDay() + 'T00:00:00Z') - 3600000).toISOString()).first();
    const audit = (await env.DB.prepare('SELECT action,detail,created_at FROM audit_logs ORDER BY created_at DESC LIMIT 15').all()).results;
    const errors24 = Number((await env.DB.prepare('SELECT COUNT(*) n FROM error_log WHERE created_at>?').bind(new Date(Date.now() - 86400000).toISOString()).first())?.n || 0);
    return html(adminHome({ ...b, stats: s, settings: await settings(env), audit, errors24 }));
  }
  if (path === '/admin/errors') {
    const pg = pageNum(q);
    const [rows, c] = await env.DB.batch([
      env.DB.prepare('SELECT * FROM error_log ORDER BY created_at DESC LIMIT 51 OFFSET ?').bind((pg - 1) * 50),
      env.DB.prepare('SELECT (SELECT COUNT(*) FROM error_log WHERE created_at>?) day, (SELECT COUNT(*) FROM error_log WHERE created_at>?) week').bind(new Date(Date.now() - 86400000).toISOString(), new Date(Date.now() - 7 * 86400000).toISOString())]);
    return html(adminErrors({ ...b, rows: rows.results.slice(0, 50), page: pg, hasNext: rows.results.length > 50, counts: c.results[0] }));
  }
  if (path === '/admin/messages') {
    const [recent, pools, jobs] = await env.DB.batch([
      env.DB.prepare('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 20'),
      env.DB.prepare("SELECT id,name,sponsor_name FROM pools WHERE settled_at IS NULL AND status!='CANCELLED' AND ends_at>? AND is_private=0 ORDER BY starts_at LIMIT 100").bind(nowIso()),
      env.DB.prepare(`SELECT 'Announcement: ' || a.title AS what, j.status, j.sent, j.created_at FROM email_jobs j JOIN announcements a ON a.id=j.ref_id
        UNION ALL SELECT 'Pool: ' || p.name, b.status, b.sent, b.created_at FROM email_blasts b JOIN pools p ON p.id=b.pool_id ORDER BY 4 DESC LIMIT 15`)]);
    return html(adminMessages({ ...b, recent: recent.results, pools: pools.results, jobs: jobs.results, emailOn: emailConfigured(env) }));
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
    // server load: sampled requests per hour (last 24 h), a live database round trip, people online now
    const hrs = (await env.DB.prepare("SELECT key,day,n FROM metrics WHERE key IN ('req_n','req_ms','req_slow','req_5xx') AND day>=?").bind('H' + new Date(Date.now() - 24 * 3600000).toISOString().slice(0, 13)).all()).results;
    const byHour = {}; for (const r of hrs) (byHour[r.day] = byHour[r.day] || { hour: r.day.slice(1) })[r.key] = Number(r.n);
    const pings = []; for (let i = 0; i < 3; i++) { const t = Date.now(); await env.DB.prepare('SELECT 1').first(); pings.push(Date.now() - t); }
    const online = (await siteStats(env)).online;
    const load = { hours: Object.values(byHour).sort((x, y) => x.hour < y.hour ? -1 : 1), dbMs: Math.round(pings.sort((x, y) => x - y)[1]), online };
    return html(adminHealth({ ...b, load, checks, dbBytes, metrics: Object.values(byDay), alerts: alerts.results, settings: await settings(env), usage: [['Users', c.users], ['Pools', c.pools], ['Pool entries', c.entries], ['Money records', c.tx], ['Notifications', c.notes], ['Top-tapper rows', c.stats]] }));
  }
  if (path === '/admin/users') {
    const term = String(q.get('q') || '').trim().slice(0, 60), pg = pageNum(q);
    const users = (await env.DB.prepare(`SELECT u.*, w.balance_kobo, w.winnings_kobo FROM users u LEFT JOIN wallets w ON w.user_id=u.id WHERE (?='' OR u.username LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\') ORDER BY u.created_at DESC LIMIT 51 OFFSET ?`).bind(term, `%${likeEsc(term)}%`, `%${likeEsc(term)}%`, (pg - 1) * 50).all()).results;
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
      env.DB.prepare('SELECT a.*, COALESCE(sp.company,u.username) AS owner, u.role AS owner_role, (SELECT COUNT(*) FROM pools x WHERE x.promo_id=a.id AND x.ends_at>strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\')) AS in_pools, p.name AS pool_name, (SELECT COUNT(*) FROM leads l WHERE l.promo_id=a.id) AS leads FROM promos a LEFT JOIN users u ON u.id=a.owner_id LEFT JOIN sponsor_profiles sp ON sp.user_id=a.owner_id LEFT JOIN pools p ON p.id=a.pool_id ORDER BY a.approved, a.created_at DESC LIMIT 200'),
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
    return html(adminWithdrawals({ ...b, rows, paystack: gateway(env) ? (gateway(env) === 'bachs' ? 'Bachs' : 'Paystack') : null, auto: s.auto_payouts === '1' }));
  }
  if (path === '/admin/merch') {
    const items = (await env.DB.prepare('SELECT m.*, (SELECT COUNT(*) FROM merch_interest i WHERE i.item=m.id) AS interested FROM merch m ORDER BY m.sort, m.created_at DESC LIMIT 200').all()).results;
    return html(adminMerch({ ...b, items, edit: items.find(i => i.id === q.get('edit')) || null }));
  }
  if (path === '/admin/ad-requests') {
    const rows = (await env.DB.prepare(`SELECT r.*, u.username, u.role, u.email FROM ad_requests r JOIN users u ON u.id=r.user_id
      ORDER BY CASE r.status WHEN 'PENDING' THEN 0 WHEN 'LIVE' THEN 1 ELSE 2 END, r.created_at DESC LIMIT 200`).all()).results;
    return html(adminAdRequests({ ...b, rows, prices: slidePrices(await settings(env)) }));
  }
  if (path === '/admin/inner-circle') {
    const list = await icMembers(env);
    const open = q.get('m') ? await env.DB.prepare('SELECT id, username FROM users WHERE id=? AND inner_circle=1').bind(q.get('m')).first() : null;
    const s = await settings(env);
    return html(adminInnerCircle({ ...b, list, open, invitees: open ? await icInvitees(env, open.id, { withWallet: true, limit: 500 }) : [], rules: rulesText(s), isDefault: !String(s.inner_circle_rules || '').trim(), origin: env.PUBLIC_URL || new URL(req.url).origin }));
  }
  if (path === '/admin/money') {
    const period = ['DAY', 'WEEK', 'MONTH', 'YEAR', 'ALL'].includes(q.get('p')) ? q.get('p') : 'DAY';
    const start = periodStart(period);
    const since = start === '0000' ? '1970-01-01' : start;
    const PAID = "status='SUCCESS' AND datetime(COALESCE(verified_at,created_at))>=datetime(?)";
    const [pin, pby, pdays, precent] = await env.DB.batch([
      env.DB.prepare(`SELECT COALESCE(SUM(amount_kobo),0) total, COUNT(*) n, COUNT(DISTINCT user_id) payers FROM payments WHERE ${PAID}`).bind(since),
      env.DB.prepare(`SELECT purpose, COALESCE(SUM(amount_kobo),0) total, COUNT(*) n FROM payments WHERE ${PAID} GROUP BY purpose ORDER BY total DESC`).bind(since),
      env.DB.prepare(`SELECT date(datetime(COALESCE(verified_at,created_at),'+1 hour')) d, COALESCE(SUM(amount_kobo),0) total, COUNT(*) n FROM payments WHERE status='SUCCESS' AND datetime(COALESCE(verified_at,created_at))>=datetime('now','-14 days') GROUP BY d ORDER BY d DESC`),
      env.DB.prepare(`SELECT p.reference, p.purpose, p.amount_kobo, p.provider, COALESCE(p.verified_at,p.created_at) at, u.id uid, u.username FROM payments p LEFT JOIN users u ON u.id=p.user_id WHERE p.status='SUCCESS' ORDER BY datetime(COALESCE(p.verified_at,p.created_at)) DESC LIMIT 50`)]);
    const [winners, funded] = await Promise.all([
      topWinners(env, period, { limit: 50 }),
      env.DB.prepare(`SELECT u.id, u.username, u.role, SUM(t.amount_kobo) AS funded, COUNT(*) AS times FROM wallet_transactions t JOIN users u ON u.id=t.user_id WHERE t.type='FUND' AND t.amount_kobo>0 AND datetime(t.created_at)>=datetime(?) GROUP BY u.id ORDER BY funded DESC LIMIT 50`).bind(start === '0000' ? '1970-01-01' : start).all()]);
    return html(adminMoney({ ...b, period, winners: winners.slice(0, 50), funded: funded.results, paystack: { ...pin.results[0], by: pby.results, days: pdays.results, recent: precent.results } }));
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
