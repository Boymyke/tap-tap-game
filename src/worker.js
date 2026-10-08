// Tap Am worker: routes pages and APIs, settles ended pools on a schedule.
import { authPage } from './ui/auth.js';
import { legalPage, LEGAL_PATHS } from './ui/legal.js';
import { landingPage, demoPools } from './ui/landing.js';
import { howToPlayPage, rulesPage, merchPage, faqPage, aboutPage, offlinePage, errorPage } from './ui/pages.js';
import { dashboardPage, poolsPage, poolPage, storePage, bagPage, walletPage, nepoPage, mePage, createPoolPage, calcPage, notificationsPage, leaderboardPage } from './ui/player.js';
import { playPage } from './ui/game.js';
import { sponsorHome, sponsorPools, sponsorAds } from './ui/sponsor.js';
import { adminHome, adminUsers, adminUser, adminPools, adminStore, adminRanks, adminAds, adminWithdrawals, adminSuggestions, setupPage, suggestPage } from './ui/admin.js';
import { emailProblem } from './auth-rules.js';
import { handleAuthApi } from './auth-api.js';
import { handlePlayApi } from './api/play.js';
import { handleMoneyApi, payCallback, paystackOn, testPayments, BANKS } from './api/money.js';
import { handleAdminApi } from './api/admin.js';
import { handleSponsorApi, serveMedia, promoClick } from './api/sponsor.js';
import { handleVoiceApi } from './api/voice.js';
import { json, html, uid, nowIso, sessionCookie, hashPassword, currentUser, createSession, destroySession, sameOrigin, readJson, allow, clientIp, safeEqual } from './lib.js';
import { isNepo, isAdmin, tierLabel, getWallet, settings, num, parseJson, itemBlocked, ensureWallet, randomCode } from './core.js';
import { allRanks, rankInfo } from './game/ranks.js';
import { listPools, getPool, poolPublic, poolState, roomCall, joinBlocked } from './game/pools.js';

export { GameRoom } from './game/room.js';

// ── small helpers ───────────────────────────────────────────────────────────
const go = (req, path, status = 302) => Response.redirect(new URL(path, req.url), status);
const homeFor = u => (u?.role === 'ADMIN' ? '/admin' : u?.role === 'SPONSOR' ? '/sponsor' : '/dashboard');
const loginFirst = (req, url) => go(req, '/login?next=' + encodeURIComponent(url.pathname + url.search));
const unreadCount = async (env, u) => Number((await env.DB.prepare('SELECT COUNT(*) n FROM notifications WHERE user_id=? AND read=0').bind(u.id).first())?.n || 0);
const payMode = env => (paystackOn(env) ? 'paystack' : testPayments(env) ? 'test' : 'off');
const asResponse = (x, status = 200) => (x instanceof Response ? x : html(x, status));

async function base(env, user) {
  const [wallet, unread] = await Promise.all([getWallet(env, user.id), unreadCount(env, user)]);
  return { user, wallet, unread, nepo: isNepo(user), tier: tierLabel(user) };
}

// ── landing data ────────────────────────────────────────────────────────────
async function siteStats(env) {
  const since = new Date(Date.now() - 120000).toISOString();
  const r = await env.DB.prepare('SELECT (SELECT COUNT(*) FROM visitors WHERE last_seen>?) AS online,(SELECT COUNT(*) FROM visitors) AS visits').bind(since).first();
  return { online: Math.max(1, Number(r?.online || 0)), visits: Number(r?.visits || 0) };
}
async function featuredPools(env, user) {
  const s = await settings(env);
  const href = user ? homeFor(user) : '/signup';
  const real = (await env.DB.prepare(`SELECT p.*, (SELECT COUNT(*) FROM pool_entries x WHERE x.pool_id=p.id) AS players FROM pools p
    WHERE p.ends_at>? AND p.status!='CANCELLED' AND p.is_private=0 ORDER BY CASE p.kind WHEN 'SPONSORED' THEN 0 WHEN 'PAID' THEN 1 ELSE 2 END, p.starts_at ASC LIMIT 6`).bind(nowIso()).all()).results;
  const colors = ['green', 'orange', 'gold', 'mustard'];
  const mapped = real.map((p, i) => ({
    name: p.name, sponsor: p.sponsor_name, players: p.players, endsAt: p.ends_at, prize: Math.round(p.prize_kobo / 100),
    vs: p.game_type === 'MATCH' && p.side_a ? [p.side_a.slice(0, 3).toUpperCase(), p.side_b.slice(0, 3).toUpperCase()] : null,
    tier: p.audience === 'NEPO' ? 'Nepo only' : p.audience === 'LAPO' ? 'Lapo only' : '', color: p.kind === 'SPONSORED' ? 'orange' : p.kind === 'PAID' ? 'gold' : colors[i % 4],
    href: user ? `/pool/${p.id}` : '/signup'
  }));
  if (s.landing_demo_pools === '0') return mapped.length ? mapped : demoPools().map(p => ({ ...p, href }));
  return [...mapped, ...demoPools().map(p => ({ ...p, href }))].slice(0, 6);
}

