// Wallet funding, Mapo/Nepo subscriptions and withdrawals (Paystack), with a test mode for the preview.
import { json, readJson, allow, uid, nowIso, hex, safeEqual } from '../lib.js';
import { tierOf, requireRole, credit, debit, moveMoney, getWallet, giveItem, notify, settings, num, naira, loadUser, clampInt, toKobo, fundsError, adultError, lagosDay, metricStmt } from '../core.js';
import { perks, PLANS, tierName } from '../tiers.js';

const PAYSTACK = 'https://api.paystack.co';
export const paystackOn = env => !!env.PAYSTACK_SECRET_KEY;
export const testPayments = env => env.PAYMENTS_TEST_MODE === '1' && !paystackOn(env);

// Paystack bank codes for the most used Nigerian banks.
export const BANKS = [
  ['044', 'Access Bank'], ['023', 'Citibank'], ['050', 'Ecobank'], ['070', 'Fidelity Bank'], ['011', 'First Bank'], ['214', 'FCMB'],
  ['058', 'GTBank'], ['030', 'Heritage Bank'], ['082', 'Keystone Bank'], ['50211', 'Kuda'], ['50515', 'Moniepoint'], ['999992', 'OPay'],
  ['999991', 'PalmPay'], ['076', 'Polaris Bank'], ['101', 'Providus Bank'], ['221', 'Stanbic IBTC'], ['232', 'Sterling Bank'],
  ['032', 'Union Bank'], ['033', 'UBA'], ['215', 'Unity Bank'], ['035', 'Wema Bank'], ['057', 'Zenith Bank']
];

