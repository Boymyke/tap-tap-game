// End-to-end check against a running worker (local `npm run preview:dev` or the preview URL).
//   BASE=http://127.0.0.1:8787 SETUP_KEY=... node tests/e2e.mjs
// Needs OTP_DEV_MODE=1 and PAYMENTS_TEST_MODE=1 (codes and payments are simulated).
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const SETUP = process.env.SETUP_KEY || 'local-setup-key-123';
const tag = Date.now().toString(36).slice(-5);
let fails = 0, passes = 0;
const ok = (cond, msg, extra) => { if (cond) { passes++; console.log('  ✓', msg); } else { fails++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

class Client {
  constructor(name) { this.name = name; this.cookie = ''; }
  async req(method, path, body) {
    const r = await fetch(BASE + path, { method, redirect: 'manual', headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(this.cookie ? { cookie: this.cookie } : {}), origin: BASE }, body: body !== undefined ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie'); if (sc) { const m = /nakam_session=([^;]*)/.exec(sc); if (m) this.cookie = m[1] ? 'nakam_session=' + m[1] : ''; }
    const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch {}
    return { status: r.status, j: j || {}, text, location: r.headers.get('location'), type: r.headers.get('content-type') };
  }
  post(p, b = {}) { return this.req('POST', p, b); }
  get(p) { return this.req('GET', p); }
}
const BAD = /undefined|NaN|\[object Object\]|__NONCE__/;
async function page(c, path, { status = 200, contains = [] } = {}) {
  const r = await c.get(path);
  const bad = r.type?.includes('text/html') ? (r.text.replace(/<script[\s\S]*?<\/script>/g, '').match(BAD) || [])[0] : null;
  ok(r.status === status && !bad && contains.every(s => r.text.includes(s)), `${c.name} GET ${path} → ${r.status}${bad ? ' (found ' + bad + ')' : ''}`, contains.filter(s => !r.text.includes(s)));
  return r;
}
async function signup(name, extra = {}) {
  const c = new Client(name);
  const s = await c.post('/api/signup/start', { nickname: name, email: `${name}@example.com`, password: 'Tapam2026x', gender: 'FEMALE', country: 'NG', agree: true, ...extra });
  ok(s.status === 200 && s.j.testCode, `${name} sign-up start`, s.j);
  const v = await c.post('/api/signup/verify', { email: `${name}@example.com`, code: s.j.testCode });
  ok(v.status === 200 && c.cookie, `${name} verified + logged in`, v.j);
  return c;
}

console.log('Accounts');
const admin = new Client('admin');
const ADMIN_ID = process.env.ADMIN_ID || 'bossadmin', ADMIN_PW = process.env.ADMIN_PW || 'SuperSecret123';
let r = await admin.post('/api/setup-admin', { setupKey: SETUP, username: ADMIN_ID, email: `${ADMIN_ID}@example.com`, password: ADMIN_PW });
if (r.status === 409) { r = await admin.post('/api/admin/login', { identifier: ADMIN_ID, password: ADMIN_PW }); }
ok(admin.cookie, 'admin session', r.j);
const bad1 = await new Client('x').post('/api/signup/start', { nickname: 'nodob' + tag, email: `nodob${tag}@example.com`, password: 'Tapam2026x', agree: true, country: 'NG' });
ok(bad1.status === 400 && bad1.j.field === 'gender', 'sign-up needs gender', bad1.j);
const A = await signup('ada' + tag);
const B = await signup('bola' + tag, { ref: '' });
const meA = await A.get('/api/me');
const refCode = (await A.get('/invite')).text.match(/signup\?ref=([A-Z0-9]+)/)?.[1];
ok(!!refCode, 'referral code on the invite page', refCode);
const C = await signup('chi' + tag, { ref: refCode, gender: 'MALE' });
const S = await signup('brand' + tag, { accountType: 'SPONSOR', company: 'Chop Life ' + tag });
const usersA = await admin.get('/admin/users?q=ada' + tag);
const aId = usersA.text.match(/\/admin\/users\/([0-9a-f-]{36})/)?.[1];
const bId = (await admin.get('/admin/users?q=bola' + tag)).text.match(/\/admin\/users\/([0-9a-f-]{36})/)?.[1];
const sId = (await admin.get('/admin/users?q=brand' + tag)).text.match(/\/admin\/users\/([0-9a-f-]{36})/)?.[1];
ok(aId && bId && sId, 'admin finds users');

console.log('Pages (Lapo)');
for (const p of ['/dashboard', '/pools', '/pools?scope=live', '/store', '/store?tab=SKIN', '/bag', '/wallet', '/me', '/settings', '/notifications', '/plans', '/ranks', '/top', '/top?p=ALL', '/suggest-pool', '/rules', '/fair-play', '/prizes', '/account-rules', '/terms', '/privacy', '/consent', '/how-to-play', '/faq']) await page(A, p);
await page(A, '/pools/new', { status: 302 });
await page(A, '/calc', { status: 302 });
await page(new Client('anon'), '/', { contains: ['TAP AM', 'Tap amm make you chop big moneyyy', 'Teach me', 'lp-video', 'poster-m.webp'] });
r = await new Client('anon').get('/'); ok(!/Demo<|Mama Put Kitchen/.test(r.text), 'no demo pools on the landing page');
await page(new Client('anon'), '/plans', { contains: ['Mapo baby'] });
await page(new Client('anon'), '/ranks', { contains: ['JJC'] });

console.log('Tiers and gates');
r = await A.post('/api/pools', { name: 'Lapo try', starts_at: new Date(Date.now() + 60000).toISOString(), ends_at: new Date(Date.now() + 120000).toISOString(), ack: true });
ok(r.status === 403 && r.j.code === 'UPGRADE', 'Lapo cannot create pools (upgrade)', r.j);
r = await A.post('/api/prefs', { theme: 'ocean' });
ok(r.status === 403 && r.j.code === 'UPGRADE', 'Lapo cannot pick a theme', r.j);
r = await A.post('/api/wallet/fund', { amount: '50,000', ack: true });
ok(r.status === 403 && r.j.code === 'ADULT', 'money needs 18+ confirmation', r.j);
r = await A.post('/api/wallet/fund', { amount: '50,000', ack: true, adult: true });
ok(r.status === 200, 'fund ₦50,000 with commas', r.j);
r = await A.post('/api/plans/subscribe', { tier: 'MAPO', plan: 'month', method: 'wallet' });
ok(r.status === 200, 'A buys Mapo from wallet', r.j);
r = await admin.post(`/api/admin/users/${aId}/tier`, { tier: 'NEPO', plan: 'month' });
ok(r.status === 200, 'admin upgrades A Mapo → Nepo', r.j);
r = await A.post('/api/prefs', { theme: 'ocean' });
ok(r.status === 200, 'Nepo picks theme', r.j);
r = await A.post('/api/prefs', { bg: 'bg-sunset' });
ok(r.status === 200, 'Nepo picks background', r.j);
r = await A.post('/api/prefs', { sound: 'gong' });
ok(r.status === 400, 'unknown sound rejected', r.j);
r = await A.post('/api/prefs', { sound: 'bell' });
ok(r.status === 403, 'rank-locked sound rejected', r.j);
r = await A.post('/api/prefs', { sound: 'drum' });
ok(r.status === 200, 'Nepo picks drum sound', r.j);

console.log('Tap area + pool length');
r = await B.post('/api/prefs', { padColor: '#123456' }); ok(r.status === 403 && r.j.code === 'UPGRADE', 'Lapo cannot change tap area colour', r.j);
r = await A.post('/api/prefs', { padColor: '#123456', padPattern: 'waves' }); ok(r.status === 200, 'Nepo sets tap area colour + owned pattern', r.j);
r = await A.post('/api/prefs', { padPattern: 'leopard' }); ok(r.status === 403 && r.j.field === 'padPattern', 'pattern from a skin you do not own is refused', r.j);
r = await A.post('/api/prefs', { padPattern: 'nonsense' }); ok(r.status === 400, 'unknown pattern refused', r.j);
await page(A, '/bag', { contains: ['Your tap area', 'data-bag-filter', '#123456'] });
r = await A.post('/api/pools', { name: 'Too short ' + tag, starts_at: new Date(Date.now() + 60000).toISOString(), ends_at: new Date(Date.now() + 90000).toISOString(), ack: true });
ok(r.status === 400 && r.j.field === 'ends_at' && /60 seconds/.test(r.j.error), 'pools run at least 60 seconds', r.j);
r = await A.post('/api/pools', { name: 'Pad pool ' + tag, starts_at: new Date(Date.now() + 600000).toISOString(), ends_at: new Date(Date.now() + 1200000).toISOString(), ack: true, custom_pad: true, theme_color: '#FF4FA3', pad_pattern: 'flowers', allow_own_pad: false });
ok(r.status === 200, 'Nepo creates a pool with its own tap area', r.j);
await page(A, '/pools/new', { contains: ['custom_pad', 'pad_pattern'] });
await page(A, '/dashboard', { contains: ['--bg-a:#1E7BFF'] });
await page(A, '/calc');

console.log('Store');
r = await A.post('/api/store/buy', { item: 'booster-2x', qty: 30 });
ok(r.status === 200 && r.j.owned >= 30, 'buy 30 boosters at once', r.j);
r = await B.post('/api/store/buy', { item: 'booster-8x', qty: 1 });
ok(r.status === 403 && r.j.code === 'UPGRADE', 'Lapo blocked from Nepo booster', r.j);
r = await A.post('/api/store/buy', { item: 'booster-10x', qty: 1 });
ok(r.status === 403 && r.j.need === 'RANK', 'rank-locked booster', r.j);

console.log('VS paid pool');
const start = new Date(Date.now() + 4000).toISOString(), end = new Date(Date.now() + 66000).toISOString();
r = await A.post('/api/pools', { name: 'Jollof War ' + tag, kind: 'PAID', entry_fee: '1,000', prize: '2,000', starts_at: start, ends_at: end, audience: 'ALL', game_type: 'MATCH', side_a: 'Jollof', side_b: 'Fried rice', winners: 2, split_style: 'TOP', tie_rule: 'FIRST', max_players: '', boosters_allowed: true, ack: true, theme_color: '#FF4FA3', bg_color: '#123456' });
ok(r.status === 200 && r.j.id, 'Nepo creates paid VS pool (2 winners/side)', r.j);
const poolId = r.j.id, code = r.j.code;
r = await B.post('/api/pools/find', { code });
ok(r.j.redirect === '/pool/' + poolId, 'find pool by code');
await page(B, '/pool/' + poolId, { contains: ['Pool instructions', code, 'Copy'] });
r = await B.post(`/api/pools/${poolId}/join`, { side: 'Fried rice' });
ok(r.status === 403 && r.j.code === 'ADULT', 'B join needs adult confirm', r.j);
r = await B.post(`/api/pools/${poolId}/join`, { side: 'Fried rice', adult: true });
ok(r.status === 402 && r.j.code === 'FUNDS', 'B join needs funds (with hint)', r.j);
await B.post('/api/wallet/fund', { amount: 5000, ack: true });
r = await B.post(`/api/pools/${poolId}/join`, { side: 'Fried rice' });
ok(r.status === 200, 'B joins Fried rice', r.j);
await C.post('/api/wallet/fund', { amount: 5000, ack: true, adult: true });
r = await C.post(`/api/pools/${poolId}/join`, { side: 'Fried rice' });
ok(r.status === 200, 'C joins Fried rice', r.j);
r = await A.post(`/api/pools/${poolId}/join`, { side: 'Jollof' });
ok(r.status === 200, 'A joins Jollof', r.j);
// a second, free pool for multi-pool tapping
r = await admin.post('/api/pools', { name: 'Free for all ' + tag, kind: 'FREE', starts_at: start, ends_at: end, winners: 1, ack: true });
const freeId = r.j.id; ok(!!freeId, 'admin creates free pool', r.j);
await A.post(`/api/pools/${freeId}/join`, {}); await B.post(`/api/pools/${freeId}/join`, {});
await page(A, `/play?pools=${poolId},${freeId}`, { contains: ['game-data'] });
await sleep(4500);
r = await B.post('/api/tap', { pools: [poolId, freeId], taps: 5 });
ok(r.status === 403 && r.j.code === 'UPGRADE', 'Lapo cannot tap 2 pools at once', r.j);
r = await A.post(`/api/pools/${poolId}/boost`, { item: 'booster-2x' });
ok(r.status === 200 && r.j.mult === 2, 'A boost 1 (2×)', r.j);
await sleep(1300);
r = await A.post(`/api/pools/${poolId}/boost`, { item: 'booster-2x' });
ok(r.status === 200 && r.j.queued === 1, 'A boost 2 queued behind the first', r.j);
r = await A.post(`/api/pools/${poolId}/boost`, { item: 'booster-2x' });
ok(r.status === 429, 'boost spam blocked', r.j);
let aTotal = 0, bTotal = 0;
for (let i = 0; i < 8; i++) {
  const ra = await A.post('/api/tap', { pools: [poolId, freeId], taps: 12 });
  if (i === 0) ok(ra.status === 200 && ra.j.results[poolId].mult === 2, 'A taps in 2 pools, boosted', ra.j);
  const rb = await B.post('/api/tap', { pools: [poolId], taps: 6 });
  const rc = await C.post('/api/tap', { pools: [poolId], taps: 4 });
  aTotal = ra.j.results?.[poolId]?.score; bTotal = rb.j.results?.[poolId]?.score;
  await sleep(450);
}
r = await B.post('/api/tap', { pools: [poolId], taps: 200 });
ok(r.j.results[poolId].rejected > 0, 'Lapo speed cap drops extra taps', r.j.results[poolId]);
r = await A.get(`/api/pools/${poolId}/board?n=10`);
ok(r.j.top?.length === 3 && r.j.teams?.Jollof > 0, 'live board + teams', r.j);
r = await A.get('/api/calc?rate=8');
ok(r.status === 200 && Array.isArray(r.j.pools), 'calculator works for Nepo', r.j);
console.log('  … waiting for the pool to end');
await sleep(Math.max(0, Date.parse(end) - Date.now() + 2500));
r = await admin.post(`/api/admin/pools/${poolId}/settle`, {});
ok(r.status === 200, 'settled', r.j);
await page(A, '/pool/' + poolId, { contains: ['Final board'] });
const wA = (await A.get('/api/wallet')).j.wallet, wB = (await B.get('/api/wallet')).j.wallet, wC = (await C.get('/api/wallet')).j.wallet;
// pot: fees Jollof 1000, Fried rice 2000, seed 2000 → Jollof 1000+1000=2000, Fried rice 2000+1000=3000 (kobo ×100)
ok(wA.winnings_kobo === 200000, 'Jollof side pot ₦2,000 to its only player', wA);
ok(wB.winnings_kobo + wC.winnings_kobo === 300000 && wB.winnings_kobo > wC.winnings_kobo, 'Fried rice pot ₦3,000 split top-heavy between 2 winners', { b: wB.winnings_kobo, c: wC.winnings_kobo });
await page(A, '/top', { contains: ['ada' + tag] });

console.log('Withdrawals');
await admin.post(`/api/admin/users/${bId}/wallet`, { amount: '20,000', balance: 'WINNINGS', note: 'test top-up' });
r = await B.post('/api/withdraw', { amount: '10,000', bank_code: '058', account_number: '0123456789', account_name: 'Bola Test' });
ok(r.status === 200, 'B withdraws ₦10,000', r.j);
const wd = (await admin.get('/admin/withdrawals')).text.match(/\/api\/admin\/withdrawals\/([0-9a-f-]{36})\/reject/)?.[1];
r = await admin.post(`/api/admin/withdrawals/${wd}/reject`, {}); ok(r.status === 400 && r.j.field === 'note', 'payout reject needs a reason', r.j);
r = await admin.post(`/api/admin/withdrawals/${wd}/reject`, { note: 'Wrong account name' }); ok(r.status === 200, 'payout rejected with a reason', r.j);
await page(B, '/wallet', { contains: ['Reason: Wrong account name'] });
r = await B.post('/api/withdraw', { amount: '10,000', bank_code: '058', account_number: '0123456789', account_name: 'Bola Test' });
ok(r.status === 200, 'rejected one does not count toward the daily limit', r.j);
await admin.post(`/api/admin/withdrawals/${(await admin.get('/admin/withdrawals')).text.match(/\/api\/admin\/withdrawals\/([0-9a-f-]{36})\/paid/)?.[1]}/paid`, {});
r = await B.post('/api/withdraw', { amount: '10,000', bank_code: '058', account_number: '0123456789', account_name: 'Bola Test' });
ok(r.status === 429, 'one withdrawal a day', r.j);
const cId = (await admin.get('/admin/users?q=chi' + tag)).text.match(/\/admin\/users\/([0-9a-f-]{36})/)?.[1];
await admin.post(`/api/admin/users/${cId}/wallet`, { amount: '50,000', balance: 'WINNINGS', note: 'race test' });
const cBefore = (await C.get('/api/wallet')).j.wallet.winnings_kobo;
const race = await Promise.all(Array.from({ length: 5 }, () => C.post('/api/withdraw', { amount: '10,000', bank_code: '058', account_number: '0123456789', account_name: 'Chi Test', adult: true })));
const cAfter = (await C.get('/api/wallet')).j.wallet.winnings_kobo;
ok(race.filter(x => x.status === 200).length === 1 && cBefore - cAfter === 1000000, '5 parallel withdrawals: exactly one goes through, money taken once', { statuses: race.map(x => x.status), cBefore, cAfter });
r = await A.get('/wallet/history.csv');
ok(r.status === 200 && r.type.includes('text/csv') && r.text.includes('Pool entry'), 'history CSV download');
await page(A, '/wallet?page=2');
r = await admin.get('/admin/withdrawals.csv?all=1');
ok(r.status === 200 && r.text.includes('Bola Test'), 'payouts CSV');

console.log('Sponsor');
r = await S.post('/api/promos', { title: 'No length ' + tag, kind: 'YOUTUBE', video_url: 'https://youtu.be/dQw4w9WgXcQ' }); ok(r.status === 400 && r.j.field === 'duration_seconds', 'ad needs a length', r.j);
r = await S.post('/api/promos', { title: 'Odd length ' + tag, kind: 'YOUTUBE', video_url: 'https://youtu.be/dQw4w9WgXcQ', duration_seconds: '7' }); ok(r.status === 400, 'ad length must be 5, 10 or 30', r.j);
await page(S, '/sponsor/ads', { contains: ['Ad guidelines', 'duration_seconds'] });
r = await S.post('/api/promos', { title: 'Cold drinks ' + tag, kind: 'YOUTUBE', video_url: 'https://youtu.be/dQw4w9WgXcQ', target_url: 'https://example.com', duration_seconds: '10' });
ok(r.status === 200, 'sponsor creates YouTube ad', r.j);
let adPage = await S.get('/sponsor/ads'); const adId = adPage.text.match(/data-preview-ad="([0-9a-f-]{36})"/)?.[1];
r = await S.get('/api/promo?preview=' + adId); ok(r.j.promo?.preview, 'sponsor previews own ad', r.j);
r = await A.get('/api/promo?preview=' + adId); ok(!r.j.promo, 'players cannot preview others’ ads');
r = await S.post('/api/pools', { name: 'Brand pool ' + tag, prize: '5,000', with_ad: 'YES', promo_id: adId, starts_at: new Date(Date.now() + 60000).toISOString(), ends_at: new Date(Date.now() + 3600000).toISOString(), ack: true });
ok(r.status === 400 && r.j.field === 'promo_id', 'pool with unapproved ad refused', r.j);
await page(admin, '/admin/ads', { contains: ['Cold drinks ' + tag] });
r = await admin.post(`/api/admin/promos/${adId}/approve`, {}); ok(r.status === 200, 'admin approves ad');
await S.post('/api/wallet/fund', { amount: 20000, ack: true });
r = await S.post('/api/pools', { name: 'Brand pool ' + tag, prize: '5,000', with_ad: 'YES', promo_id: adId, starts_at: new Date(Date.now() + 60000).toISOString(), ends_at: new Date(Date.now() + 3600000).toISOString(), ack: true, theme_color: '#00C957', bg_color: '#002211' });
ok(r.status === 200, 'sponsor creates pool with ad + colours', r.j);
const brandPool = r.j.id;
await A.post(`/api/pools/${brandPool}/join`, {});
r = await A.get('/api/promo?at=PRE&pool=' + brandPool); ok(r.j.promo?.id === adId && r.j.promo.lead_capture === 0 && r.j.promo.duration_seconds === 10, 'pool shows its own ad (10 seconds)', r.j);
r = await admin.post(`/api/admin/sponsors/${sId}/leads`, { on: true }); ok(r.status === 200, 'admin turns on lead capture');
r = await A.post('/api/leads', { promo: adId, name: 'Ada', email: 'ada@example.com', consent: false }); ok(r.status === 400 && r.j.field === 'consent', 'lead needs consent');
r = await A.post('/api/leads', { promo: adId, name: 'Ada', email: 'ada@example.com', phone: '08012345678', consent: true }); ok(r.status === 200, 'lead sent with consent', r.j);
r = await S.get('/sponsor/leads.csv'); ok(r.text.includes('ada@example.com'), 'sponsor downloads leads CSV');
r = await S.post(`/api/promos/${adId}/home`, { subtitle: 'Cold one dey' }); ok(r.status === 200, 'sponsor asks for home slot', r.j);
const slideId = (await admin.get('/admin/slides')).text.match(/\/api\/admin\/slides\/([0-9a-z-]+)\/approve/)?.[1];
r = await admin.post(`/api/admin/slides/${slideId}/approve`, {}); ok(r.status === 200, 'admin approves slide');
await page(A, '/dashboard', { contains: ['Cold drinks ' + tag, 'Sponsored pools'] });
for (const p of ['/sponsor', '/sponsor/pools', '/sponsor/ads', '/sponsor/leads', '/wallet']) await page(S, p);

console.log('Admin');
for (const p of ['/admin', '/admin/health', '/admin/users', `/admin/users/${aId}`, '/admin/gifts', '/admin/pools?scope=ended', '/admin/store', '/admin/store?edit=booster-2x', '/admin/ranks', '/admin/ads', '/admin/slides', '/admin/backgrounds', '/admin/withdrawals', '/admin/suggestions', '/pools/new']) await page(admin, p);
r = await admin.post('/api/admin/gift-bulk', { item: 'booster-2x', qty: 2, to: 'LAPO' }); ok(r.status === 400 && r.j.count > 0, 'bulk gift asks to confirm with count', r.j);
r = await admin.post('/api/admin/gift-bulk', { item: 'booster-2x', qty: 2, to: 'LIST', names: `bola${tag}, chi${tag}`, confirm: true }); ok(r.status === 200 && /2 players/.test(r.j.message), 'bulk gift to a list', r.j);
r = await admin.post('/api/admin/backgrounds', { name: 'Test bg', color_a: '#112233', color_b: '#445566', style: 'DOTS' }); ok(r.status === 200, 'admin adds background');
r = await admin.post('/api/admin/settings', { tap_limits_on: true, tap_limit_daily: '5', auto_payouts: false, alert_email: 'ops@example.com' }); ok(r.status === 200, 'settings: tap limits on');
r = await admin.post('/api/admin/ranks', { level: 101, name: 'Nepo King', min_taps: '1,000,000' }); ok(r.status === 400, 'rank names cannot use tier names', r.j);
r = await admin.post('/api/admin/health/test-email', {}); ok(r.status === 200, 'test alert', r.j);
await admin.post('/api/admin/settings', { tap_limits_on: false });

console.log('Admin extras');
r = await S.post('/api/promos', { title: 'Bad ad ' + tag, kind: 'YOUTUBE', video_url: 'https://youtu.be/dQw4w9WgXcQ', duration_seconds: '5' }); ok(r.status === 200, 'sponsor posts a second ad');
const badId = (await S.get('/sponsor/ads')).text.match(new RegExp('Bad ad ' + tag + '[\\s\\S]*?data-preview-ad="([0-9a-f-]{36})"'))?.[1];
r = await admin.post(`/api/admin/promos/${badId}/reject`, {}); ok(r.status === 400 && r.j.field === 'reason', 'ad reject needs a reason', r.j);
r = await admin.post(`/api/admin/promos/${badId}/reject`, { reason: 'Picture too blurry' }); ok(r.status === 200, 'admin rejects ad with a reason', r.j);
await page(S, '/sponsor/ads', { contains: ['Picture too blurry', 'Rejected'] });
await page(admin, '/admin/ads', { contains: ['Rejected (1)'] });
r = await admin.post(`/api/admin/promos/${badId}/delete`, {}); ok(r.status === 200, 'admin deletes an ad', r.j);
r = await admin.post('/api/admin/slides', { mode: 'IMAGE', title: 'Pic slide' }); ok(r.status === 400 && r.j.field === 'image_url', 'picture slide needs a picture', r.j);
r = await admin.post('/api/admin/slides', { mode: 'COLOR', title: 'Colour slide ' + tag, subtitle: 'Big Friday', color: '#FF8A2A', cta: 'Enter now', link: '/pools' }); ok(r.status === 200, 'admin adds colour slide with button text', r.j);
await page(A, '/dashboard', { contains: ['Colour slide ' + tag, 'Enter now'] });
r = await admin.post('/api/admin/merch', { name: 'Tee ' + tag, description: 'Green AM print', price: '8,500', status: 'BUY', link: 'https://example.com/tee' }); ok(r.status === 200, 'admin uploads merch', r.j);
await page(new Client('anon'), '/merch', { contains: ['Tee ' + tag, 'Buy now', '₦8,500'] });
r = await admin.post('/api/admin/badges', { name: 'Founder ' + tag, label: 'FD', meaning: 'Here from day one', color: '#FF4FA3' }); ok(r.status === 200, 'admin makes a special badge', r.j);
const badgeId = (await admin.get('/admin/badges')).text.match(/\/api\/admin\/badges\/([a-z0-9-]+)\/give/)?.[1];
r = await admin.post(`/api/admin/badges/${badgeId}/give`, { username: 'ada' + tag }); ok(r.status === 200, 'admin gives the badge', r.j);
r = await admin.post(`/api/admin/badges/${badgeId}/give`, { username: 'ada' + tag }); ok(r.status === 409, 'cannot give the same badge twice', r.j);
await page(A, '/me', { contains: ['Founder ' + tag, 'Here from day one', 'Your taps'] });
await page(A, '/me?y=2026&m=01', { contains: ['Jan 2026'] });
r = await admin.post(`/api/admin/users/${aId}/emoji`, { emoji: 'AB', meaning: 'x' }); ok(r.status === 400 && r.j.field === 'emoji', 'name emoji must be an emoji', r.j);
r = await admin.post(`/api/admin/users/${aId}/emoji`, { emoji: '🔥🔥', meaning: 'Hot finger' }); ok(r.status === 400, 'only one emoji', r.j);
r = await admin.post(`/api/admin/users/${aId}/emoji`, { emoji: '🔥', meaning: '' }); ok(r.status === 400 && r.j.field === 'meaning', 'emoji needs a meaning', r.j);
r = await admin.post(`/api/admin/users/${aId}/emoji`, { emoji: '🔥', meaning: 'Hottest finger in Lagos' }); ok(r.status === 200, 'admin gives a name emoji', r.j);
await page(A, '/me', { contains: ['data-emoji-meaning="Hottest finger in Lagos"'] });
r = await B.get(`/api/pools/${brandPool}/board?n=10`);
const aRow = (r.j.top || []).find(x => x.n === 'ada' + tag);
ok(!r.text.includes('Hottest finger') && (!aRow || aRow.e === '🔥'), 'other players see the emoji, not its meaning', aRow);
await page(S, '/invite', { contains: ['signup?ref=', 'Invite people'] });
for (const p of ['/admin/merch', '/admin/badges', '/admin/slides', '/admin/withdrawals']) await page(admin, p);

console.log('Suggest + archive');
r = await B.post('/api/suggest-pool', { name: 'Lagos vs Abuja', type: 'VS', idea: 'Big Friday battle', sides: 'Lagos vs Abuja' }); ok(r.status === 200, 'suggest a pool');
await page(admin, '/admin/suggestions', { contains: ['Lagos vs Abuja'] });
r = await C.post('/api/account/archive', { password: 'wrong', confirm: true }); ok(r.status === 403, 'archive needs password');
r = await C.post('/api/account/archive', { password: 'Tapam2026x', confirm: true }); ok(r.status === 200, 'archive account', r.j);
r = await C.get('/dashboard'); ok(r.status === 302, 'archived user logged out');
r = await C.post('/api/login', { identifier: 'chi' + tag, password: 'Tapam2026x' }); ok(r.status === 200 && r.j.restored, 'login restores archived account', r.j);

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
