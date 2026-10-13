// Shared server helpers: responses, security headers, sessions, hashing, rate limits.

export const COOKIE = 'nakam_session';
export const SESSION_DAYS = 30;              // sliding: renewed when used
export const LEGACY_PBKDF2_ITERATIONS = 10000;   // hashes created before 8 Oct 2026
export const PBKDF2_ITERATIONS = 100000;         // Workers' PBKDF2 maximum
export const MAX_BODY_BYTES = 10_000;

export const uid = () => crypto.randomUUID();
// Escapes LIKE wildcards so a search for "mike_" matches the underscore itself (use with ESCAPE '\\').
export const likeEsc = t => String(t).replace(/[\\%_]/g, c => '\\' + c);
export const nowIso = () => new Date().toISOString();
export const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const BASE_HEADERS = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  // microphone: live voice in games (Nepo). autoplay: sponsor YouTube ads start by themselves (muted).
  'permissions-policy': 'camera=(), microphone=(self), geolocation=(), payment=(), autoplay=(self "https://www.youtube-nocookie.com")',
  'strict-transport-security': 'max-age=31536000; includeSubDomains'
};

export const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', ...BASE_HEADERS, ...headers }
});

// Themed pages put "__NONCE__" on their <script> tags. When present we swap in a fresh
// nonce and send a strict Content-Security-Policy that only allows those scripts.
export function html(body, status = 200, headers = {}) {
  const h = { 'content-type': 'text/html; charset=utf-8', ...BASE_HEADERS, ...headers };
  if (body.includes('__NONCE__')) {
    const nonce = uid().replace(/-/g, '');
    body = body.replaceAll('__NONCE__', nonce);
    h['content-security-policy'] = [
      "default-src 'self'",
      `script-src 'nonce-${nonce}'`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self'",
      "worker-src 'self'",
      "manifest-src 'self'",
      "frame-src https://www.youtube-nocookie.com",
      "frame-ancestors 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "object-src 'none'"
    ].join('; ');
  }
  return new Response(body, { status, headers: h });
}

export function sessionCookie(value, maxAge = 60 * 60 * 24 * SESSION_DAYS) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
export function getCookie(req, name) {
  for (const part of (req.headers.get('cookie') || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

export const hex = bytes => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
export function unhex(s) {
  if (!s || s.length % 2) return new Uint8Array();
  const a = new Uint8Array(s.length / 2);
  for (let i = 0; i < a.length; i++) a[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return a;
}

export async function hashPassword(password, saltHex, iterations = PBKDF2_ITERATIONS) {
  const salt = saltHex ? unhex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
  return { hash: hex(new Uint8Array(bits)), salt: hex(salt), iterations };
}

export async function sha256Hex(text) {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))));
}

// A server secret: the Worker secret when it is set, otherwise a long random value made once and kept in
// the database (settings key "_secret_<name>", never shown on any page). Lets the site run safely before
// the owner has added every secret in the Cloudflare dashboard.
const secretCache = {};
export async function appSecret(env, name) {
  if (env[name]) return env[name];
  if (secretCache[name]) return secretCache[name];
  const key = '_secret_' + name;
  await env.DB.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)').bind(key, hex(crypto.getRandomValues(new Uint8Array(32)))).run();
  const v = (await env.DB.prepare('SELECT value FROM settings WHERE key=?').bind(key).first())?.value;
  if (v) secretCache[name] = v;
  return v;
}

// Constant-time comparison of two equal-format strings.
export function safeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

// Sessions: the cookie holds a random 256-bit token; the database only stores its SHA-256,
// so a leaked database can't be used to log in. Sessions slide: each day of use extends them.
const tokenOk = t => typeof t === 'string' && /^[0-9a-f]{64}$/.test(t);
const DAY = 86400000;

// One query gives the page shell everything it needs: the user, their wallet and unread count.
export async function currentUser(req, env) {
  const token = getCookie(req, COOKIE);
  if (!tokenOk(token)) return null;
  const id = await sha256Hex(token);
  const row = await env.DB.prepare(`SELECT u.id,u.username,u.email,u.role,u.tier,u.tier_until,u.status,u.lifetime_taps,u.games_played,u.wins,u.rank_level,u.referral_code,u.referral_count,
      u.equipped_skin,u.prefs,u.gender,u.country,u.whatsapp,u.adult_confirmed_at,u.emoji,u.emoji_meaning,u.email_news,u.hide_profile,u.seed_set_at,u.last_free_box_at,u.created_at,s.expires_at,
      COALESCE(w.balance_kobo,0) AS w_balance, COALESCE(w.winnings_kobo,0) AS w_winnings,
      (SELECT COUNT(*) FROM notifications n WHERE n.user_id=u.id AND n.read=0) AS unread
    FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN wallets w ON w.user_id=u.id WHERE s.id=?`).bind(id).first();
  if (!row) return null;
  if (row.status && row.status !== 'ACTIVE') return null;
  const exp = Date.parse(row.expires_at);
  if (exp <= Date.now()) { await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(id).run(); return null; }
  if (exp - Date.now() < (SESSION_DAYS - 1) * DAY) {   // used on a new day: push expiry out again
    await env.DB.prepare('UPDATE sessions SET expires_at=? WHERE id=?').bind(new Date(Date.now() + SESSION_DAYS * DAY).toISOString(), id).run();
    row._renewCookie = sessionCookie(token);
  }
  row.wallet = { balance_kobo: row.w_balance, winnings_kobo: row.w_winnings };
  return row;
}