async function ps(env, method, path, body) {
  const r = await fetch(PAYSTACK + path, { method, headers: { authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.status === false) throw new Error(data.message || `Paystack ${r.status}`);
  return data.data;
}

const PURPOSE = { MAPO: { month: 'MAPO_MONTH', year: 'MAPO_YEAR' }, NEPO: { month: 'NEPO_MONTH', year: 'NEPO_YEAR' } };
const fromPurpose = p => { const m = /^(MAPO|NEPO)_(MONTH|YEAR)$/.exec(p || ''); return m ? { tier: m[1], plan: m[2] === 'YEAR' ? 'year' : 'month' } : null; };

// Starts or extends a paid tier. Upgrading Mapo → Nepo turns the Mapo days left into Nepo days
// at the same money value, so nobody loses what they paid.
export async function activateTier(env, userId, tier, plan) {
  const s = await settings(env);
  // plan: 'month' | 'year', or { days, bonus } for promo codes
  const P = PLANS(s)[tier], p = typeof plan === 'object' ? plan : P[plan];
  const bonus = typeof plan === 'object' ? (plan.bonus ?? 0) : P.bonus;
  const u = await loadUser(env, userId);
  const cur = tierOf(u);
  let base = Date.now();
  if (cur === tier && u.tier_until) base = Math.max(Date.now(), Date.parse(u.tier_until));
  else if (cur === 'MAPO' && tier === 'NEPO' && u.tier_until) {
    const leftMs = Math.max(0, Date.parse(u.tier_until) - Date.now());
    const ratio = PLANS(s).MAPO.month.kobo / Math.max(1, PLANS(s).NEPO.month.kobo);
    base = Date.now() + Math.floor(leftMs * ratio);
  }
  const until = new Date(base + p.days * 86400000).toISOString();
  await env.DB.prepare('UPDATE users SET tier=?, tier_until=? WHERE id=?').bind(tier, until, userId).run();
  if (bonus > 0) await giveItem(env, userId, 'booster-2x', bonus);
  await notify(env, userId, `Welcome to ${tier === 'NEPO' ? 'Nepo' : 'Mapo'}!${bonus > 0 ? ` You get ${bonus} bonus boosters.` : ''} It runs till ${until.slice(0, 10)}.`, '/me');
  return until;
}
// A player turns in a promo code for a free Mapo / Nepo plan. One use per player; the use count is
// claimed in one statement so a code can't go over its limit even with many people at once.
export async function redeemCode(env, user, raw) {
  const code = String(raw || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!code) return json({ error: 'Enter the code.', field: 'code' }, 400);
  const c = await env.DB.prepare('SELECT * FROM promo_codes WHERE code=?').bind(code).first();
  if (!c || !c.active || (c.expires_at && c.expires_at < nowIso())) return json({ error: 'That code no work. Check it or ask for a new one.', field: 'code' }, 404);
  const u = await loadUser(env, user.id);
  if (tierOf(u) === 'NEPO' && c.tier === 'MAPO') return json({ error: 'You are already a Nepo baby. This code is for Mapo.', field: 'code' }, 409);
  const mine = await env.DB.prepare('INSERT OR IGNORE INTO promo_redemptions(code,user_id) VALUES(?,?)').bind(code, user.id).run();
  if (!mine.meta.changes) return json({ error: 'You don already use this code.', field: 'code' }, 409);
  const claim = await env.DB.prepare('UPDATE promo_codes SET used=used+1 WHERE code=? AND used<max_uses AND active=1').bind(code).run();
  if (!claim.meta.changes) { await env.DB.prepare('DELETE FROM promo_redemptions WHERE code=? AND user_id=?').bind(code, user.id).run(); return json({ error: 'This code don finish. Everybody don use am.', field: 'code' }, 409); }
  const until = await activateTier(env, user.id, c.tier, { days: c.days, bonus: 0 });
  return json({ message: `Code worked! You are ${c.tier === 'NEPO' ? 'a Nepo' : 'a Mapo'} baby till ${until.slice(0, 10)}.`, reload: true });
}
export const activateNepo = (env, userId, plan) => activateTier(env, userId, 'NEPO', plan);

// Applies a verified Paystack payment exactly once.
export async function applyPayment(env, reference, paidKobo) {
  const pay = await env.DB.prepare('SELECT * FROM payments WHERE reference=?').bind(reference).first();
  if (!pay) return { error: 'Unknown payment' };
  if (paidKobo !== undefined && paidKobo < pay.amount_kobo) return { error: 'Amount mismatch' };
  const claim = await env.DB.prepare("UPDATE payments SET status='SUCCESS', verified_at=? WHERE reference=? AND status='PENDING'").bind(nowIso(), reference).run();
  if (!claim.meta.changes) return { already: true, purpose: pay.purpose };
  if (pay.purpose === 'FUND' || pay.purpose === 'SPONSOR_FUND') {
    await credit(env, pay.user_id, pay.amount_kobo, { type: 'FUND', reference, note: 'Wallet funding' });
    await notify(env, pay.user_id, `${naira(pay.amount_kobo)} don land for your wallet.`, pay.purpose === 'SPONSOR_FUND' ? '/sponsor' : '/wallet');
  } else {
    const t = fromPurpose(pay.purpose);
    if (t) {
      await activateTier(env, pay.user_id, t.tier, t.plan);
      await env.DB.prepare('INSERT INTO wallet_transactions(id,user_id,type,amount_kobo,reference,status,balance,note) VALUES(?,?,?,?,?,?,?,?)').bind(uid(), pay.user_id, 'PLAN', -pay.amount_kobo, reference, 'SUCCESS', 'CARD', `${tierName(t.tier)} ${t.plan}ly (card)`).run();
    }
  }
  await metricStmt(env, 'payments_kobo', pay.amount_kobo).run().catch(() => {});
  return { ok: true, purpose: pay.purpose };
}

async function startCardPayment(env, req, user, purpose, kobo) {
  const reference = 'TA-' + uid().replace(/-/g, '').slice(0, 20);
  await env.DB.prepare('INSERT INTO payments(reference,user_id,purpose,amount_kobo) VALUES(?,?,?,?)').bind(reference, user.id, purpose, kobo).run();
  const origin = new URL(req.url).origin;
  const data = await ps(env, 'POST', '/transaction/initialize', { email: user.email, amount: kobo, reference, callback_url: `${origin}/pay/callback`, metadata: { purpose, user_id: user.id } });
  return json({ redirect: data.authorization_url });
}

async function needAdult(env, me, data) {
  if (me.role !== 'USER' || me.adult_confirmed_at) return null;
  if (data.adult !== true) return adultError();
  await env.DB.prepare('UPDATE users SET adult_confirmed_at=? WHERE id=?').bind(nowIso(), me.id).run();
  return null;
}

// Withdrawals today (Lagos calendar day), not counting rejected ones.
async function withdrawalsToday(env, userId) {
  const start = new Date(Date.parse(lagosDay() + 'T00:00:00Z') - 3600000).toISOString();
  return Number((await env.DB.prepare("SELECT COUNT(*) n FROM withdrawals WHERE user_id=? AND datetime(created_at)>=datetime(?) AND status!='REJECTED'").bind(userId, start).first())?.n || 0);
}

export async function handleMoneyApi(req, env, path, user) {
  // Paystack webhook (no session; verified by signature)
  if (path === '/api/paystack/webhook' && req.method === 'POST') {
    if (!paystackOn(env)) return json({ ok: false }, 404);
    const raw = await req.text();
    if (raw.length > 100000) return json({ ok: false }, 413);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.PAYSTACK_SECRET_KEY), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
    const sig = hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw))));
    if (!safeEqual(sig, String(req.headers.get('x-paystack-signature') || ''))) return json({ ok: false }, 401);
    const evt = JSON.parse(raw);
    if (evt.event === 'charge.success') await applyPayment(env, evt.data.reference, evt.data.amount);
    if (evt.event === 'transfer.success' || evt.event === 'transfer.failed' || evt.event === 'transfer.reversed') {
      const w = await env.DB.prepare('SELECT * FROM withdrawals WHERE transfer_code=? OR id=?').bind(evt.data.transfer_code || '', evt.data.reference || '').first();
      if (w && w.status === 'PROCESSING') {
        if (evt.event === 'transfer.success') { await env.DB.prepare("UPDATE withdrawals SET status='PAID', updated_at=? WHERE id=?").bind(nowIso(), w.id).run(); await notify(env, w.user_id, `Your withdrawal of ${naira(w.amount_kobo)} has been paid.`, '/wallet'); }
        else { await env.DB.prepare("UPDATE withdrawals SET status='FAILED', updated_at=? WHERE id=?").bind(nowIso(), w.id).run(); await credit(env, w.user_id, w.amount_kobo, { balance: 'WINNINGS', type: 'WITHDRAW_REFUND', reference: w.id, note: 'Transfer failed' }); await notify(env, w.user_id, `Your withdrawal of ${naira(w.amount_kobo)} failed at the bank. The money is back in your winnings.`, '/wallet'); }
      }
    }
    return json({ ok: true });
  }

  if (!path.startsWith('/api/wallet') && !path.startsWith('/api/plans') && !path.startsWith('/api/nepo') && !path.startsWith('/api/withdraw') && path !== '/api/bank/resolve') return null;
  const deny = requireRole(user, ['USER', 'SPONSOR']); if (deny) return deny;
  const me = await loadUser(env, user.id);
  const s = await settings(env);

  if (path === '/api/wallet' && req.method === 'GET') {
    const page = clampInt(new URL(req.url).searchParams.get('page'), 1, 1000, 1);
    const w = await getWallet(env, user.id);
    const tx = (await env.DB.prepare('SELECT type,amount_kobo,balance,note,created_at FROM wallet_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 21 OFFSET ?').bind(user.id, (page - 1) * 20).all()).results;
    return json({ wallet: w, tx: tx.slice(0, 20), page, hasNext: tx.length > 20 });
  }

  if (path === '/api/wallet/fund' && req.method === 'POST') {
    const { data, response } = await readJson(req); if (response) return response;
    if (data.ack !== true) return json({ error: 'Tick the box to confirm you understand money you add can’t be withdrawn.', field: 'ack' }, 400);
    const kobo = clampInt(toKobo(data.amount), 0, 1000000000, 0);
    if (kobo < 10000) return json({ error: 'Minimum is ₦100.', field: 'amount' }, 400);
    if (kobo > 100000000) return json({ error: 'Maximum is ₦1,000,000 at once.', field: 'amount' }, 400);
    const adult = await needAdult(env, me, data); if (adult) return adult;
    if (!await allow(env, 'fund:' + user.id, 20, 3600)) return json({ error: 'Too many tries. Wait small.' }, 429);
    const purpose = me.role === 'SPONSOR' ? 'SPONSOR_FUND' : 'FUND';
    if (paystackOn(env)) return startCardPayment(env, req, me, purpose, kobo);
    if (testPayments(env)) {
      const ref = 'TEST-' + uid().slice(0, 8);
      await env.DB.prepare('INSERT INTO payments(reference,user_id,purpose,amount_kobo,provider) VALUES(?,?,?,?,?)').bind(ref, user.id, purpose, kobo, 'test').run();
      await applyPayment(env, ref, kobo);
      return json({ message: `Test mode: ${naira(kobo)} added (no real money).`, reload: true });
    }
    return json({ error: 'Payments never open yet. Check back soon.' }, 503);
  }

  if ((path === '/api/plans/subscribe' || path === '/api/nepo/subscribe') && req.method === 'POST') {
    if (me.role !== 'USER') return json({ error: 'Only players fit upgrade.' }, 403);
    const { data, response } = await readJson(req); if (response) return response;
    const tier = data.tier === 'MAPO' ? 'MAPO' : 'NEPO';
    const plan = data.plan === 'year' ? 'year' : 'month';
    const cur = tierOf(me);
    if (cur === 'NEPO' && tier === 'MAPO') return json({ error: `You are Nepo till ${String(me.tier_until).slice(0, 10)}. You fit pick Mapo after it ends.` }, 409);
    if (!await allow(env, 'plan:' + user.id, 20, 3600)) return json({ error: 'Too many tries. Wait small.' }, 429);
    const p = PLANS(s)[tier][plan];
    const label = `${tierName(tier)} ${plan}ly`;
    if (data.method === 'card') {
      if (paystackOn(env)) return startCardPayment(env, req, me, PURPOSE[tier][plan], p.kobo);
      if (!testPayments(env)) return json({ error: 'Card payments never open yet. Pay from your wallet.' }, 503);
      const ref = 'TEST-' + uid().slice(0, 8);
      await env.DB.prepare('INSERT INTO payments(reference,user_id,purpose,amount_kobo,provider) VALUES(?,?,?,?,?)').bind(ref, user.id, PURPOSE[tier][plan], p.kobo, 'test').run();
      await applyPayment(env, ref, p.kobo);
      return json({ message: `Test mode: you are now a ${tierName(tier)}!`, redirect: '/me' });
    }
    const adult = await needAdult(env, me, data); if (adult) return adult;
    let ok = await debit(env, user.id, p.kobo, { type: 'PLAN', note: label });
    if (!ok && data.use_winnings === true) ok = await debit(env, user.id, p.kobo, { balance: 'WINNINGS', type: 'PLAN', note: label });
    if (!ok) return fundsError(`You need ${naira(p.kobo)} in your wallet. Fund your wallet or pay with card.`);
    const until = await activateTier(env, user.id, tier, plan);
    return json({ message: `You are now a ${tierName(tier)} till ${until.slice(0, 10)}!`, redirect: '/me' });
  }

  if (path === '/api/bank/resolve' && req.method === 'POST') {
    const { data, response } = await readJson(req); if (response) return response;
    if (!/^\d{10}$/.test(String(data.account_number || ''))) return json({ error: 'Account number must be 10 digits.', field: 'account_number' }, 400);
    if (!/^\d{3,6}$/.test(String(data.bank_code || ''))) return json({ error: 'Pick your bank.', field: 'bank_code' }, 400);
    if (!paystackOn(env)) return json({ account_name: null });
    if (!await allow(env, 'resolve:' + user.id, 20, 3600)) return json({ error: 'Too many tries. Wait small.' }, 429);
    try { const d = await ps(env, 'GET', `/bank/resolve?account_number=${data.account_number}&bank_code=${encodeURIComponent(data.bank_code)}`); return json({ account_name: d.account_name }); }
    catch { return json({ error: 'We no fit confirm this account. Check the number and bank.', field: 'account_number' }, 400); }
  }

  // Players send wallet money to each other (not winnings). Wallet money can't be withdrawn, so it stays in the game.
  if (path === '/api/wallet/send' && req.method === 'POST') {
    if (me.role !== 'USER') return json({ error: 'Only players can send money.' }, 403);
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'send:' + user.id, 20, 86400)) return json({ error: 'Too many sends today. Try again tomorrow.' }, 429);
    const adult = await needAdult(env, me, data); if (adult) return adult;
    const kobo = clampInt(toKobo(data.amount), 0, 10000000000, 0);
    if (kobo < 10000) return json({ error: 'Send at least ₦100.', field: 'amount' }, 400);
    const to = await env.DB.prepare("SELECT id, username FROM users WHERE username=? AND role='USER' AND status='ACTIVE'").bind(String(data.to || '').trim()).first();
    if (!to) return json({ error: 'No player with that nickname.', field: 'to' }, 404);
    if (to.id === user.id) return json({ error: 'You no fit send money to yourself.', field: 'to' }, 400);
    if (Date.now() - Date.parse(me.created_at.replace(' ', 'T') + (me.created_at.includes('T') ? '' : 'Z')) < 86400000) return json({ error: 'New accounts can send money after 24 hours.' }, 403);
    const cap = num(s, 'transfer_daily_max_kobo', 5000000);
    const dayStart = new Date(Date.parse(lagosDay() + 'T00:00:00Z') - 3600000).toISOString().replace('T', ' ').slice(0, 19);
    const sent = -Number((await env.DB.prepare("SELECT COALESCE(SUM(amount_kobo),0) n FROM wallet_transactions WHERE user_id=? AND type='GIFT_SENT' AND created_at>=?").bind(user.id, dayStart).first())?.n || 0);
    if (sent + kobo > cap) return json({ error: `You fit send up to ${naira(cap)} a day. You have ${naira(Math.max(0, cap - sent))} left today.`, field: 'amount' }, 400);
    const note = String(data.note || '').trim().slice(0, 80);
    const ok = await moveMoney(env, { from: user.id, to: to.id, amount: kobo, outType: 'GIFT_SENT', inType: 'GIFT_RECEIVED', outNote: `To ${to.username}${note ? ': ' + note : ''}`, inNote: `From ${me.username}${note ? ': ' + note : ''}` });
    if (!ok) return fundsError(`You need ${naira(kobo)} in your wallet.`);
    await notify(env, to.id, `${me.username} sent you ${naira(kobo)}${note ? ': “' + note + '”' : ''}. It is in your wallet.`, '/wallet');
    return json({ message: `Sent ${naira(kobo)} to ${to.username}.`, reload: true });
  }
  // Winnings → wallet (one way). Handy for paying entry fees and the store.
  if (path === '/api/wallet/convert' && req.method === 'POST') {
    if (me.role !== 'USER') return json({ error: 'Only players have winnings.' }, 403);
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'convert:' + user.id, 20, 3600)) return json({ error: 'Too many tries. Wait small.' }, 429);
    const kobo = clampInt(toKobo(data.amount), 0, 10000000000, 0);
    if (kobo < 10000) return json({ error: 'Move at least ₦100.', field: 'amount' }, 400);
    if (data.ack !== true) return json({ error: 'Tick the box: money moved to your wallet can’t be withdrawn.', field: 'ack' }, 400);
    const ok = await moveMoney(env, { from: user.id, to: user.id, amount: kobo, fromBal: 'WINNINGS', toBal: 'WALLET', outType: 'CONVERT', inType: 'CONVERT', outNote: 'Winnings to wallet', inNote: 'From winnings' });
    if (!ok) return json({ error: `You don’t have ${naira(kobo)} in winnings.`, field: 'amount' }, 409);
    return json({ message: `Moved ${naira(kobo)} from winnings to your wallet.`, reload: true });
  }
  if (path === '/api/codes/redeem' && req.method === 'POST') {
    if (me.role !== 'USER') return json({ error: 'Only players can use codes.' }, 403);
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'code:' + user.id, 10, 3600)) return json({ error: 'Too many tries. Wait an hour.' }, 429);
    return redeemCode(env, user, data.code);
  }

  if (path === '/api/withdraw' && req.method === 'POST') {
    if (me.role !== 'USER') return json({ error: 'Sponsor wallets can’t be withdrawn.' }, 403);
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'withdraw:' + user.id, 5, 86400)) return json({ error: 'Too many withdrawal requests today.' }, 429);
    const adult = await needAdult(env, me, data); if (adult) return adult;
    const perDay = Math.max(1, num(s, 'withdrawals_per_day', 1));
    if (await withdrawalsToday(env, user.id) >= perDay) return json({ error: `You can withdraw ${perDay === 1 ? 'once' : perDay + ' times'} a day. Try again tomorrow.` }, 429);
    const min = perks(tierOf(me), s).minWithdraw;
    const kobo = clampInt(toKobo(data.amount), 0, 10000000000, 0);
    if (kobo < min) return json({ error: `Minimum withdrawal for you na ${naira(min)}.`, field: 'amount' }, 400);
    const bank = BANKS.find(b => b[0] === String(data.bank_code));
    if (!bank && !paystackOn(env)) return json({ error: 'Pick your bank.', field: 'bank_code' }, 400);
    if (!/^\d{10}$/.test(String(data.account_number || ''))) return json({ error: 'Account number must be 10 digits.', field: 'account_number' }, 400);
    const name = String(data.account_name || '').trim().slice(0, 80);
    if (name.length < 3) return json({ error: 'Enter the account name.', field: 'account_name' }, 400);
    const pending = await env.DB.prepare("SELECT 1 FROM withdrawals WHERE user_id=? AND status IN ('PENDING','PROCESSING')").bind(user.id).first();
    if (pending) return json({ error: 'You get one withdrawal wey still dey process. Wait for it to finish.' }, 409);
    const id = uid();
    // Claim the slot in ONE statement, so two tabs or scripted parallel requests can't both get through
    // the "one pending / N per day" checks above. Status HOLD is invisible to admin until the money is taken.
    const dayStart = new Date(Date.parse(lagosDay() + 'T00:00:00Z') - 3600000).toISOString();
    const claim = await env.DB.prepare(`INSERT INTO withdrawals(id,user_id,amount_kobo,bank_name,bank_code,account_number,account_name,status)
      SELECT ?,?,?,?,?,?,?,'HOLD' WHERE NOT EXISTS (SELECT 1 FROM withdrawals WHERE user_id=? AND status IN ('HOLD','PENDING','PROCESSING'))
      AND (SELECT COUNT(*) FROM withdrawals WHERE user_id=? AND datetime(created_at)>=datetime(?) AND status!='REJECTED') < ?`)
      .bind(id, user.id, kobo, bank ? bank[1] : null, String(data.bank_code), String(data.account_number), name, user.id, user.id, dayStart, perDay).run();
    if (!claim.meta.changes) return json({ error: 'You get one withdrawal wey still dey process, or you don withdraw today. Try again tomorrow.' }, 409);
    const ok = await debit(env, user.id, kobo, { balance: 'WINNINGS', type: 'WITHDRAW', reference: id, note: `${bank ? bank[1] : data.bank_code} ${String(data.account_number).slice(-4)}` });
    if (!ok) { await env.DB.prepare("DELETE FROM withdrawals WHERE id=? AND status='HOLD'").bind(id).run(); return json({ error: 'You no get reach that much for your winnings.', field: 'amount' }, 402); }
    await env.DB.prepare("UPDATE withdrawals SET status='PENDING' WHERE id=? AND status='HOLD'").bind(id).run();
    return json({ message: `Withdrawal of ${naira(kobo)} requested. We go pay am after a quick check.`, reload: true });
  }
  return null;
}

