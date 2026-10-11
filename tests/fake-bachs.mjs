// A tiny fake Bachs API for local tests: node tests/fake-bachs.mjs (port 8790).
import http from 'node:http';
const sessions = {}, payouts = {};
let n = 0;
const u0 = x => new URL(x, 'http://x').pathname;
const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
http.createServer((req, res) => {
  let body = ''; req.on('data', c => body += c); req.on('end', () => {
    if (!u0(req.url).startsWith('/test/') && req.headers.authorization !== 'Bearer sk_sandbox_test') return send(res, 401, { detail: 'bad key', error_code: 'UNAUTHORIZED' });
    const j = body ? JSON.parse(body) : {};
    const u = new URL(req.url, 'http://x');
    if (req.method === 'POST' && u.pathname === '/v1/checkout-sessions') {
      const id = 'chk_' + (++n);
      sessions[id] = { checkout_id: id, status: 'OPEN', payment_status: null, amount: j.pricing.amount, currency: j.pricing.currency, reference: j.reference };
      return send(res, 201, { checkout_id: id, checkout_url: 'https://checkout.bachs.io/c/' + id, status: 'OPEN', amount: j.pricing.amount, currency: 'NGN' });
    }
    let m;
    if (req.method === 'GET' && (m = /^\/v1\/checkout-sessions\/(.+)$/.exec(u.pathname))) return sessions[m[1]] ? send(res, 200, sessions[m[1]]) : send(res, 404, { detail: 'nope' });
    if (req.method === 'POST' && (m = /^\/test\/pay\/(.+)$/.exec(u.pathname))) { Object.assign(sessions[m[1]], { status: 'COMPLETED', payment_status: 'succeeded' }, j); return send(res, 200, sessions[m[1]]); }
    if (req.method === 'GET' && u.pathname === '/v1/payouts/banks') return send(res, 200, { status: true, data: [{ name: 'GTBank', code: '058', country: 'NG' }, { name: 'Kuda', code: '090267', country: 'NG' }] });
    if (req.method === 'POST' && u.pathname === '/v1/payouts/resolve-account') return send(res, 200, { status: true, data: { account_name: 'BOLA TEST', account_number: j.account_number, bank_code: j.bank_code } });
    if (req.method === 'POST' && u.pathname === '/v1/payouts/withdrawals') {
      const key = req.headers['idempotency-key'];
      const ex = Object.values(payouts).find(p => p.key === key);
      if (ex) return send(res, 200, { withdrawal_id: ex.withdrawal_id, status: ex.status });
      const id = 'wd_' + (++n); payouts[id] = { withdrawal_id: id, key, status: 'processing', amount: j.amount, reference: j.reference };
      return send(res, 201, { withdrawal_id: id, status: 'processing' });
    }
    if (req.method === 'POST' && (m = /^\/test\/payout\/(.+)$/.exec(u.pathname))) { payouts[m[1]].status = j.status; return send(res, 200, payouts[m[1]]); }
    if (req.method === 'GET' && (m = /^\/v1\/payouts\/(wd_.+)$/.exec(u.pathname))) return payouts[m[1]] ? send(res, 200, payouts[m[1]]) : send(res, 404, {});
    if (u.pathname === '/test/last') return send(res, 200, { session: Object.values(sessions).pop(), payout: Object.values(payouts).pop() });
    send(res, 404, { detail: 'unknown ' + req.method + ' ' + u.pathname });
  });
}).listen(8790, '127.0.0.1', () => console.log('fake bachs on 8790'));
