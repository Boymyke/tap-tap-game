// Bachs payment checks against the fake Bachs server (tests/fake-bachs.mjs) and a local worker started with
//   --var BACHS_SECRET_KEY:sk_sandbox_test --var BACHS_WEBHOOK_SECRET:whsec_test --var BACHS_API_BASE:http://127.0.0.1:8790
import crypto from 'node:crypto';
const BASE = process.env.BASE || 'http://127.0.0.1:8787', FAKE = 'http://127.0.0.1:8790', SECRET = 'whsec_test';
const AP = process.env.ADMIN_PATH || '/whotfareyou123456789';
const tag = Date.now().toString(36).slice(-5);
let fails = 0, passes = 0;
const ok = (c, m, x) => { if (c) { passes++; console.log('  ✓', m); } else { fails++; console.log('  ✗', m, x !== undefined ? JSON.stringify(x).slice(0, 300) : ''); } };
class Client {
  constructor(n) { this.name = n; this.cookie = ''; }
  async req(method, path, body, headers = {}) {
    const r = await fetch(BASE + path, { method, redirect: 'manual', headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(this.cookie ? { cookie: this.cookie } : {}), origin: BASE, ...headers }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
    const sc = r.headers.get('set-cookie'); if (sc) { const m = /nakam_session=([^;]*)/.exec(sc); if (m) this.cookie = m[1] ? 'nakam_session=' + m[1] : ''; }
    const text = await r.text(); let j = {}; try { j = JSON.parse(text); } catch {}
    return { status: r.status, j, text, location: r.headers.get('location') };
  }
  post(p, b = {}) { return this.req('POST', p, b); } get(p) { return this.req('GET', p); }
}
const fake = async (p, b) => (await fetch(FAKE + p, { method: b ? 'POST' : 'GET', headers: { 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined })).json();
const sign = (raw, ts = Math.floor(Date.now() / 1000)) => ({ 'x-bachs-timestamp': String(ts), 'x-bachs-signature': crypto.createHmac('sha256', SECRET).update(`${ts}.${raw}`).digest('hex') });
const hook = (type, data, ts) => { const raw = JSON.stringify({ id: 'evt_' + Math.random(), type, data }); return new Client('bachs').req('POST', '/api/bachs/webhook', raw, { 'content-type': 'application/json', origin: 'https://bachs.io', ...sign(raw, ts) }); };

const A = new Client('payer');
let r = await A.post('/api/signup', { nickname: 'pay' + tag, email: `pay${tag}@example.com`, password: 'Tapam2026x', gender: 'MALE', country: 'NG', agree: true });
ok(r.status === 200, 'sign up', r.j);
const bal = async () => (await A.get('/api/wallet')).j.wallet;
r = await A.post('/api/wallet/fund', { amount: '5,000', ack: true, adult: true });
ok(r.status === 200 && /^https:\/\/checkout\.bachs\.io\//.test(r.j.redirect || ''), 'fund goes to Bachs hosted checkout', r.j);
const s = (await fake('/test/last')).session;
ok(s && s.amount === '5000.00' && s.currency === 'NGN' && /^TA-/.test(s.reference), 'checkout made for ₦5,000.00 NGN with our reference', s);
r = await A.get(`/pay/callback/${s.reference}?checkout_id=${s.checkout_id}`);
ok(r.status === 302 && r.location.endsWith('/wallet?paid=wait'), 'return before paying: not credited', r.location);
r = await hook('collection.succeeded', { checkout_id: s.checkout_id, reference: s.reference, status: 'succeeded', amount: '5000.00', currency: 'NGN' });
ok(r.status === 200 && (await bal()).balance_kobo === 0, 'webhook for an unpaid checkout credits nothing (server checks with Bachs)', r.j);
const raw = JSON.stringify({ type: 'collection.succeeded', data: { reference: s.reference, checkout_id: s.checkout_id } });
r = await new Client('evil').req('POST', '/api/bachs/webhook', raw, { 'content-type': 'application/json', 'x-bachs-timestamp': String(Math.floor(Date.now() / 1000)), 'x-bachs-signature': 'deadbeef' });
ok(r.status === 401, 'forged webhook refused', r.status);
await fake('/test/pay/' + s.checkout_id, { amount: '50.00' });
r = await hook('collection.succeeded', { checkout_id: s.checkout_id, reference: s.reference });
ok((await bal()).balance_kobo === 0, 'paid less than asked: not credited', await bal());
await fake('/test/pay/' + s.checkout_id, { amount: '5000.00' });
r = await hook('collection.succeeded', { checkout_id: s.checkout_id, reference: s.reference }, Math.floor(Date.now() / 1000) - 900);
ok(r.status === 401 && (await bal()).balance_kobo === 0, 'old (replayed) webhook refused', r.status);
r = await hook('collection.succeeded', { checkout_id: s.checkout_id, reference: s.reference });
ok(r.status === 200 && (await bal()).balance_kobo === 500000, 'signed webhook + Bachs says paid: ₦5,000 credited', await bal());
await hook('collection.succeeded', { checkout_id: s.checkout_id, reference: s.reference });
r = await A.get(`/pay/callback/${s.reference}?checkout_id=${s.checkout_id}`);
ok(r.location?.endsWith('/wallet?paid=1') && (await bal()).balance_kobo === 500000, 'webhook again + return page: credited once only', { loc: r.location, bal: await bal() });
r = await A.post('/api/plans/subscribe', { tier: 'MAPO', plan: 'month', method: 'card' });
ok(r.status === 200 && /checkout\.bachs\.io/.test(r.j.redirect || ''), 'Mapo by card goes to Bachs', r.j);

console.log('Payouts');
const admin = new Client('admin');
r = await admin.post('/api/admin/login', { identifier: process.env.ADMIN_ID || 'bossadmin', password: process.env.ADMIN_PW || 'SuperSecret123' });
ok(r.status === 200, 'admin login', r.j);
const uid = (await admin.get(AP + '/users?q=pay' + tag)).text.match(new RegExp(AP.replace(/\//g, '\\/') + '\\/users\\/([0-9a-f-]{36})'))?.[1];
await admin.post(`/api/admin/users/${uid}/wallet`, { amount: '20,000', balance: 'WINNINGS', note: 'payout test' });
r = await A.post('/api/bank/resolve', { bank_code: '058', account_number: '0123456789' });
ok(r.j.account_name === 'BOLA TEST', 'account name looked up with Bachs', r.j);
r = await A.post('/api/withdraw', { amount: '10,000', bank_code: '999999', account_number: '0123456789', account_name: 'Bola Test' });
ok(r.status === 400 && r.j.field === 'bank_code', 'bank must be on the Bachs list', r.j);
r = await A.post('/api/withdraw', { amount: '10,000', bank_code: '090267', account_number: '0123456789', account_name: 'Bola Test' });
ok(r.status === 200, 'withdraw ₦10,000 to Kuda (Bachs bank code)', r.j);
const wid = (await admin.get(AP + '/withdrawals')).text.match(/\/api\/admin\/withdrawals\/([0-9a-f-]{36})\/transfer/)?.[1];
r = await admin.post(`/api/admin/withdrawals/${wid}/transfer`, {});
ok(r.status === 200, 'admin sends it through Bachs', r.j);
r = await admin.post(`/api/admin/withdrawals/${wid}/transfer`, {});
ok(r.status === 409, 'cannot send the same withdrawal twice', r.j);
const p = (await fake('/test/last')).payout;
ok(p && p.amount === '10000.00' && p.reference === wid, 'Bachs payout for ₦10,000.00 with our withdrawal id', p);
const before = (await bal()).winnings_kobo;
await fake('/test/payout/' + p.withdrawal_id, { status: 'failed' });
r = await hook('payout.failed', { withdrawal_id: p.withdrawal_id, reference: wid });
ok((await bal()).winnings_kobo === before + 1000000, 'failed payout: ₦10,000 back in winnings', { before, after: (await bal()).winnings_kobo });
await hook('payout.failed', { withdrawal_id: p.withdrawal_id, reference: wid });
ok((await bal()).winnings_kobo === before + 1000000, 'failed webhook twice: refunded once', (await bal()).winnings_kobo);
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