// ── site API: presence, merch, suggestions, logout, first admin ─────────────
async function handleSiteApi(req, env, path) {
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

// ── scheduled: settle pools whose room alarm didn't run, tidy up ────────────
async function sweep(env) {
  const cutoff = new Date(Date.now() - 20000).toISOString();
  const due = (await env.DB.prepare("SELECT id FROM pools WHERE settled_at IS NULL AND status!='CANCELLED' AND ends_at<? LIMIT 25").bind(cutoff).all()).results;
  for (const p of due) { try { await roomCall(env, p.id, '/settle', { id: p.id }); } catch (e) { console.error('sweep settle', p.id, e?.message); } }
  const now = nowIso();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM auth_throttle WHERE reset_at<?').bind(now),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(now),
    env.DB.prepare('DELETE FROM voice_sessions WHERE updated_at<?').bind(new Date(Date.now() - 120000).toISOString()),
    env.DB.prepare('DELETE FROM email_codes WHERE expires_at<?').bind(new Date(Date.now() - 86400000).toISOString())
  ]);
  // Nepo ending in ~3 days: remind once
  const soon = (await env.DB.prepare("SELECT id,nepo_until FROM users WHERE tier='NEPO' AND nepo_until BETWEEN ? AND ? AND id NOT IN (SELECT user_id FROM notifications WHERE text LIKE 'Your Nepo ends%' AND created_at>?)")
    .bind(new Date(Date.now() + 2 * 86400000).toISOString(), new Date(Date.now() + 3 * 86400000).toISOString(), new Date(Date.now() - 5 * 86400000).toISOString()).all()).results;
  for (const u of soon) await env.DB.prepare('INSERT INTO notifications(id,user_id,text,link) VALUES(?,?,?,?)').bind(uid(), u.id, `Your Nepo ends on ${u.nepo_until.slice(0, 10)}. Renew to keep your perks.`, '/nepo').run();
  return due.length;
}

