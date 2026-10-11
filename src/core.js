// Shared game/business helpers: settings, tiers, wallet ledger, inventory, notifications, stats.
import { uid, nowIso, json } from './lib.js';
import { tierOf, isNepo, isPaid, atLeast, tierName } from './tiers.js';

export { tierOf, isNepo, isPaid, atLeast, tierName };
export const naira = k => '₦' + (Number(k || 0) / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 });

// ── settings (cached briefly per isolate) ───────────────────────────────────
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
export const tierLabel = u => (u?.role === 'SPONSOR' ? 'Sponsor' : u?.role === 'ADMIN' ? 'Super admin' : tierName(tierOf(u)));

export const USER_COLS = 'id,username,email,role,tier,tier_until,status,lifetime_taps,games_played,wins,rank_level,referral_code,referral_count,equipped_skin,prefs,gender,country,adult_confirmed_at,archived_at,emoji,emoji_meaning,email_news,hide_profile,seed_set_at,last_free_box_at,created_at';
export async function loadUser(env, id) {
  return env.DB.prepare(`SELECT ${USER_COLS} FROM users WHERE id=?`).bind(id).first();
}

// Error responses carry a "where to go" hint the app shows as a button on the toast.
export function requireRole(user, roles) {
  if (!user) return json({ error: 'Login first.', redirect: '/login', go: 'Login' }, 401);
  if (user.status && user.status !== 'ACTIVE') return json({ error: 'This account is not active.' }, 403);
  if (roles && !roles.includes(user.role)) return json({ error: 'You no fit do this one.' }, 403);
  return null;
}
export const upgradeError = (msg, need = 'MAPO') => json({ error: msg, code: 'UPGRADE', need, redirect: '/plans', go: 'See plans' }, 403);
export const fundsError = msg => json({ error: msg, code: 'FUNDS', redirect: '/wallet', go: 'Fund wallet' }, 402);
export const adultError = () => json({ error: 'Confirm you are 18 or older before using money in Tap Am.', code: 'ADULT', field: 'adult' }, 403);

// ── wallet ledger ───────────────────────────────────────────────────────────
export async function ensureWallet(env, userId) {
  await env.DB.prepare('INSERT OR IGNORE INTO wallets(user_id,balance_kobo,winnings_kobo) VALUES(?,0,0)').bind(userId).run();
}
export async function getWallet(env, userId) {
  const w = await env.DB.prepare('SELECT balance_kobo,winnings_kobo FROM wallets WHERE user_id=?').bind(userId).first();
  if (w) return w;
  await ensureWallet(env, userId);
  return { balance_kobo: 0, winnings_kobo: 0 };
}
const col = which => (which === 'WINNINGS' ? 'winnings_kobo' : 'balance_kobo');

export async function credit(env, userId, amount, { balance = 'WALLET', type, reference = null, note = null }) {
  await ensureWallet(env, userId);
  await env.DB.batch([
    env.DB.prepare(`UPDATE wallets SET ${col(balance)}=${col(balance)}+? WHERE user_id=?`).bind(amount, userId),
    env.DB.prepare('INSERT INTO wallet_transactions(id,user_id,type,amount_kobo,reference,status,balance,note) VALUES(?,?,?,?,?,?,?,?)').bind(uid(), userId, type, amount, reference, 'SUCCESS', balance, note)
  ]);
}
// Returns true if the money was taken. Never goes below zero (the WHERE guard is atomic).
export async function debit(env, userId, amount, { balance = 'WALLET', type, reference = null, note = null }) {
  if (amount <= 0) return true;
  await ensureWallet(env, userId);
  // One transaction: the ledger row is written only if the balance update took the money (changes() > 0),
  // so a worker stopping half-way can never leave money taken without a record.
  const [r] = await env.DB.batch([
    env.DB.prepare(`UPDATE wallets SET ${col(balance)}=${col(balance)}-? WHERE user_id=? AND ${col(balance)}>=?`).bind(amount, userId, amount),
    env.DB.prepare('INSERT INTO wallet_transactions(id,user_id,type,amount_kobo,reference,status,balance,note) SELECT ?,?,?,?,?,?,?,? WHERE changes()>0').bind(uid(), userId, type, -amount, reference, 'SUCCESS', balance, note)
  ]);
  return !!r.meta.changes;
}

