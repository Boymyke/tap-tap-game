// Wallet funding, Nepo subscriptions and withdrawals (Paystack), with a test mode for the preview.
import { json, readJson, allow, uid, nowIso, hex, safeEqual } from '../lib.js';
import { isNepo, requireRole, credit, debit, getWallet, giveItem, notify, settings, num, naira, loadUser, clampInt } from '../core.js';

const PAYSTACK = 'https://api.paystack.co';
export const paystackOn = env => !!env.PAYSTACK_SECRET_KEY;
export const testPayments = env => env.PAYMENTS_TEST_MODE === '1' && !paystackOn(env);

// Paystack bank codes for the most used Nigerian banks (full list is fetched live when Paystack is connected).
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

const PLANS = s => ({ month: { kobo: num(s, 'nepo_monthly_kobo', 1300000), days: 30, label: 'monthly' }, year: { kobo: num(s, 'nepo_yearly_kobo', 12000000), days: 365, label: 'yearly' } });

export async function activateNepo(env, userId, plan) {
  const s = await settings(env);
  const p = PLANS(s)[plan];
  const u = await loadUser(env, userId);
  const base = u.nepo_until && Date.parse(u.nepo_until) > Date.now() ? Date.parse(u.nepo_until) : Date.now();
  const until = new Date(base + p.days * 86400000).toISOString();
  await env.DB.prepare("UPDATE users SET tier='NEPO', nepo_until=? WHERE id=?").bind(until, userId).run();
  const bonus = num(s, 'nepo_bonus_boosters', 5);
  if (bonus > 0) await giveItem(env, userId, 'booster-2x', bonus);
  await notify(env, userId, `Welcome to Nepo! You get ${bonus} bonus boosters. Nepo runs till ${until.slice(0, 10)}.`, '/me');
  return until;
}

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
  } else if (pay.purpose === 'NEPO_MONTH' || pay.purpose === 'NEPO_YEAR') {
    await activateNepo(env, pay.user_id, pay.purpose === 'NEPO_YEAR' ? 'year' : 'month');
    await env.DB.prepare('INSERT INTO wallet_transactions(id,user_id,type,amount_kobo,reference,status,balance,note) VALUES(?,?,?,?,?,?,?,?)').bind(uid(), pay.user_id, 'NEPO', -pay.amount_kobo, reference, 'SUCCESS', 'CARD', 'Nepo subscription (card)').run();
  }
  return { ok: true, purpose: pay.purpose };
}

async function startCardPayment(env, req, user, purpose, kobo) {
  const reference = 'TA-' + uid().replace(/-/g, '').slice(0, 20);
  await env.DB.prepare('INSERT INTO payments(reference,user_id,purpose,amount_kobo) VALUES(?,?,?,?)').bind(reference, user.id, purpose, kobo).run();
  const origin = new URL(req.url).origin;
  const data = await ps(env, 'POST', '/transaction/initialize', { email: user.email, amount: kobo, reference, callback_url: `${origin}/pay/callback`, metadata: { purpose, user_id: user.id } });
  return json({ redirect: data.authorization_url });
}