// ── entry ───────────────────────────────────────────────────────────────────
export default {
  async fetch(req, env) {
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
      if (new URL(req.url).pathname.startsWith('/api/')) return json({ error: 'Server wahala. Try again.', requestId }, 500);
      return html(errorPage(500, { user, ref: requestId.slice(0, 8) }), 500);
    }
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(sweep(env)); }
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
    case '/rules': return html(rulesPage(user));
    case '/merch': return html(merchPage(user));
    case '/faq': return html(faqPage(user));
    case '/about': return html(aboutPage(user));
    case '/offline': return html(offlinePage());
    case '/policy': return go(req, '/rules', 301);
    case '/suggest': return html(suggestPage(user));
    case '/admin/setup': if (isAdmin(user)) return go(req, '/admin'); return html(setupPage());
    case '/pay/callback': return go(req, await payCallback(req, env));
  }
  const goM = path.match(/^\/go\/([0-9a-f-]{36})$/);
  if (goM) { const t = await promoClick(env, goM[1]); return t ? Response.redirect(t, 302) : go(req, '/'); }
  const resM = path.match(/^\/results\/([^/]+)$/);
  if (resM) return go(req, `/pool/${resM[1]}`);
  if (LEGAL_PATHS.includes(path.slice(1))) return html(legalPage(path.slice(1), user));

  const APP = /^\/(dashboard|pools|pool|play|store|bag|wallet|nepo|me|calc|notifications|leaderboard|sponsor|admin)(\/|$)/;
  if (!APP.test(path)) return html(errorPage(404, { user }), 404);
  if (!user) return loginFirst(req, url);

  if (path.startsWith('/admin')) return isAdmin(user) ? adminRoute(req, env, url, path, user) : html(errorPage(404, { user }), 404);
  if (path.startsWith('/sponsor')) return user.role === 'SPONSOR' ? sponsorRoute(req, env, url, path, user) : go(req, homeFor(user));

  const b = await base(env, user);
  const origin = url.origin;
  switch (path) {
    case '/dashboard': {
      if (user.role !== 'USER') return go(req, homeFor(user));
      if (!user.referral_code) {   // accounts made before referrals existed
        for (let i = 0; i < 5 && !user.referral_code; i++) { const c = randomCode(6); const r = await env.DB.prepare('UPDATE users SET referral_code=? WHERE id=? AND referral_code IS NULL AND NOT EXISTS (SELECT 1 FROM users WHERE referral_code=?)').bind(c, user.id, c).run(); if (r.meta.changes) user.referral_code = c; }
      }
      const [ranks, open, mine, notes] = await Promise.all([allRanks(env), listPools(env, user, { scope: 'open', limit: 6 }), listPools(env, user, { scope: 'mine', limit: 12 }), env.DB.prepare('SELECT text,link,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 4').bind(user.id).all()]);
      return html(dashboardPage({ ...b, rank: rankInfo(ranks, user), live: open.map(poolPublic), mine: mine.map(poolPublic).filter(p => p.state !== 'ended' && p.state !== 'cancelled'), notes: notes.results, origin }));
    }
    case '/pools': {
      const scope = ['open', 'mine', 'created', 'recent'].includes(q.get('scope')) ? q.get('scope') : 'open';
      return html(poolsPage({ ...b, scope, pools: (await listPools(env, user, { scope })).map(poolPublic), canCreate: b.nepo || user.role !== 'USER' }));
    }
    case '/pools/new':
      if (user.role === 'USER' && !b.nepo) return go(req, '/nepo');
      return html(createPoolPage({ ...b, role: user.role }));
    case '/play': return playRoute(req, env, url, user, b);
    case '/store': {
      const tab = ['BOOSTER', 'SKIN', 'SHAPE'].includes(q.get('tab')) ? q.get('tab') : 'BOOSTER';
      const prefs = parseJson(user.prefs, {});
      const items = (await env.DB.prepare('SELECT s.*, COALESCE(i.quantity,0) AS owned FROM store_items s LEFT JOIN inventory i ON i.item_id=s.id AND i.user_id=? WHERE s.active=1 ORDER BY s.sort, s.price_kobo').bind(user.id).all()).results
        .map(i => ({ ...i, blocked: itemBlocked(i, user), equipped: i.kind === 'SKIN' ? user.equipped_skin === i.id : i.kind === 'SHAPE' ? (prefs.shape || 'rect') === parseJson(i.config, {}).shape : false }));
      return html(storePage({ ...b, items, tab }));
    }
    case '/bag': {
      const prefs = parseJson(user.prefs, {});
      const inv = (await env.DB.prepare(`SELECT s.id AS item_id, s.name, s.kind, s.multiplier, s.duration_seconds, s.audience, s.config, COALESCE(i.quantity,0) AS quantity, s.price_kobo, s.min_rank
        FROM store_items s LEFT JOIN inventory i ON i.item_id=s.id AND i.user_id=? WHERE (i.quantity>0) OR (s.kind!='BOOSTER' AND s.price_kobo=0 AND s.active=1) ORDER BY s.sort`).bind(user.id).all()).results
        .filter(i => i.quantity > 0 || !itemBlocked(i, user))
        .map(i => ({ ...i, equipped: i.kind === 'SKIN' ? user.equipped_skin === i.item_id : i.kind === 'SHAPE' && (prefs.shape || 'rect') === parseJson(i.config, {}).shape }));
      return html(bagPage({ ...b, inv, prefs }));
    }
    case '/wallet': {
      const s = await settings(env);
      const [tx, wd] = await Promise.all([
        env.DB.prepare('SELECT type,amount_kobo,balance,note,created_at FROM wallet_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 40').bind(user.id).all(),
        env.DB.prepare('SELECT * FROM withdrawals WHERE user_id=? ORDER BY created_at DESC LIMIT 10').bind(user.id).all()]);
      const flash = q.get('paid') === '1' ? 'Payment received. Your wallet don update.' : q.get('paid') === '0' ? 'Payment no go through. No money was taken.' : '';
      return html(walletPage({ ...b, user: { ...user, isNepo: b.nepo }, tx: tx.results, withdrawals: wd.results, minWithdraw: b.nepo ? num(s, 'min_withdraw_nepo_kobo', 500000) : num(s, 'min_withdraw_lapo_kobo', 1000000), banks: BANKS, payMode: payMode(env), flash }));
    }
    case '/nepo': {
      if (user.role !== 'USER') return go(req, homeFor(user));
      const s = await settings(env);
      return html(nepoPage({ ...b, until: user.nepo_until, monthly: num(s, 'nepo_monthly_kobo', 1300000), yearly: num(s, 'nepo_yearly_kobo', 12000000), payMode: payMode(env) }));
    }
    case '/me': {
      if (user.role !== 'USER') return go(req, homeFor(user));
      const s = await settings(env);
      return html(mePage({ ...b, rank: rankInfo(await allRanks(env), user), prefs: parseJson(user.prefs, {}), until: user.nepo_until, voiceRank: num(s, 'voice_min_rank', 56) }));
    }
    case '/calc': if (!b.nepo) return go(req, '/nepo'); return html(calcPage(b));
    case '/notifications': {
      const notes = (await env.DB.prepare('SELECT text,link,read,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 60').bind(user.id).all()).results;
      return html(notificationsPage({ ...b, notes }));
    }
    case '/leaderboard': {
      const ranks = await allRanks(env);
      const rows = (await env.DB.prepare("SELECT id,username,tier,nepo_until,role,rank_level,lifetime_taps,games_played,wins FROM users WHERE role='USER' AND status='ACTIVE' ORDER BY rank_level DESC, lifetime_taps DESC LIMIT 50").all()).results
        .map(r => ({ ...r, nepo: isNepo(r), rank_name: ranks.find(x => x.level === r.rank_level)?.name || '' }));
      return html(leaderboardPage({ ...b, rows }));
    }
  }

  const pm = path.match(/^\/pool\/([^/]+)$/);
  if (pm) return poolRoute(req, env, pm[1], user, b, origin);
  return html(errorPage(404, { user }), 404);
}

