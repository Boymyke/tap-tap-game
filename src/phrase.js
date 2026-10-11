// Recovery phrases: 12 words made at sign-up, used to set a new password when someone forgets theirs
// (and to change the password). We keep:
//   seed_hash  SHA-256(salt + phrase)  — to check a phrase (12 random words = 128 bits, so a fast hash is safe)
//   seed_enc   AES-GCM copy, only if SEED_KEY is set — for the super admin's CSV backup
// Sign-in history (auth_events) lives here too.
import { WORDS } from './wordlist.js';
import { sha256Hex, safeEqual, uid } from './lib.js';

const hex = b => [...b].map(x => x.toString(16).padStart(2, '0')).join('');
const b64 = b => btoa(String.fromCharCode(...b));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

export function newPhrase() {
  const r = crypto.getRandomValues(new Uint16Array(12));   // 65536 is a multiple of 2048: every word equally likely
  return Array.from(r, n => WORDS[n % 2048]).join(' ');
}
const SET = new Set(WORDS);
// Returns the phrase in its standard form, or null when it isn't 12 words from the list.
export function normPhrase(text) {
  const w = String(text || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  return w.length === 12 && w.every(x => SET.has(x)) ? w.join(' ') : null;
}
export async function hashPhrase(phrase, salt = hex(crypto.getRandomValues(new Uint8Array(16)))) {
  return { hash: await sha256Hex(`tapam-phrase:${salt}:${phrase}`), salt };
}
export async function phraseMatches(user, phrase) {
  if (!user?.seed_hash || !user.seed_salt || !phrase) return false;
  const { hash } = await hashPhrase(phrase, user.seed_salt);
  return safeEqual(hash, user.seed_hash);
}

// The admin backup copy. Production must set the SEED_KEY secret; the preview (test mode) uses a
// fixed test key so the feature can be tried. Without a key no copy is kept.
function seedSecret(env) { return env.SEED_KEY || (env.OTP_DEV_MODE === '1' ? 'tapam-preview-test-key-not-for-production' : null); }
async function aesKey(env) {
  const secret = seedSecret(env); if (!secret) return null;
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function encryptPhrase(env, phrase) {
  const key = await aesKey(env); if (!key) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(phrase)));
  return b64(iv) + '.' + b64(ct);
}
export async function decryptPhrase(env, blob) {
  try {
    const key = await aesKey(env); if (!key || !blob) return null;
    const [iv, ct] = String(blob).split('.');
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(ct)));
  } catch { return null; }
}
export const canKeepCopies = env => !!seedSecret(env);

// Columns to save for a new phrase.
export async function phraseColumns(env, phrase) {
  const h = await hashPhrase(phrase);
  return { seed_hash: h.hash, seed_salt: h.salt, seed_enc: await encryptPhrase(env, phrase), seed_set_at: new Date().toISOString() };
}

// ── sign-in history ──
function deviceName(ua = '') {
  const os = /iphone|ipad/i.test(ua) ? 'iPhone/iPad' : /android/i.test(ua) ? 'Android' : /windows/i.test(ua) ? 'Windows' : /mac os/i.test(ua) ? 'Mac' : /linux/i.test(ua) ? 'Linux' : 'Unknown device';
  const br = /edg\//i.test(ua) ? 'Edge' : /samsungbrowser/i.test(ua) ? 'Samsung Internet' : /opr\//i.test(ua) ? 'Opera' : /chrome|crios/i.test(ua) ? 'Chrome' : /firefox|fxios/i.test(ua) ? 'Firefox' : /safari/i.test(ua) ? 'Safari' : 'Browser';
  return `${br} on ${os}`;
}
// IP addresses are shortened (first two parts) so the history is useful without keeping the full address.
const shortIp = ip => (/^\d+\.\d+\.\d+\.\d+$/.test(ip) ? ip.split('.').slice(0, 2).join('.') + '.x.x' : String(ip).includes(':') ? String(ip).split(':').slice(0, 3).join(':') + ':…' : '');
export async function logAuth(env, userId, kind, req) {
  try {
    const ip = req?.headers.get('cf-connecting-ip') || '';
    const country = req?.cf?.country ? ` · ${req.cf.country}` : '';
    await env.DB.prepare('INSERT INTO auth_events(id,user_id,kind,ip,ua) VALUES(?,?,?,?,?)').bind(uid(), userId, kind, shortIp(ip) + country, deviceName(req?.headers.get('user-agent') || '')).run();
  } catch (e) { console.error('auth log', e?.message); }
}