export async function handleMoneyApi(req, env, path, user) {
  // Paystack webhook (no session; verified by signature)
  if (path === '/api/paystack/webhook' && req.method === 'POST') {
    if (!paystackOn(env)) return json({ ok: false }, 404);
    const raw = await req.text();
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.PAYSTACK_SECRET_KEY), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
    const sig = hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw))));
    if (!safeEqual(sig, String(req.headers.get('x-paystack-signature') || ''))) return json({ ok: false }, 401);
    const evt = JSON.parse(raw);
    if (evt.event === 'charge.success') await applyPayment(env, evt.data.reference, evt.data.amount);
    if (evt.event === 'transfer.success' || evt.event === 'transfer.failed' || evt.event === 'transfer.reversed') {
      const w = await env.DB.prepare('SELECT * FROM withdrawals WHERE transfer_code=? OR id=?').bind(evt.data.transfer_code || '', evt.data.reference || '').first();
      if (w && w.status === 'PROCESSING') {
        if (evt.event === 'transfer.success') await env.DB.prepare("UPDATE withdrawals SET status='PAID', updated_at=? WHERE id=?").bind(nowIso(), w.id).run();
        else { await env.DB.prepare("UPDATE withdrawals SET status='FAILED', updated_at=? WHERE id=?").bind(nowIso(), w.id).run(); await credit(env, w.user_id, w.amount_kobo, { balance: 'WINNINGS', type: 'WITHDRAW_REFUND', reference: w.id, note: 'Transfer failed' }); }
      }
    }
    return json({ ok: true });
  }

  if (!path.startsWith('/api/wallet') && !path.startsWith('/api/nepo') && !path.startsWith('/api/withdraw') && path !== '/api/bank/resolve') return null;
  const deny = requireRole(user, ['USER', 'SPONSOR']); if (deny) return deny;
  const me = await loadUser(env, user.id);
  const s = await settings(env);

  if (path === '/api/wallet' && req.method === 'GET') {
    const w = await getWallet(env, user.id);
    const tx = (await env.DB.prepare('SELECT type,amount_kobo,balance,note,created_at FROM wallet_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 30').bind(user.id).all()).results;
    return json({ wallet: w, tx });
  }

  if (path === '/api/wallet/fund' && req.method === 'POST') {
    const { data, response } = await readJson(req); if (response) return response;
    if (data.ack !== true) return json({ error: 'Tick the box to confirm you understand money you add can’t be withdrawn.', field: 'ack' }, 400);
    const kobo = clampInt(Number(data.amount) * 100, 0, 1000000000, 0);
    if (kobo < 10000) return json({ error: 'Minimum is ₦100.', field: 'amount' }, 400);
    if (kobo > 100000000) return json({ error: 'Maximum is ₦1,000,000 at once.', field: 'amount' }, 400);
    if (!await allow(env, 'fund:' + user.id, 20, 3600)) return json({ error: 'Too many tries. Wait small.' }, 429);
    const purpose = me.role === 'SPONSOR' ? 'SPONSOR_FUND' : 'FUND';
    if (paystackOn(env)) return startCardPayment(env, req, me, purpose, kobo);
    if (testPayments(env)) {
      const ref = 'TEST-' + uid().slice(0, 8);
      await env.DB.prepare('INSERT INTO payments(reference,user_id,purpose,amount_kobo,provider) VALUES(?,?,?,?,?)').bind(ref, user.id, purpose, kobo, 'test').run();
      await applyPayment(env, ref, kobo);
      return json({ message: `Test mode: ${naira(kobo)} added (no real money).` });
    }
    return json({ error: 'Payments never open yet. Check back soon.' }, 503);
  }

  if (path === '/api/nepo/subscribe' && req.method === 'POST') {
    if (me.role !== 'USER') return json({ error: 'Only players fit go Nepo.' }, 403);
    const { data, response } = await readJson(req); if (response) return response;
    const plan = data.plan === 'year' ? 'year' : 'month';
    const p = PLANS(s)[plan];
    if (data.method === 'card') {
      if (paystackOn(env)) return startCardPayment(env, req, me, plan === 'year' ? 'NEPO_YEAR' : 'NEPO_MONTH', p.kobo);
      if (!testPayments(env)) return json({ error: 'Card payments never open yet. Pay from your wallet.' }, 503);
      const ref = 'TEST-' + uid().slice(0, 8);
      await env.DB.prepare('INSERT INTO payments(reference,user_id,purpose,amount_kobo,provider) VALUES(?,?,?,?,?)').bind(ref, user.id, plan === 'year' ? 'NEPO_YEAR' : 'NEPO_MONTH', p.kobo, 'test').run();
      await applyPayment(env, ref, p.kobo);
      return json({ message: 'Test mode: you are now a Nepo baby!', redirect: '/me' });
    }
    let ok = await debit(env, user.id, p.kobo, { type: 'NEPO', note: `Nepo ${p.label}` });
    if (!ok && data.use_winnings === true) ok = await debit(env, user.id, p.kobo, { balance: 'WINNINGS', type: 'NEPO', note: `Nepo ${p.label}` });
    if (!ok) return json({ error: `You need ${naira(p.kobo)} in your wallet. Fund your wallet or pay with card.`, code: 'FUNDS', redirect: '/wallet' }, 402);
    const until = await activateNepo(env, user.id, plan);
    return json({ message: `You are now a Nepo baby till ${until.slice(0, 10)}!`, redirect: '/me' });
  }

  if (path === '/api/bank/resolve' && req.method === 'POST') {
    const { data, response } = await readJson(req); if (response) return response;
    if (!/^\d{10}$/.test(String(data.account_number || ''))) return json({ error: 'Account number must be 10 digits.', field: 'account_number' }, 400);
    if (!paystackOn(env)) return json({ account_name: null });
    try { const d = await ps(env, 'GET', `/bank/resolve?account_number=${data.account_number}&bank_code=${encodeURIComponent(data.bank_code)}`); return json({ account_name: d.account_name }); }
    catch { return json({ error: 'We no fit confirm this account. Check the number and bank.', field: 'account_number' }, 400); }
  }

  if (path === '/api/withdraw' && req.method === 'POST') {
    if (me.role !== 'USER') return json({ error: 'Sponsor wallets can’t be withdrawn.' }, 403);
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'withdraw:' + user.id, 5, 86400)) return json({ error: 'Too many withdrawal requests today.' }, 429);
    const min = isNepo(me) ? num(s, 'min_withdraw_nepo_kobo', 500000) : num(s, 'min_withdraw_lapo_kobo', 1000000);
    const kobo = clampInt(Number(data.amount) * 100, 0, 10000000000, 0);
    if (kobo < min) return json({ error: `Minimum withdrawal for you na ${naira(min)}.`, field: 'amount' }, 400);
    const bank = BANKS.find(b => b[0] === String(data.bank_code));
    if (!bank && !paystackOn(env)) return json({ error: 'Pick your bank.', field: 'bank_code' }, 400);
    if (!/^\d{10}$/.test(String(data.account_number || ''))) return json({ error: 'Account number must be 10 digits.', field: 'account_number' }, 400);
    const name = String(data.account_name || '').trim().slice(0, 80);
    if (name.length < 3) return json({ error: 'Enter the account name.', field: 'account_name' }, 400);
    const pending = await env.DB.prepare("SELECT 1 FROM withdrawals WHERE user_id=? AND status IN ('PENDING','PROCESSING')").bind(user.id).first();
    if (pending) return json({ error: 'You get one withdrawal wey still dey process.' }, 409);
    const id = uid();
    const ok = await debit(env, user.id, kobo, { balance: 'WINNINGS', type: 'WITHDRAW', reference: id, note: `${bank ? bank[1] : data.bank_code} ${String(data.account_number).slice(-4)}` });
    if (!ok) return json({ error: 'You no get reach that much for your winnings.', field: 'amount' }, 402);
    await env.DB.prepare('INSERT INTO withdrawals(id,user_id,amount_kobo,bank_name,bank_code,account_number,account_name) VALUES(?,?,?,?,?,?,?)').bind(id, user.id, kobo, bank ? bank[1] : null, String(data.bank_code), String(data.account_number), name).run();
    return json({ message: `Withdrawal of ${naira(kobo)} requested. We go pay am after a quick check.`, redirect: '/wallet' });
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
    return r.purpose === 'SPONSOR_FUND' ? '/sponsor?paid=1' : r.purpose?.startsWith('NEPO') ? '/me?nepo=1' : '/wallet?paid=1';
  } catch { return '/wallet?paid=0'; }
}