async function poolRoute(req, env, id, user, b, origin) {
  const p = await getPool(env, id, user);
  if (!p) return html(errorPage(404, { user }), 404);
  const pub = poolPublic(p);
  const isCreator = p.created_by === user.id || isAdmin(user);
  pub.boosterUsed = !!p.booster_item;
  if (isCreator) pub.password = p.join_password;
  let board = null, results = null;
  if (p.settled_at && pub.state !== 'cancelled') {
    const rows = (await env.DB.prepare(`SELECT pe.user_id, pe.final_rank AS r, u.username AS n, pe.taps AS s, u.tier, u.nepo_until, u.role, pe.side_choice AS side, pe.prize_kobo AS prize
      FROM pool_entries pe JOIN users u ON u.id=pe.user_id WHERE pe.pool_id=? AND pe.final_rank IS NOT NULL ORDER BY pe.final_rank LIMIT 50`).bind(p.id).all()).results;
    results = rows.map(r => ({ r: r.r, n: r.n, s: r.s, t: isNepo(r) ? 'NEPO' : 'LAPO', side: r.side, prize: r.prize, me: r.user_id === user.id }));
    const mine = p.joined ? { rank: p.final_rank, score: p.my_taps } : null;
    const teams = {};
    if (p.side_a) for (const r of (await env.DB.prepare('SELECT side_choice, SUM(taps) t FROM pool_entries WHERE pool_id=? GROUP BY side_choice').bind(p.id).all()).results) if (r.side_choice) teams[r.side_choice] = r.t;
    board = { top: results, me: mine, teams };
  } else if (pub.state !== 'cancelled') {
    try { board = (await roomCall(env, p.id, `/board?uid=${encodeURIComponent(user.id)}&n=20`)).data; } catch { board = null; }
  }
  const why = user.role === 'USER' ? joinBlocked(p, user) : 'Only player accounts can join pools.';
  const myBoosters = Number((await env.DB.prepare("SELECT COALESCE(SUM(i.quantity),0) n FROM inventory i JOIN store_items s ON s.id=i.item_id WHERE i.user_id=? AND s.kind='BOOSTER'").bind(user.id).first())?.n || 0);
  const entries = isCreator ? (await env.DB.prepare('SELECT u.username, pe.joined_at, pe.paid_kobo FROM pool_entries pe JOIN users u ON u.id=pe.user_id WHERE pe.pool_id=? ORDER BY pe.joined_at DESC LIMIT 200').bind(p.id).all()).results : null;
  return html(poolPage({ ...b, pool: pub, board, results, isCreator, canJoin: !why, joinWhy: why || '', myBoosters, entries, origin }));
}