// Paystack sends players back here after card payment.
export async function payCallback(req, env) {
  const ref = new URL(req.url).searchParams.get('reference') || '';
  if (!paystackOn(env) || !/^TA-[a-f0-9]{8,30}$/.test(ref)) return '/wallet?paid=0';
  try {
    const d = await ps(env, 'GET', `/transaction/verify/${encodeURIComponent(ref)}`);
    if (d.status !== 'success') return '/wallet?paid=0';
    const r = await applyPayment(env, ref, d.amount);
    return r.purpose === 'SPONSOR_FUND' ? '/sponsor?paid=1' : fromPurpose(r.purpose) ? '/me?plan=1' : '/wallet?paid=1';
  } catch { return '/wallet?paid=0'; }
}

// Admin (or the automatic payout sweep): pay or reject a withdrawal.
export async function processWithdrawal(env, admin, id, action, note) {
  const w = await env.DB.prepare('SELECT * FROM withdrawals WHERE id=?').bind(id).first();
  if (!w || w.status !== 'PENDING') return json({ error: 'Withdrawal not pending.' }, 409);
  if (action === 'reject') {
    const c = await env.DB.prepare("UPDATE withdrawals SET status='REJECTED', admin_note=?, updated_at=? WHERE id=? AND status='PENDING'").bind(note || null, nowIso(), id).run();
    if (!c.meta.changes) return json({ error: 'Withdrawal not pending.' }, 409);
    await credit(env, w.user_id, w.amount_kobo, { balance: 'WINNINGS', type: 'WITHDRAW_REFUND', reference: id, note: 'Withdrawal rejected' });
    await notify(env, w.user_id, `Your withdrawal of ${naira(w.amount_kobo)} was not approved${note ? ': ' + note : ''}. The money is back in your winnings.`, '/wallet');
    return json({ message: 'Rejected and refunded' });
  }
  if (action === 'paid') {   // paid outside Paystack (manual bank transfer)
    const c = await env.DB.prepare("UPDATE withdrawals SET status='PAID', admin_note=?, updated_at=? WHERE id=? AND status='PENDING'").bind(note || 'Paid manually', nowIso(), id).run();
    if (!c.meta.changes) return json({ error: 'Withdrawal not pending.' }, 409);
    await notify(env, w.user_id, `Your withdrawal of ${naira(w.amount_kobo)} has been paid.`, '/wallet');
    return json({ message: 'Marked as paid' });
  }
  if (action === 'transfer') {
    if (!paystackOn(env)) return json({ error: 'Paystack is not connected. Pay manually, then mark as paid.' }, 503);
    // claim first so two clicks (or the sweep and an admin) can never send twice
    const c = await env.DB.prepare("UPDATE withdrawals SET status='PROCESSING', updated_at=? WHERE id=? AND status='PENDING'").bind(nowIso(), id).run();
    if (!c.meta.changes) return json({ error: 'Withdrawal not pending.' }, 409);
    try {
      const rec = await ps(env, 'POST', '/transferrecipient', { type: 'nuban', name: w.account_name, account_number: w.account_number, bank_code: w.bank_code, currency: 'NGN' });
      const t = await ps(env, 'POST', '/transfer', { source: 'balance', amount: w.amount_kobo, recipient: rec.recipient_code, reason: 'Tap Am winnings', reference: w.id });
      await env.DB.prepare('UPDATE withdrawals SET transfer_code=?, admin_note=?, updated_at=? WHERE id=?').bind(t.transfer_code, note || (admin ? null : 'Automatic payout'), nowIso(), id).run();
      return json({ message: 'Transfer started' });
    } catch (e) {
      await env.DB.prepare("UPDATE withdrawals SET status='PENDING', admin_note=?, updated_at=? WHERE id=?").bind('Transfer error: ' + String(e.message).slice(0, 120), nowIso(), id).run();
      return json({ error: 'Paystack: ' + e.message }, 502);
    }
  }
  return json({ error: 'Unknown action' }, 400);
}

// Cron: automatic payouts (off by default). Small, older accounts, no anti-cheat flags.
export async function autoPayouts(env) {
  const s = await settings(env);
  if (s.auto_payouts !== '1' || !paystackOn(env)) return 0;
  const max = num(s, 'auto_payout_max_kobo', 5000000), ageDays = num(s, 'auto_payout_min_age_days', 7);
  const cutoff = new Date(Date.now() - ageDays * 86400000).toISOString();
  const rows = (await env.DB.prepare(`SELECT w.id FROM withdrawals w JOIN users u ON u.id=w.user_id WHERE w.status='PENDING' AND w.amount_kobo<=? AND datetime(u.created_at)<=datetime(?) AND u.status='ACTIVE'
    AND NOT EXISTS (SELECT 1 FROM audit_logs a WHERE a.action='anticheat.flag' AND a.detail LIKE '%' || u.id || '%') ORDER BY w.created_at LIMIT 10`).bind(max, cutoff).all()).results;
  let n = 0;
  for (const r of rows) { const res = await processWithdrawal(env, null, r.id, 'transfer', 'Automatic payout'); if (res.ok) n++; }
  return n;
}