// Admin: pay or reject a withdrawal.
export async function processWithdrawal(env, admin, id, action, note) {
  const w = await env.DB.prepare('SELECT * FROM withdrawals WHERE id=?').bind(id).first();
  if (!w || w.status !== 'PENDING') return json({ error: 'Withdrawal not pending.' }, 409);
  if (action === 'reject') {
    await env.DB.prepare("UPDATE withdrawals SET status='REJECTED', admin_note=?, updated_at=? WHERE id=?").bind(note || null, nowIso(), id).run();
    await credit(env, w.user_id, w.amount_kobo, { balance: 'WINNINGS', type: 'WITHDRAW_REFUND', reference: id, note: 'Withdrawal rejected' });
    await notify(env, w.user_id, `Your withdrawal of ${naira(w.amount_kobo)} was not approved${note ? ': ' + note : ''}. The money is back in your winnings.`, '/wallet');
    return json({ message: 'Rejected and refunded' });
  }
  if (action === 'paid') {   // paid outside Paystack (manual bank transfer)
    await env.DB.prepare("UPDATE withdrawals SET status='PAID', admin_note=?, updated_at=? WHERE id=?").bind(note || 'Paid manually', nowIso(), id).run();
    await notify(env, w.user_id, `Your withdrawal of ${naira(w.amount_kobo)} has been paid.`, '/wallet');
    return json({ message: 'Marked as paid' });
  }
  if (action === 'transfer') {
    if (!paystackOn(env)) return json({ error: 'Paystack is not connected. Pay manually, then mark as paid.' }, 503);
    try {
      const rec = await ps(env, 'POST', '/transferrecipient', { type: 'nuban', name: w.account_name, account_number: w.account_number, bank_code: w.bank_code, currency: 'NGN' });
      const t = await ps(env, 'POST', '/transfer', { source: 'balance', amount: w.amount_kobo, recipient: rec.recipient_code, reason: 'Tap Am winnings', reference: w.id });
      await env.DB.prepare("UPDATE withdrawals SET status='PROCESSING', transfer_code=?, updated_at=? WHERE id=?").bind(t.transfer_code, nowIso(), id).run();
      return json({ message: 'Transfer started' });
    } catch (e) { return json({ error: 'Paystack: ' + e.message }, 502); }
  }
  return json({ error: 'Unknown action' }, 400);
}