async function playRoute(req, env, url, user, b) {
  if (user.role !== 'USER') return go(req, homeFor(user));
  const ids = [...new Set(String(url.searchParams.get('pools') || url.searchParams.get('pool') || '').split(',').map(s => s.trim()).filter(Boolean))].slice(0, 20);
  if (!ids.length) return go(req, '/pools?scope=mine');
  const s = await settings(env);
  const max = b.nepo ? num(s, 'max_multi_pools', 10) : 1;
  const found = (await Promise.all(ids.map(id => getPool(env, id, user)))).filter(Boolean);
  const joined = found.filter(p => p.joined).slice(0, max);
  if (!joined.length) return go(req, found[0] ? `/pool/${found[0].id}` : '/pools');
  const pools = joined.map(p => ({ ...poolPublic(p), boosterUsed: !!p.booster_item, mySide: p.side_choice }));
  const prefs = parseJson(user.prefs, {});
  const skinRow = await env.DB.prepare("SELECT config FROM store_items WHERE id=? AND kind='SKIN'").bind(user.equipped_skin || 'skin-boy').first();
  const boosters = (await env.DB.prepare("SELECT s.*, i.quantity FROM inventory i JOIN store_items s ON s.id=i.item_id WHERE i.user_id=? AND s.kind='BOOSTER' AND i.quantity>0 ORDER BY s.sort").bind(user.id).all()).results
    .map(x => ({ id: x.id, name: x.name, mult: x.multiplier, dur: x.duration_seconds, qty: x.quantity, blocked: itemBlocked(x, user) }));
  const voice = { enabled: !!(env.CALLS_APP_ID && env.CALLS_APP_TOKEN), topN: num(s, 'voice_top_n', 5), minRank: num(s, 'voice_min_rank', 56) };
  return html(playPage({ user, nepo: b.nepo, pools, boosters, skin: parseJson(skinRow?.config, { bg: '#1c5a33', art: 'boy' }), prefs: b.nepo ? prefs : { vibrate: prefs.vibrate, shape: prefs.shape }, voice, serverNow: nowIso() }));
}

// ── sponsor ─────────────────────────────────────────────────────────────────
async function sponsorRoute(req, env, url, path, user) {
  const b = await base(env, user);
  const pools = (await env.DB.prepare('SELECT p.*, (SELECT COUNT(*) FROM pool_entries x WHERE x.pool_id=p.id) AS players FROM pools p WHERE p.created_by=? ORDER BY p.starts_at DESC LIMIT 100').bind(user.id).all()).results.map(poolPublic);
  if (path === '/sponsor') {
    const profile = await env.DB.prepare('SELECT * FROM sponsor_profiles WHERE user_id=?').bind(user.id).first();
    const ad = await env.DB.prepare('SELECT COALESCE(SUM(views),0) v, COALESCE(SUM(clicks),0) c FROM promos WHERE owner_id=?').bind(user.id).first();
    const stats = { pools: pools.length, players: pools.reduce((a, p) => a + Number(p.players || 0), 0), views: ad.v, clicks: ad.c };
    return html(sponsorHome({ ...b, profile, stats, pools: pools.filter(p => p.state === 'live' || p.state === 'soon') }));
  }
  if (path === '/sponsor/pools') return html(sponsorPools({ ...b, pools }));
  if (path === '/sponsor/ads') {
    const ads = (await env.DB.prepare('SELECT a.*, p.name AS pool_name FROM promos a LEFT JOIN pools p ON p.id=a.pool_id WHERE a.owner_id=? ORDER BY a.created_at DESC').bind(user.id).all()).results;
    return html(sponsorAds({ ...b, ads, pools: pools.filter(p => p.state !== 'ended' && p.state !== 'cancelled') }));
  }
  return html(errorPage(404, { user }), 404);
}

