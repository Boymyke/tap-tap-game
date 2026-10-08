// Shared server helpers: responses, security headers, sessions, hashing, rate limits.

export const COOKIE = 'nakam_session';
export const SESSION_DAYS = 14;
export const LEGACY_PBKDF2_ITERATIONS = 10000;   // hashes created before 8 Oct 2026
export const PBKDF2_ITERATIONS = 100000;         // Workers' PBKDF2 maximum
export const MAX_BODY_BYTES = 10_000;

export const uid = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();
export const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const BASE_HEADERS = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
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
      "img-src 'self' data: https:",
      "connect-src 'self'",
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

// Constant-time comparison of two equal-format strings.
export function safeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function currentUser(req, env) {
  const sid = getCookie(req, COOKIE);
  if (!sid || !/^[0-9a-f-]{36}$/.test(sid)) return null;
  const row = await env.DB.prepare('SELECT u.id,u.username,u.email,u.role,u.tier,u.lifetime_taps,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=?').bind(sid).first();
  if (!row) return null;
  if (Date.parse(row.expires_at) <= Date.now()) { await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(sid).run(); return null; }
  return row;
}

export async function createSession(userId, env) {
  const sid = uid();
  const exp = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await env.DB.prepare('INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)').bind(sid, userId, exp).run();
  return sid;
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
export async function allow(env, key, limit, windowSeconds) {
  const now = Date.now();
  const row = await env.DB.prepare('SELECT count,reset_at FROM auth_throttle WHERE key=?').bind(key).first();
  if (!row || Date.parse(row.reset_at) <= now) {
    await env.DB.prepare('INSERT INTO auth_throttle(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=1,reset_at=excluded.reset_at')
      .bind(key, new Date(now + windowSeconds * 1000).toISOString()).run();
    return true;
  }
  if (row.count >= limit) return false;
  await env.DB.prepare('UPDATE auth_throttle SET count=count+1 WHERE key=?').bind(key).run();
  return true;
}
export const clearLimit = (env, key) => env.DB.prepare('DELETE FROM auth_throttle WHERE key=?').bind(key).run();