// Moves money in one transaction: from one balance to another (same player or another player).
// Every step only runs if the step before it changed a row, so money is never taken without landing.
export async function moveMoney(env, { from, to, amount, fromBal = 'WALLET', toBal = 'WALLET', outType, inType, reference = null, outNote = null, inNote = null }) {
  if (amount <= 0) return false;
  await ensureWallet(env, from); await ensureWallet(env, to);
  const rs = await env.DB.batch([
    env.DB.prepare(`UPDATE wallets SET ${col(fromBal)}=${col(fromBal)}-? WHERE user_id=? AND ${col(fromBal)}>=?`).bind(amount, from, amount),
    env.DB.prepare('INSERT INTO wallet_transactions(id,user_id,type,amount_kobo,reference,status,balance,note) SELECT ?,?,?,?,?,?,?,? WHERE changes()>0').bind(uid(), from, outType, -amount, reference, 'SUCCESS', fromBal, outNote),
    env.DB.prepare(`UPDATE wallets SET ${col(toBal)}=${col(toBal)}+? WHERE user_id=? AND changes()>0`).bind(amount, to),
    env.DB.prepare('INSERT INTO wallet_transactions(id,user_id,type,amount_kobo,reference,status,balance,note) SELECT ?,?,?,?,?,?,?,? WHERE changes()>0').bind(uid(), to, inType, amount, reference, 'SUCCESS', toBal, inNote)
  ]);
  return !!rs[0].meta.changes;
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
// Is this store item open to this user (tier + rank)? Returns null or { why, need }.
export function itemLock(item, user) {
  if (item.audience === 'NEPO' && !isNepo(user)) return { why: 'Nepo babies only', need: 'NEPO' };
  if (item.audience === 'MAPO' && !isPaid(user)) return { why: 'Mapo & Nepo babies only', need: 'MAPO' };
  if (item.audience === 'LAPO' && isPaid(user)) return { why: 'For Lapo babies', need: null };
  if ((user.rank_level || 1) < (item.min_rank || 1)) return { why: `Unlocks at rank ${item.min_rank}`, need: 'RANK' };
  return null;
}
export const itemBlocked = (item, user) => itemLock(item, user)?.why || null;

// ── notifications, audit, metrics ───────────────────────────────────────────
export async function notify(env, userId, text, link = null) {
  await env.DB.prepare('INSERT INTO notifications(id,user_id,text,link) VALUES(?,?,?,?)').bind(uid(), userId, text, link).run();
}
export async function audit(env, adminId, action, detail) {
  await env.DB.prepare('INSERT INTO audit_logs(id,admin_user_id,action,detail) VALUES(?,?,?,?)').bind(uid(), adminId, action, typeof detail === 'string' ? detail : JSON.stringify(detail)).run();
}
export const lagosDay = (d = new Date()) => new Date(d.getTime() + 3600000).toISOString().slice(0, 10);   // Africa/Lagos = UTC+1, no DST
export const metricStmt = (env, key, n = 1, day = lagosDay()) => env.DB.prepare('INSERT INTO metrics(key,day,n) VALUES(?,?,?) ON CONFLICT(key,day) DO UPDATE SET n=n+excluded.n').bind(key, day, n);
export const bump = (env, key, n = 1) => metricStmt(env, key, n).run().catch(() => {});

// Period keys for the top-tapper boards (Lagos time). Week = ISO week.
export function periodKeys(d = new Date()) {
  const l = new Date(d.getTime() + 3600000);
  const day = l.toISOString().slice(0, 10), month = day.slice(0, 7), year = day.slice(0, 4);
  const t = new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate()));
  const dow = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dow);
  const wk = Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
  return { DAY: 'D' + day, WEEK: `W${t.getUTCFullYear()}-${String(wk).padStart(2, '0')}`, MONTH: 'M' + month, YEAR: 'Y' + year };
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
// Money typed with commas ("12,500") or spaces.
export const toKobo = v => Math.round(Number(String(v ?? '').replace(/[,\s₦]/g, '')) * 100);
export const nowMs = () => Date.now();
export { nowIso };