// ── admin ───────────────────────────────────────────────────────────────────
async function adminRoute(req, env, url, path, user) {
  const q = url.searchParams;
  const b = { user, unread: await unreadCount(env, user) };
  if (path === '/admin') {
    const now = nowIso();
    const s = await env.DB.prepare(`SELECT
      (SELECT COUNT(*) FROM users WHERE role='USER') players,
      (SELECT COUNT(*) FROM users WHERE role='USER' AND tier='NEPO' AND (nepo_until IS NULL OR nepo_until>?)) nepo,
      (SELECT COUNT(*) FROM users WHERE role='SPONSOR') sponsors,
      (SELECT COUNT(*) FROM pools WHERE starts_at<=? AND ends_at>? AND status!='CANCELLED') live,
      (SELECT COALESCE(SUM(balance_kobo),0) FROM wallets) wallets,
      (SELECT COALESCE(SUM(winnings_kobo),0) FROM wallets) winnings,
      (SELECT COUNT(*) FROM withdrawals WHERE status='PENDING') pendingW,
      (SELECT COUNT(*) FROM promos WHERE approved=0) pendingAds`).bind(now, now, now).first();
    const audit = (await env.DB.prepare('SELECT action,detail,created_at FROM audit_logs ORDER BY created_at DESC LIMIT 15').all()).results;
    return html(adminHome({ ...b, stats: s, settings: await settings(env), audit }));
  }
  if (path === '/admin/users') {
    const term = String(q.get('q') || '').trim().slice(0, 60);
    const users = (await env.DB.prepare(`SELECT u.*, w.balance_kobo, w.winnings_kobo FROM users u LEFT JOIN wallets w ON w.user_id=u.id WHERE (?='' OR u.username LIKE ? OR u.email LIKE ?) ORDER BY u.created_at DESC LIMIT 100`).bind(term, `%${term}%`, `%${term}%`).all()).results;
    return html(adminUsers({ ...b, users, q: term }));
  }
  const um = path.match(/^\/admin\/users\/([^/]+)$/);
  if (um) {
    const target = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(um[1]).first();
    if (!target) return html(errorPage(404, { user }), 404);
    const ranks = await allRanks(env);
    const [wallet, inv, items, entries] = await Promise.all([
      getWallet(env, target.id),
      env.DB.prepare('SELECT s.name, s.kind, i.quantity FROM inventory i JOIN store_items s ON s.id=i.item_id WHERE i.user_id=? AND i.quantity>0').bind(target.id).all(),
      env.DB.prepare("SELECT id,name,kind,audience FROM store_items WHERE kind IN ('BOOSTER','SKIN','SHAPE') ORDER BY kind, sort").all(),
      env.DB.prepare('SELECT pe.*, p.name FROM pool_entries pe JOIN pools p ON p.id=pe.pool_id WHERE pe.user_id=? ORDER BY pe.joined_at DESC LIMIT 30').bind(target.id).all()]);
    return html(adminUser({ ...b, target, wallet, inv: inv.results, items: items.results, entries: entries.results, rankName: ranks.find(r => r.level === target.rank_level)?.name || '' }));
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
    const items = (await env.DB.prepare('SELECT s.*, (SELECT COUNT(*) FROM inventory i WHERE i.item_id=s.id AND i.quantity>0) AS owners FROM store_items s ORDER BY s.kind, s.sort, s.created_at').all()).results;
    return html(adminStore({ ...b, items, edit: items.find(i => i.id === q.get('edit')) || null }));
  }
  if (path === '/admin/ranks') {
    const counts = Object.fromEntries((await env.DB.prepare("SELECT rank_level l, COUNT(*) n FROM users WHERE role='USER' GROUP BY rank_level").all()).results.map(r => [r.l, r.n]));
    const ranks = (await allRanks(env)).map(r => ({ ...r, players: counts[r.level] || 0 }));
    return html(adminRanks({ ...b, ranks, edit: ranks.find(r => String(r.level) === q.get('edit')) || null }));
  }
  if (path === '/admin/ads') {
    const ads = (await env.DB.prepare('SELECT a.*, u.username AS owner, p.name AS pool_name FROM promos a LEFT JOIN users u ON u.id=a.owner_id LEFT JOIN pools p ON p.id=a.pool_id ORDER BY a.approved, a.created_at DESC LIMIT 200').all()).results;
    const pools = (await env.DB.prepare("SELECT id,name FROM pools WHERE ends_at>? AND status!='CANCELLED' ORDER BY starts_at LIMIT 100").bind(nowIso()).all()).results;
    return html(adminAds({ ...b, ads, pools }));
  }
  if (path === '/admin/withdrawals') {
    const rows = (await env.DB.prepare('SELECT w.*, u.username FROM withdrawals w JOIN users u ON u.id=w.user_id ORDER BY CASE w.status WHEN \'PENDING\' THEN 0 WHEN \'PROCESSING\' THEN 1 ELSE 2 END, w.created_at DESC LIMIT 200').all()).results;
    return html(adminWithdrawals({ ...b, rows, paystack: paystackOn(env) }));
  }
  if (path === '/admin/suggestions') {
    const rows = (await env.DB.prepare('SELECT * FROM suggestions ORDER BY created_at DESC LIMIT 100').all()).results;
    return html(adminSuggestions({ ...b, rows }));
  }
  return html(errorPage(404, { user }), 404);
}