export async function createSession(userId, env) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  const exp = new Date(Date.now() + SESSION_DAYS * DAY).toISOString();
  await env.DB.prepare('INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)').bind(await sha256Hex(token), userId, exp).run();
  return token;
}

export async function destroySession(req, env) {
  const token = getCookie(req, COOKIE);
  if (tokenOk(token)) await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(await sha256Hex(token)).run();
}

export const clientIp = req => req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'unknown';

// Blocks cross-site POSTs: when the browser sends an Origin, it must be this site.
export function sameOrigin(req) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === new URL(req.url).host; } catch { return false; }
}

// Reads a small JSON body. Returns { data } or { response } with an error to send back.
export async function readJson(req, { requireJson = true } = {}) {
  if (!sameOrigin(req)) return { response: json({ error: 'Request blocked.' }, 403) };
  if (requireJson && !(req.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) {
    return { response: json({ error: 'Send JSON.' }, 415) };
  }
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return { response: json({ error: 'Request too large.' }, 413) };
  try {
    const data = text ? JSON.parse(text) : {};
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { response: json({ error: 'Bad request.' }, 400) };
    return { data };
  } catch { return { response: json({ error: 'Bad request.' }, 400) }; }
}

// Fixed-window rate limit stored in D1. Returns true when the action is allowed.
// One atomic statement, so many requests at the same moment (scripts, several tabs) can't slip past the limit.
export async function allow(env, key, limit, windowSeconds) {
  const now = new Date().toISOString();
  const row = await env.DB.prepare(`INSERT INTO auth_throttle(key,count,reset_at) VALUES(?1,1,?2)
    ON CONFLICT(key) DO UPDATE SET count = CASE WHEN auth_throttle.reset_at <= ?3 THEN 1 ELSE auth_throttle.count + 1 END,
      reset_at = CASE WHEN auth_throttle.reset_at <= ?3 THEN excluded.reset_at ELSE auth_throttle.reset_at END
    RETURNING count`).bind(key, new Date(Date.now() + windowSeconds * 1000).toISOString(), now).first();
  return Number(row?.count || 1) <= limit;
}
export const clearLimit = (env, key) => env.DB.prepare('DELETE FROM auth_throttle WHERE key=?').bind(key).run();

// Re-checks a signed-in player's password before money leaves their account (withdraw, send, convert,
// stake). Rate-limited so a stolen session can't guess it. Returns { ok } or { error, status }.
export async function passwordOk(env, userId, password) {
  password = String(password ?? '');
  if (!password) return { error: 'Enter your password to confirm it is you.', status: 400 };
  if (!await allow(env, 'pwcheck:' + userId, 10, 900)) return { error: 'Too many password tries. Wait 15 minutes.', status: 429 };
  const row = await env.DB.prepare('SELECT password_hash,password_salt,password_iter FROM users WHERE id=?').bind(userId).first();
  if (!row || password.length > 128) return { error: 'Wrong password.', status: 401 };
  const hp = await hashPassword(password, row.password_salt, row.password_iter || LEGACY_PBKDF2_ITERATIONS);
  return safeEqual(hp.hash, row.password_hash) ? { ok: true } : { error: 'Wrong password.', status: 401 };
}

// ── error log for the super admin: what happened, when, where, and what to do ──
const HINTS = [
  [/zeptomail|EMAIL_NOT_CONFIGURED|resend/i, 'Email could not be sent. Check that ZEPTOMAIL_TOKEN is set on the worker and that tapammm.live is verified in ZeptoMail (Mail Agents → Domains).'],
  [/paystack/i, 'Paystack refused or did not answer. Check PAYSTACK_SECRET_KEY on the worker and the Paystack dashboard (account status, IP whitelist off). Players were not charged unless Paystack confirmed it.'],
  [/D1_|SQLITE|database|no such (table|column)/i, 'The database refused a request. If it says "no such column/table", a database update (migration) is missing: apply the newest file in /migrations to this database.'],
  [/room|durable object|exceeded|overloaded|timeout|timed out/i, 'The game servers were too busy or slow. If it happens a lot, use "Server problem: pause all games" on the admin home, then restart when the Health page is green.'],
  [/realtime|calls/i, 'Live voice (Cloudflare Realtime) failed. Check CALLS_APP_ID and CALLS_APP_TOKEN, or switch voice off in Settings.']
];
export const errorHint = msg => (HINTS.find(([re]) => re.test(msg)) || [null, 'Not a known problem. If it keeps happening, send the details and the time to your developer.'])[1];
export async function logError(env, area, err, detail = {}) {
  try {
    const message = String(err?.message || err || 'Unknown error').slice(0, 500);
    await env.DB.prepare('INSERT INTO error_log(id,area,message,detail,hint,stack,created_at) VALUES(?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID(), String(area).slice(0, 60), message, JSON.stringify(detail).slice(0, 2000), errorHint(message + ' ' + area), String(err?.stack || '').slice(0, 2000), new Date().toISOString()).run();
  } catch (e) { console.error('logError failed', e?.message); }
}

// Small in-memory cache per worker instance for shared, slow-changing reads (landing stats, featured
// pools, top boards). Never used for anything personal or money-related.
const memoStore = new Map();
export async function memo(key, ttlMs, fn) {
  const hit = memoStore.get(key);
  if (hit && hit.until > Date.now()) return hit.value;
  const value = await fn();
  memoStore.set(key, { value, until: Date.now() + ttlMs });
  if (memoStore.size > 500) memoStore.delete(memoStore.keys().next().value);
  return value;
}
