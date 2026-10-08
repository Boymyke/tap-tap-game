// Shared game/business helpers: settings, tiers, wallet ledger, inventory, notifications.
import { uid, nowIso, json } from './lib.js';

export const naira = k => '₦' + (Number(k || 0) / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 });

// ── settings (cached briefly) ───────────────────────────────────────────────
let sCache = null, sAt = 0;
export async function settings(env) {
  if (sCache && Date.now() - sAt < 15000) return sCache;
  const rows = (await env.DB.prepare('SELECT key,value FROM settings').all()).results;
  sCache = Object.fromEntries(rows.map(r => [r.key, r.value]));
  sAt = Date.now();
  return sCache;
}
export const clearSettingsCache = () => { sCache = null; };
export const num = (s, k, d) => (s[k] !== undefined && s[k] !== '' && !isNaN(+s[k]) ? +s[k] : d);

// ── who is who ──────────────────────────────────────────────────────────────
export const isAdmin = u => u?.role === 'ADMIN';
export const isSponsor = u => u?.role === 'SPONSOR';
export const isPlayer = u => u?.role === 'USER';
export function isNepo(u) {
  if (!u || u.role !== 'USER') return false;
  if (u.tier !== 'NEPO') return false;
  return !u.nepo_until || Date.parse(u.nepo_until) > Date.now();
}
export const tierLabel = u => (u?.role === 'SPONSOR' ? 'Sponsor' : u?.role === 'ADMIN' ? 'Super admin' : isNepo(u) ? 'Nepo baby' : 'Lapo baby');

export async function loadUser(env, id) {
  return env.DB.prepare('SELECT id,username,email,role,tier,nepo_until,status,lifetime_taps,games_played,wins,rank_level,referral_code,referral_count,equipped_skin,prefs,created_at FROM users WHERE id=?').bind(id).first();
}

export function requireRole(user, roles) {
  if (!user) return json({ error: 'Login first.', redirect: '/login' }, 401);
  if (user.status && user.status !== 'ACTIVE') return json({ error: 'This account is suspended.' }, 403);
  if (roles && !roles.includes(user.role)) return json({ error: 'You no fit do this one.' }, 403);
  return null;
}

// ── wallet ledger ───────────────────────────────────────────────────────────
export async function ensureWallet(env, userId) {
  await env.DB.prepare('INSERT OR IGNORE INTO wallets(user_id,balance_kobo,winnings_kobo) VALUES(?,0,0)').bind(userId).run();
}
export async function getWallet(env, userId) {
  await ensureWallet(env, userId);
  return env.DB.prepare('SELECT balance_kobo,winnings_kobo FROM wallets WHERE user_id=?').bind(userId).first();
}
const col = which => (which === 'WINNINGS' ? 'winnings_kobo' : 'balance_kobo');

export async function credit(env, userId, amount, { balance = 'WALLET', type, reference = null, note = null }) {
  await ensureWallet(env, userId);
  await env.DB.batch([
    env.DB.prepare(`UPDATE wallets SET ${col(balance)}=${col(balance)}+? WHERE user_id=?`).bind(amount, userId),
    env.DB.prepare('INSERT INTO wallet_transactions(id,user_id,type,amount_kobo,reference,status,balance,note) VALUES(?,?,?,?,?,?,?,?)').bind(uid(), userId, type, amount, reference, 'SUCCESS', balance, note)
  ]);
}
// Returns true if the money was taken. Never goes below zero.
export async function debit(env, userId, amount, { balance = 'WALLET', type, reference = null, note = null }) {
  if (amount <= 0) return true;
  await ensureWallet(env, userId);
  const r = await env.DB.prepare(`UPDATE wallets SET ${col(balance)}=${col(balance)}-? WHERE user_id=? AND ${col(balance)}>=?`).bind(amount, userId, amount).run();
  if (!r.meta.changes) return false;
  await env.DB.prepare('INSERT INTO wallet_transactions(id,user_id,type,amount_kobo,reference,status,balance,note) VALUES(?,?,?,?,?,?,?,?)').bind(uid(), userId, type, -amount, reference, 'SUCCESS', balance, note).run();
  return true;
}

// ── inventory ───────────────────────────────────────────────────────────────
export async function giveItem(env, userId, itemId, qty = 1, { gift = false, from = null, note = null } = {}) {
  const stmts = [env.DB.prepare('INSERT INTO inventory(user_id,item_id,quantity) VALUES(?,?,?) ON CONFLICT(user_id,item_id) DO UPDATE SET quantity=quantity+excluded.quantity').bind(userId, itemId, qty)];
  if (gift) stmts.push(env.DB.prepare('INSERT INTO gifts(id,from_user_id,to_user_id,item_id,quantity,note) VALUES(?,?,?,?,?,?)').bind(uid(), from, userId, itemId, qty, note));
  await env.DB.batch(stmts);
}
export async function takeItem(env, userId, itemId, qty = 1) {
  const r = await env.DB.prepare('UPDATE inventory SET quantity=quantity-? WHERE user_id=? AND item_id=? AND quantity>=?').bind(qty, userId, itemId, qty).run();
  return r.meta.changes > 0;
}
export async function owns(env, userId, itemId) {
  const r = await env.DB.prepare('SELECT quantity FROM inventory WHERE user_id=? AND item_id=?').bind(userId, itemId).first();
  return Number(r?.quantity || 0);
}
// Is this store item open to this user (tier + rank)? Returns null or a reason.
export function itemBlocked(item, user) {
  if (item.audience === 'NEPO' && !isNepo(user)) return 'Na only Nepo babies fit get this one.';
  if (item.audience === 'LAPO' && isNepo(user)) return 'This one na for Lapo babies.';
  if ((user.rank_level || 1) < (item.min_rank || 1)) return `You need rank ${item.min_rank} to unlock this.`;
  return null;
}

// ── notifications ───────────────────────────────────────────────────────────
export async function notify(env, userId, text, link = null) {
  await env.DB.prepare('INSERT INTO notifications(id,user_id,text,link) VALUES(?,?,?,?)').bind(uid(), userId, text, link).run();
}

export async function audit(env, adminId, action, detail) {
  await env.DB.prepare('INSERT INTO audit_logs(id,admin_user_id,action,detail) VALUES(?,?,?,?)').bind(uid(), adminId, action, typeof detail === 'string' ? detail : JSON.stringify(detail)).run();
}

// ── codes ───────────────────────────────────────────────────────────────────
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function randomCode(len = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return [...bytes].map(b => ALPHA[b % ALPHA.length]).join('');
}
export const poolPassword = () => randomCode(4) + '-' + randomCode(4);

export function parseJson(s, fallback) { try { return JSON.parse(s); } catch { return fallback; } }
export const clampInt = (v, min, max, d) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d; };
export const nowMs = () => Date.now();
export { nowIso };
