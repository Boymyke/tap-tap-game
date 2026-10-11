// Bachs (bachs.io): card and bank-transfer payments (hosted checkout) and bank payouts.
// API: https://<api>/v1/..., "Authorization: Bearer <secret key>", amounts are decimal strings in naira ("1500.00").
// Keys starting sk_live_ use https://api.bachs.io; anything else uses the sandbox.
// Secrets on the Worker: BACHS_SECRET_KEY, BACHS_WEBHOOK_SECRET.
import { hex, safeEqual } from './lib.js';

export const bachsOn = env => !!env.BACHS_SECRET_KEY;
// BACHS_API_BASE is only for local tests against a fake Bachs server (http://127.0.0.1...).
const base = env => (/^http:\/\/127\.0\.0\.1:\d+$/.test(env.BACHS_API_BASE || '') ? env.BACHS_API_BASE : String(env.BACHS_SECRET_KEY || '').startsWith('sk_live') ? 'https://api.bachs.io' : 'https://sandbox-api.bachs.io') + '/v1';

// 150050 kobo → "1500.50"
export const toDecimal = kobo => `${Math.floor(kobo / 100)}.${String(Math.abs(kobo) % 100).padStart(2, '0')}`;
// "1500.5" → 150050 kobo; null when it isn't a plain positive amount
export function decimalToKobo(s) {
  const m = /^(\d{1,12})(?:\.(\d{1,6}))?$/.exec(String(s ?? '').trim());
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] || '0').slice(0, 2).padEnd(2, '0'));
}

export async function bachs(env, method, path, body, idempotencyKey) {
  const headers = { authorization: `Bearer ${env.BACHS_SECRET_KEY}`, accept: 'application/json' };
  if (body) headers['content-type'] = 'application/json';
  if (idempotencyKey && method === 'POST') headers['idempotency-key'] = idempotencyKey;
  const r = await fetch(base(env) + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(data.detail || data.message || `Bachs ${r.status}`);
    e.code = data.error_code || String(r.status);
    throw e;
  }
  return data;
}

// Webhooks are signed: HMAC-SHA256 (hex) over "<unix seconds>.<raw body>" with the webhook signing secret.
// Either "X-Bachs-Signature-V2: t=<ts>,v1=<sig>" or "X-Bachs-Timestamp" + "X-Bachs-Signature".
// Old deliveries (over 5 minutes) are refused so a captured webhook can't be replayed later.
export async function bachsWebhookOk(env, req, raw) {
  if (!env.BACHS_WEBHOOK_SECRET) return false;
  let ts = '', sigs = [];
  const v2 = req.headers.get('x-bachs-signature-v2');
  if (v2) {
    for (const part of v2.split(',')) {
      const [k, v] = part.split('=').map(x => (x || '').trim());
      if (k === 't') ts = v; else if (k === 'v1' && v) sigs.push(v);
    }
  } else {
    ts = String(req.headers.get('x-bachs-timestamp') || '').trim();
    const s = String(req.headers.get('x-bachs-signature') || '').trim();
    if (s) sigs.push(s.replace(/^v1=/, ''));
  }
  if (!/^\d{9,11}$/.test(ts) || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.BACHS_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const want = hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ts}.${raw}`))));
  return sigs.some(s => safeEqual(want, s.toLowerCase()));
}

// Bank list for payouts (cached for a day in this Worker instance).
let bankCache = null, bankAt = 0;
export async function bachsBanks(env) {
  if (bankCache && Date.now() - bankAt < 86400000) return bankCache;
  const d = await bachs(env, 'GET', '/payouts/banks?country_code=NG');
  const list = (d.data || []).filter(b => b && b.code && b.name).map(b => [String(b.code), String(b.name)]).sort((a, b) => a[1].localeCompare(b[1]));
  if (list.length) { bankCache = list; bankAt = Date.now(); }
  return list;
}
