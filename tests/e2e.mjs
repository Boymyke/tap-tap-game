// End-to-end check against a running worker (local `npm run preview:dev` or the preview URL).
//   BASE=http://127.0.0.1:8787 SETUP_KEY=... node tests/e2e.mjs
// Needs OTP_DEV_MODE=1 and PAYMENTS_TEST_MODE=1 (codes and payments are simulated).
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const SETUP = process.env.SETUP_KEY || 'local-setup-key-123';
const AP = process.env.ADMIN_PATH || '/whotfareyou123456789';   // hidden super admin address
const USERS_RE = new RegExp(AP.replace(/[/]/g, '\\/') + '\\/users\\/([0-9a-f-]{36})');
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
async function page(c, path, { status = 200, contains = [], absent = [] } = {}) {
  const r = await c.get(path);
  const bad = r.type?.includes('text/html') ? (r.text.replace(/<script[\s\S]*?<\/script>/g, '').match(BAD) || [])[0] : null;
  ok(r.status === status && !bad && contains.every(s => r.text.includes(s)) && absent.every(s => !r.text.includes(s)), `${c.name} GET ${path} → ${r.status}${bad ? ' (found ' + bad + ')' : ''}`, [...contains.filter(s => !r.text.includes(s)), ...absent.filter(s => r.text.includes(s)).map(s => 'present: ' + s)]);
  return r;
}
async function signup(name, extra = {}) {
  const c = new Client(name);
  const st = await c.post('/api/signup/start', { nickname: name, email: `${name}@example.com`, password: 'Tapam2026x', whatsapp: '0803' + String(Math.floor(Math.random() * 1e7)).padStart(7, '0'), gender: 'FEMALE', country: 'NG', agree: true, ...extra });
  ok(st.status === 200 && st.j.step === 'verify' && /^\d{6}$/.test(st.j.testCode || '') && !c.cookie, `${name} gets an email code (no account yet)`, st.j);
  const s = await c.post('/api/signup/verify', { email: `${name}@example.com`, code: st.j.testCode });
  ok(s.status === 200 && c.cookie && String(s.j.phrase || '').split(' ').length === 12, `${name} confirms the code and gets a 12-word recovery phrase`, s.j);
  c.phrase = s.j.phrase;
  return c;
}

console.log('Accounts');
const admin = new Client('admin');
const ADMIN_ID = process.env.ADMIN_ID || 'bossadmin', ADMIN_PW = process.env.ADMIN_PW || 'SuperSecret123';
let r = await admin.post('/api/setup-admin', { setupKey: SETUP, username: ADMIN_ID, email: `${ADMIN_ID}@example.com`, password: ADMIN_PW });
if (r.status === 409) { r = await admin.post('/api/admin/login', { identifier: ADMIN_ID, password: ADMIN_PW }); }
ok(admin.cookie, 'admin session', r.j);
await admin.post('/api/admin/settings', { lapo_pools_per_day: 3, marketing_emails: true });   // these tests cover pool email blasts (needs marketing email on)
const bad1 = await new Client('x').post('/api/signup', { nickname: 'nodob' + tag, email: `nodob${tag}@example.com`, password: 'Tapam2026x', whatsapp: '08031234567', agree: true, country: 'NG' });
ok(bad1.status === 400 && bad1.j.field === 'gender', 'sign-up needs gender', bad1.j);
const A = await signup('ada' + tag);
const B = await signup('bola' + tag, { ref: '' });
const meA = await A.get('/api/me');
const refCode = (await A.get('/invite')).text.match(/signup\?ref=([A-Z0-9]+)/)?.[1];
ok(!!refCode, 'referral code on the invite page', refCode);
const C = await signup('chi' + tag, { ref: refCode, gender: 'MALE' });
const S = await signup('brand' + tag, { accountType: 'SPONSOR', company: 'Chop Life ' + tag });
const usersA = await admin.get(AP + '/users?q=ada' + tag);
const aId = usersA.text.match(USERS_RE)?.[1];
const bId = (await admin.get(AP + '/users?q=bola' + tag)).text.match(USERS_RE)?.[1];
const sId = (await admin.get(AP + '/users?q=brand' + tag)).text.match(USERS_RE)?.[1];
ok(aId && bId && sId, 'admin finds users');

console.log('Pages (Lapo)');
for (const p of ['/dashboard', '/pools', '/pools?scope=live', '/store', '/store?tab=SKIN', '/bag', '/wallet', '/me', '/settings', '/notifications', '/plans', '/ranks', '/top', '/top?p=ALL', '/suggest-pool', '/rules', '/fair-play', '/prizes', '/account-rules', '/terms', '/privacy', '/consent', '/how-to-play', '/faq']) await page(A, p);
await page(A, '/pools/new', { contains: ['lapo_rules', 'pools a day'] });
await page(A, '/calc', { status: 302 });
await page(new Client('anon'), '/', { contains: ['TAP AM', 'Tap amm make you chop big <span class="money">moneyyy</span>', 'Teach me', 'data-teach', 'data-winners', 'lp-video', 'poster-m.webp'] });
r = await new Client('anon').get('/'); ok(!/>Demo</.test(r.text) && /lp-pool|Prize/.test(r.text), 'landing pools (samples fill empty slots), no demo label');
await page(new Client('anon'), '/signup', { contains: ['data-winners'] });
r = await new Client('anon').get('/api/winners'); ok(r.status === 200 && Array.isArray(r.j.winners), 'recent winners feed', r.j);
await page(new Client('anon'), '/plans', { contains: ['Mapo baby'] });
await page(new Client('anon'), '/ranks', { contains: ['JJC'] });

console.log('Tiers and gates');
for (let i = 1; i <= 3; i++) {
  r = await B.post('/api/pools', { name: 'Lapo try ' + i, starts_at: new Date(Date.now() + 600000).toISOString(), duration: '900', ack: true, theme_color: '#FF0000', bg_color: '#00FF00', pad_pattern: 'flowers', custom_pad: true, lapo_rules: i === 1 });
  ok(r.status === 200, `Lapo creates pool ${i} of 3 today`, r.j);
  if (i === 1) { const pl = await B.get('/pool/' + r.j.id); ok(!pl.text.includes('#FF0000') && !pl.text.includes('#00FF00') && pl.text.includes('Lapo rules'), 'players cannot set pool colours; Lapo rules shown', null); }
}
r = await B.post('/api/pools', { name: 'Lapo try 4', starts_at: new Date(Date.now() + 600000).toISOString(), duration: '900', ack: true });
ok(r.status === 403 && r.j.code === 'UPGRADE', 'Lapo blocked after 3 pools a day', r.j);
r = await A.post('/api/prefs', { theme: 'ocean' });
ok(r.status === 403, 'app themes switched off', r.j);
r = await A.post('/api/wallet/fund', { amount: '50,000', ack: true });
ok(r.status === 403 && r.j.code === 'ADULT', 'money needs 18+ confirmation', r.j);
r = await A.post('/api/wallet/fund', { amount: '50,000', ack: true, adult: true });
ok(r.status === 200, 'fund ₦50,000 with commas', r.j);
r = await A.post('/api/plans/subscribe', { tier: 'MAPO', plan: 'month', method: 'wallet' });
ok(r.status === 200, 'A buys Mapo from wallet', r.j);
r = await admin.post(`/api/admin/users/${aId}/tier`, { tier: 'NEPO', plan: 'month' });
ok(r.status === 200, 'admin upgrades A Mapo → Nepo', r.j);
r = await A.post('/api/prefs', { theme: 'ocean' });
ok(r.status === 403, 'Nepo cannot change the app theme either', r.j);
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
r = await A.post('/api/pools', { name: 'Pad pool ' + tag, starts_at: new Date(Date.now() + 600000).toISOString(), duration: '900', ack: true, custom_pad: true, theme_color: '#FF4FA3', pad_pattern: 'flowers', allow_own_pad: false });
ok(r.status === 200, 'Nepo creates a pool (tap area settings ignored)', r.j);
r = await A.get('/pools/new'); ok(r.status === 200 && !r.text.includes('name="pad_pattern"') && !r.text.includes('name="theme_color"') && r.text.includes('lapo_rules'), 'Nepo create page: no colour or tap area options', null);
await page(A, '/dashboard');
await page(A, '/calc');

console.log('Store');
r = await A.post('/api/store/buy', { item: 'booster-2x', qty: 30 });
ok(r.status === 200 && r.j.owned >= 30, 'buy 30 boosters at once', r.j);
r = await B.post('/api/store/buy', { item: 'booster-8x', qty: 1 });
ok(r.status === 403 && r.j.code === 'UPGRADE', 'Lapo blocked from Nepo booster', r.j);
r = await A.post('/api/store/buy', { item: 'booster-10x', qty: 1 });
ok(r.status === 403 && r.j.need === 'RANK', 'rank-locked booster', r.j);

console.log('VS paid pool');
const startMs = Date.now() + 4000, start = new Date(startMs).toISOString(), end = new Date(startMs + 60000).toISOString();
r = await A.post('/api/pools', { name: 'Jollof War ' + tag, kind: 'PAID', entry_fee: '1,000', prize: '2,000', starts_at: start, ends_at: end, audience: 'ALL', game_type: 'MATCH', side_a: 'Jollof', side_b: 'Fried rice', winners: 2, split_style: 'TOP', tie_rule: 'FIRST', max_players: '', boosters_allowed: true, ack: true, theme_color: '#FF4FA3', bg_color: '#123456' });
ok(r.status === 200 && r.j.id, 'Nepo creates paid VS pool', r.j);
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
r = await A.get('/pools'); ok(/live pools at once/.test(r.text), 'Pools page offers tapping in your live pools at once', null);
r = await A.get('/dashboard'); ok(!/live pools at once/.test(r.text), 'home no longer shows it', null);
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
const teams = r.j.teams || {};
r = await A.get('/api/calc?rate=8');
ok(r.status === 200 && Array.isArray(r.j.pools), 'calculator works for Nepo', r.j);
console.log('  … waiting for the pool to end');
await sleep(Math.max(0, Date.parse(end) - Date.now() + 2500));
r = await admin.post(`/api/admin/pools/${poolId}/settle`, {});
ok(r.status === 200, 'settled', r.j);
await page(A, '/pool/' + poolId, { contains: ['Final board'] });
const wA = (await A.get('/api/wallet')).j.wallet, wB = (await B.get('/api/wallet')).j.wallet, wC = (await C.get('/api/wallet')).j.wallet;
// pot: fees 3 × ₦1,000 + ₦2,000 seed = ₦5,000. The side with more taps takes it all, shared by taps.
ok(wA.winnings_kobo + wB.winnings_kobo + wC.winnings_kobo === 500000, 'the whole ₦5,000 pot is paid out', { a: wA.winnings_kobo, b: wB.winnings_kobo, c: wC.winnings_kobo });
if ((teams.Jollof || 0) > (teams['Fried rice'] || 0)) ok(wA.winnings_kobo === 500000 && wB.winnings_kobo === 0, 'Jollof had more taps: its only player takes the whole pot', { teams, a: wA.winnings_kobo });
else ok(wA.winnings_kobo === 0 && wB.winnings_kobo > wC.winnings_kobo && wC.winnings_kobo > 0, 'Fried rice had more taps: its players share the pot by taps', { teams, b: wB.winnings_kobo, c: wC.winnings_kobo });
r = await A.get(`/api/pools/${poolId}/result`); ok(r.status === 200 && r.j.settled && r.j.vs?.winners?.length === 1, 'result shows the winning side', r.j);
await page(new Client('anon'), `/pool/${poolId}/results`, { contains: ['Final results', 'WINNERS', 'Share results'] });
await page(A, '/top', { contains: ['ada' + tag] });

console.log('Withdrawals');
await admin.post(`/api/admin/users/${bId}/wallet`, { amount: '20,000', balance: 'WINNINGS', note: 'test top-up' });
r = await B.post('/api/withdraw', { amount: '10,000', bank_code: '058', account_number: '0123456789', account_name: 'Bola Test' });
ok(r.status === 400 && r.j.field === 'password', 'withdrawal needs your password', r.j);
r = await B.post('/api/withdraw', { amount: '10,000', bank_code: '058', account_number: '0123456789', account_name: 'Bola Test', password: 'Wrong2026x' });
ok(r.status === 401 && r.j.field === 'password', 'wrong password refused', r.j);
r = await B.post('/api/withdraw', { amount: '10,000', bank_code: '058', account_number: '0123456789', account_name: 'Bola Test', password: 'Tapam2026x' });
ok(r.status === 200, 'B withdraws ₦10,000', r.j);
const wd = (await admin.get(AP + '/withdrawals')).text.match(/\/api\/admin\/withdrawals\/([0-9a-f-]{36})\/reject/)?.[1];
r = await admin.post(`/api/admin/withdrawals/${wd}/reject`, {}); ok(r.status === 400 && r.j.field === 'note', 'payout reject needs a reason', r.j);
r = await admin.post(`/api/admin/withdrawals/${wd}/reject`, { note: 'Wrong account name' }); ok(r.status === 200, 'payout rejected with a reason', r.j);
await page(B, '/wallet', { contains: ['Reason: Wrong account name'] });
r = await B.post('/api/withdraw', { amount: '10,000', bank_code: '058', account_number: '0123456789', account_name: 'Bola Test', password: 'Tapam2026x' });
ok(r.status === 200, 'rejected one does not count toward the daily limit', r.j);
await admin.post(`/api/admin/withdrawals/${(await admin.get(AP + '/withdrawals')).text.match(/\/api\/admin\/withdrawals\/([0-9a-f-]{36})\/paid/)?.[1]}/paid`, {});
r = await B.post('/api/withdraw', { amount: '10,000', bank_code: '058', account_number: '0123456789', account_name: 'Bola Test', password: 'Tapam2026x' });
ok(r.status === 429, 'one withdrawal a day', r.j);
const cId = (await admin.get(AP + '/users?q=chi' + tag)).text.match(USERS_RE)?.[1];
await admin.post(`/api/admin/users/${cId}/wallet`, { amount: '50,000', balance: 'WINNINGS', note: 'race test' });
const cBefore = (await C.get('/api/wallet')).j.wallet.winnings_kobo;
const race = await Promise.all(Array.from({ length: 5 }, () => C.post('/api/withdraw', { amount: '10,000', bank_code: '058', account_number: '0123456789', account_name: 'Chi Test', adult: true, password: 'Tapam2026x' })));
const cAfter = (await C.get('/api/wallet')).j.wallet.winnings_kobo;
ok(race.filter(x => x.status === 200).length === 1 && cBefore - cAfter === 1000000, '5 parallel withdrawals: exactly one goes through, money taken once', { statuses: race.map(x => x.status), cBefore, cAfter });
r = await A.get('/wallet/history.csv');
ok(r.status === 200 && r.type.includes('text/csv') && r.text.includes('Pool entry'), 'history CSV download');
await page(A, '/wallet?page=2');
r = await admin.get(AP + '/withdrawals.csv?all=1');
ok(r.status === 200 && r.text.includes('Bola Test'), 'payouts CSV');

console.log('Sponsor');
r = await S.post('/api/promos', { title: 'Picture ad ' + tag, kind: 'IMAGE', image_url: '/media/u/2026-10/x.png' }); ok(r.status === 400 && r.j.field === 'video_url', 'ads are YouTube only (no picture ads)', r.j);
r = await S.post('/api/upload', {}); ok(r.status >= 400, 'sponsor upload needs a file (logo only)', r.j);
await page(S, '/sponsor/ads', { contains: ['Ad guidelines', 'video_url'], absent: ['duration_seconds'] });
r = await S.post('/api/promos', { title: 'Cold drinks ' + tag, kind: 'YOUTUBE', video_url: 'https://youtu.be/dQw4w9WgXcQ', target_url: 'https://example.com', duration_seconds: '10' });
ok(r.status === 200, 'sponsor creates YouTube ad', r.j);
let adPage = await S.get('/sponsor/ads'); const adId = adPage.text.match(/data-preview-ad="([0-9a-f-]{36})"/)?.[1];
r = await S.get('/api/promo?preview=' + adId); ok(r.j.promo?.preview, 'sponsor previews own ad', r.j);
r = await A.get('/api/promo?preview=' + adId); ok(!r.j.promo, 'players cannot preview others’ ads');
r = await S.post('/api/pools', { name: 'Brand pool ' + tag, prize: '10,000', with_ad: 'YES', promo_id: adId, starts_at: new Date(Date.now() + 60000).toISOString(), duration: '3600', ack: true });
ok(r.status === 400 && r.j.field === 'promo_id', 'pool with unapproved ad refused', r.j);
await page(admin, AP + '/ads', { contains: ['Cold drinks ' + tag] });
r = await admin.post(`/api/admin/promos/${adId}/approve`, {}); ok(r.status === 200, 'admin approves ad');
await S.post('/api/wallet/fund', { amount: 100000, ack: true });
r = await S.post('/api/pools', { name: 'Cheap brand ' + tag, prize: '5,000', starts_at: new Date(Date.now() + 60000).toISOString(), duration: '3600', ack: true });
ok(r.status === 400 && r.j.field === 'prize', 'sponsor prize must be at least ₦10,000', r.j);
r = await S.post('/api/pools', { name: 'Brand pool ' + tag, prize: '10,000', email_blast: 'ALL', with_ad: 'YES', promo_id: adId, starts_at: new Date(Date.now() + 60000).toISOString(), duration: '3600', ack: true, theme_color: '#00C957', bg_color: '#002211' });
ok(r.status === 200, 'sponsor creates pool with ad + colours', r.j);
const brandPool = r.j.id;
await A.post(`/api/pools/${brandPool}/join`, {});
r = await A.get('/api/promo?at=PRE&pool=' + brandPool); ok(r.j.promo?.id === adId && r.j.promo.lead_capture === 0 && r.j.promo.duration_seconds === 15, 'pool shows its own ad (always 15 seconds)', r.j);
r = await admin.post(`/api/admin/sponsors/${sId}/leads`, { on: true }); ok(r.status === 200, 'admin turns on lead capture');
r = await A.post('/api/leads', { promo: adId, name: 'Ada', email: 'ada@example.com', consent: false }); ok(r.status === 400 && r.j.field === 'consent', 'lead needs consent');
r = await A.post('/api/leads', { promo: adId, name: 'Ada', email: 'ada@example.com', phone: '08012345678', consent: true }); ok(r.status === 200, 'lead sent with consent', r.j);
r = await S.get('/sponsor/leads.csv'); ok(r.text.includes('ada@example.com'), 'sponsor downloads leads CSV');
const state = async (c, id) => (await c.get(`/api/pools/${id}/state`)).j;
console.log('Ads: only in admin and sponsor pools, one running Tap Am ad, finish before the start');
const yt = { kind: 'YOUTUBE', video_url: 'https://youtu.be/dQw4w9WgXcQ' };
r = await admin.post('/api/promos', { ...yt, title: 'TapAm A ' + tag, duration_seconds: '5' }); ok(r.status === 200 && /running/.test(r.j.message || ''), 'admin ad goes live as the running ad', r.j);
r = await admin.post('/api/promos', { ...yt, title: 'TapAm B ' + tag, duration_seconds: '10' }); ok(r.status === 200, 'a second admin ad takes over', r.j);
let adm = (await admin.get(AP + '/ads')).text;
const adIdOf = t => { const i = adm.indexOf('>' + t + '</div>'); return i < 0 ? null : adm.slice(i).match(/data-preview-ad="([0-9a-f-]{36})"/)?.[1]; };
const adA = adIdOf('TapAm A ' + tag), adB = adIdOf('TapAm B ' + tag);
ok((adm.match(/badge live">Running/g) || []).length === 1 && adm.includes('Running now:</b> “TapAm B ' + tag), 'only one Tap Am ad runs at a time', null);
r = await admin.post('/api/pools', { name: 'Admin ad pool ' + tag, kind: 'FREE', start_mode: 'NOW', duration: '300' });
const adminAdPool = r.j.id; let stp = await state(A, adminAdPool);
ok(Date.parse(stp.startsAt) - Date.now() >= 12000, 'a “start now” pool with a 10s ad starts only after the ad can finish', stp.startsAt);
r = await A.get('/api/promo?at=LOBBY&left=60&pool=' + adminAdPool); ok(r.j.promo?.id === adB, 'admin pools show the running Tap Am ad', r.j);
r = await A.get('/api/promo?at=LOBBY&left=8&pool=' + adminAdPool); ok(!r.j.promo, 'no lobby ad when it can’t finish before the start', r.j);
r = await A.get('/api/promo?at=PRE&pool=' + adminAdPool); ok(r.j.promo?.id === adB, 'late joiners still get the ad', r.j);
r = await admin.post(`/api/promos/${adA}/toggle`, {}); ok(r.status === 200 && /running/.test(r.j.message || ''), 'switching on A makes it the running ad', r.j);
r = await A.get('/api/promo?at=PRE&pool=' + adminAdPool); ok(r.j.promo?.id === adA, 'admin pools switch to the new running ad', r.j);
adm = (await admin.get(AP + '/ads')).text; ok((adm.match(/badge live">Running/g) || []).length === 1, 'still only one running', null);
r = await admin.post('/api/pools', { name: 'No ad pool ' + tag, kind: 'FREE', start_mode: 'LATER', starts_at: new Date(Date.now() + 120000).toISOString(), duration: '300', with_ad: 'NO' });
r = await A.get('/api/promo?at=PRE&pool=' + r.j.id); ok(!r.j.promo, 'admin can choose “No ad” for a pool', r.j);
r = await A.post('/api/pools', { name: 'Player pool ' + tag, start_mode: 'INSTANT', instant_players: '2', duration: '60', ack: true });
r = await A.get('/api/promo?at=LOBBY&left=600&pool=' + r.j.id); ok(r.status === 200 && !r.j.promo, 'players’ pools never show ads', r.j);
r = await admin.post(`/api/promos/${adId}/toggle`, {}); ok(r.status === 200, 'admin pauses a sponsor’s ad', r.j);
r = await A.get('/api/promo?at=PRE&pool=' + brandPool); ok(!r.j.promo, 'a paused sponsor ad stops showing', r.j);
r = await S.post(`/api/promos/${adId}/toggle`, {}); ok(r.status === 200, 'sponsor switches it back on', r.j);
r = await A.get('/api/promo?at=PRE&pool=' + brandPool); ok(r.j.promo?.id === adId, 'sponsor pool shows only its own ad again', r.j);
r = await S.post(`/api/promos/${adA}/toggle`, {}); ok(r.status === 404, 'sponsors can’t touch Tap Am ads', r.j);
await admin.post(`/api/promos/${adA}/toggle`, {});   // leave no Tap Am ad running for other tests
r = await S.post(`/api/promos/${adId}/home`, { subtitle: 'Cold one dey' }); ok(r.status === 200, 'sponsor asks for home slot', r.j);
const slideId = (await admin.get(AP + '/slides')).text.match(/\/api\/admin\/slides\/([0-9a-z-]+)\/approve/)?.[1];
r = await admin.post(`/api/admin/slides/${slideId}/approve`, {}); ok(r.status === 200, 'admin approves slide');
await page(A, '/dashboard', { contains: ['Cold drinks ' + tag, 'Sponsored pools'] });
for (const p of ['/sponsor', '/sponsor/pools', '/sponsor/ads', '/sponsor/leads', '/wallet']) await page(S, p);

console.log('Admin');
for (const p of ['', '/health', '/users', `/users/${aId}`, '/gifts', '/pools?scope=ended', '/store', '/store?edit=booster-2x', '/ranks', '/ads', '/slides', '/backgrounds', '/withdrawals', '/suggestions', '/codes', '/money', '/money?p=WEEK']) await page(admin, AP + p);
await page(admin, '/pools/new');
r = await admin.get(AP); ok(!/["'`(]\/admin[\/"']/.test(r.text.replace(/\/api\/admin/g, '')), 'admin pages only link to the hidden address', null);
for (const c of [admin, A, new Client('anon')]) { r = await c.get('/admin'); ok(r.status === 404, `${c.name}: /admin is not found`, r.status); }
r = await new Client('anon').get('/admin/login'); ok(r.status === 404, 'old admin login is not found', r.status);
r = await new Client('anon').get(AP + '/users'); ok(r.status === 302 && r.location?.endsWith(AP + '/login'), 'hidden admin address asks a visitor to log in', r.location);
r = await A.get(AP + '/users'); ok(r.status === 404, 'players get not found at the hidden address', r.status);
await page(new Client('anon'), AP + '/login', { contains: ['Admin login'] });
r = await new Client('anon').get('/assets/app.js'); ok(!r.text.includes(AP.slice(1)), 'the hidden address is not in public scripts', null);
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
await page(admin, AP + '/ads', { contains: ['Rejected (1)'] });
r = await admin.post(`/api/admin/promos/${badId}/delete`, {}); ok(r.status === 200, 'admin deletes an ad', r.j);
r = await admin.post('/api/admin/slides', { mode: 'IMAGE', title: 'Pic slide' }); ok(r.status === 400 && r.j.field === 'image_url', 'picture slide needs a picture', r.j);
r = await admin.post('/api/admin/slides', { mode: 'COLOR', title: 'Colour slide ' + tag, subtitle: 'Big Friday', color: '#FF8A2A', cta: 'Enter now', link: '/pools' }); ok(r.status === 200, 'admin adds colour slide with button text', r.j);
await page(A, '/dashboard', { contains: ['Colour slide ' + tag, 'Enter now'] });
r = await admin.post('/api/admin/merch', { name: 'Tee ' + tag, description: 'Green AM print', price: '8,500', status: 'BUY', link: 'https://example.com/tee' }); ok(r.status === 200, 'admin uploads merch', r.j);
await page(new Client('anon'), '/merch', { contains: ['Tee ' + tag, 'Buy now', '₦8,500'] });
r = await admin.post('/api/admin/badges', { name: 'Founder ' + tag, label: 'FD', meaning: 'Here from day one', color: '#FF4FA3' }); ok(r.status === 200, 'admin makes a special badge', r.j);
const badgeId = (await admin.get(AP + '/badges')).text.match(/\/api\/admin\/badges\/([a-z0-9-]+)\/give/)?.[1];
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
for (const p of ['/merch', '/badges', '/slides', '/withdrawals']) await page(admin, AP + p);

console.log('Money, boxes, codes, accounts');
const later = () => ({ starts_at: new Date(Date.now() + 600000).toISOString(), duration: '900' });
r = await A.post('/api/pools', { name: 'Top up pool ' + tag, kind: 'PAID', entry_fee: '200', ...later(), ack: true });
const topPool = r.j.id; ok(!!topPool, 'paid pool for top-ups', r.j);
const bWallet = async () => (await B.get('/api/wallet')).j.wallet;
const b0 = await bWallet();
r = await B.post(`/api/pools/${topPool}/join`, {}); ok(r.status === 200, 'B joins paid pool (₦200)', r.j);
r = await B.post(`/api/pools/${topPool}/topup`, { amount: '50' }); ok(r.status === 400, 'top-up at least ₦100', r.j);
r = await B.post(`/api/pools/${topPool}/topup`, { amount: '500' }); ok(r.status === 200, 'B adds ₦500 to the prize', r.j);
await page(B, '/pool/' + topPool, { contains: ['₦700'] });
r = await A.post(`/api/admin/pools/${topPool}/pause`, {}); ok(r.status === 403 || r.status === 401, 'players cannot pause pools', r.status);
r = await admin.post(`/api/admin/pools/${topPool}/pause`, {}); ok(r.status === 200, 'admin pauses pool', r.j);
ok((await bWallet()).balance_kobo === b0.balance_kobo, 'entry fee and top-up back after pause', { before: b0.balance_kobo, after: (await bWallet()).balance_kobo });
r = await B.post(`/api/pools/${topPool}/join`, {}); ok(r.status >= 400, 'cannot join a paused pool', r.j);
r = await admin.post(`/api/admin/pools/${topPool}/pause`, {}); ok(r.status === 409, 'pausing twice does nothing', r.j);
r = await admin.post(`/api/admin/pools/${topPool}/restart`, { minutes: 5 }); ok(r.status === 200, 'admin restarts pool', r.j);
r = await B.post(`/api/pools/${topPool}/join`, {}); ok(r.status === 200, 'B joins again after restart', r.j);
r = await B.post(`/api/pools/${brandPool}/topup`, { amount: '500' }); ok(r.status === 200, 'anybody can add to any pool, even ones they did not make', r.j);

r = await A.post('/api/store/buy', { item: 'box-basic', qty: 1 }); ok(r.status === 200, 'buy a mystery box', r.j);
r = await A.post('/api/box/open', { item: 'box-basic' }); ok(r.status === 200 && r.j.reward?.kind && r.j.reward.kind !== 'WALLET', 'open the box: server picks a booster or skin (never money)', r.j);
for (let i = 0; i < 5 && r.status === 200; i++) { r = await A.post('/api/box/open', { item: 'box-basic' }); if (r.status === 200 && r.j.reward?.kind === 'WALLET') ok(false, 'a box paid out money', r.j); }
ok(r.status === 409, 'opening stops when you run out of boxes', r.j);
r = await B.post('/api/box/open', { item: 'box-nepo' }); ok(r.status === 409, 'cannot open a box you never had', r.j);
await page(A, '/store?tab=BOX', { contains: ['Mystery box'] });

const codeName = 'TEST' + tag.toUpperCase();
r = await admin.post('/api/admin/codes', { code: 'AB1', tier: 'MAPO', days: 30 }); ok(r.status === 400, 'promo codes need 6+ characters', r.j);
r = await admin.post('/api/admin/codes', { code: codeName, tier: 'MAPO', days: 30, max_uses: 1 }); ok(r.status === 200, 'admin makes a 1-use Mapo code', r.j);
r = await B.post('/api/codes/redeem', { code: 'NOPE' + tag }); ok(r.status === 404, 'wrong code refused', r.j);
r = await B.post('/api/codes/redeem', { code: codeName.toLowerCase() }); ok(r.status === 200, 'B turns in the code: Mapo for 30 days', r.j);
r = await B.post('/api/codes/redeem', { code: codeName }); ok(r.status === 409, 'same player cannot use a code twice', r.j);
r = await C.post('/api/codes/redeem', { code: codeName }); ok(r.status === 409, 'code stops after its last use', r.j);
r = await B.get('/api/me'); ok(/MAPO/.test(JSON.stringify(r.j)), 'B is now Mapo', r.j);

r = await B.post('/api/wallet/send', { to: 'ada' + tag, amount: '200', adult: true }); ok(r.status === 403, 'new accounts wait 24 hours to send money', r.j);
r = await S.post('/api/wallet/send', { to: 'ada' + tag, amount: '200' }); ok(r.status === 403, 'sponsors cannot send money to players', r.j);
const cw = (await C.get('/api/wallet')).j.wallet;
r = await C.post('/api/wallet/convert', { amount: '1,000' }); ok(r.status === 400 && r.j.field === 'ack', 'converting winnings needs the tick', r.j);
r = await C.post('/api/wallet/convert', { amount: '1,000', ack: true }); ok(r.status === 400 && r.j.field === 'password', 'converting needs your password', r.j);
r = await C.post('/api/wallet/convert', { amount: '1,000', ack: true, password: 'Tapam2026x' }); ok(r.status === 200, 'C moves ₦1,000 winnings to wallet', r.j);
const cw2 = (await C.get('/api/wallet')).j.wallet;
ok(cw2.winnings_kobo === cw.winnings_kobo - 100000 && cw2.balance_kobo === cw.balance_kobo + 100000, 'winnings down, wallet up by the same amount', { cw, cw2 });
r = await C.post('/api/wallet/convert', { amount: '99,999,999', ack: true, password: 'Tapam2026x' }); ok(r.status === 409, 'cannot convert more than you have', r.j);

const anon = new Client('anon-reset');
r = await anon.post('/api/password/recover', { identifier: 'bola' + tag, phrase: 'abandon '.repeat(11) + 'about', password: 'NewPass2026x' }); ok(r.status === 401, 'wrong recovery phrase refused', r.j);
r = await anon.post('/api/password/recover', { identifier: 'bola' + tag, phrase: B.phrase.toUpperCase(), password: 'NewPass2026x' }); ok(r.status === 200 && anon.cookie, 'reset password with the recovery phrase (logs in)', r.j);
r = await B.get('/api/me'); ok(r.status === 401 || !r.j.user, 'old sessions logged out after reset', r.status);
r = await B.post('/api/login', { identifier: 'bola' + tag, password: 'NewPass2026x' }); ok(r.status === 200, 'log in with the new password', r.j);
r = await B.post('/api/password/change', { phrase: 'wrong words', password: 'Another2026x' }); ok(r.status === 401 || r.status === 400, 'changing password needs the phrase', r.j);
r = await B.post('/api/password/change', { phrase: B.phrase, password: 'Another2026x' }); ok(r.status === 200, 'change password with the phrase', r.j);
await page(B, '/settings', { contains: ['Sign-in history', 'Recovery phrase'] });
r = await admin.post('/api/admin/phrases/export', { password: 'wrong' }); ok(r.status === 401, 'phrase CSV needs the admin password', r.j);
r = await admin.post('/api/admin/phrases/export', { password: ADMIN_PW }); ok((r.status === 200 && r.type.includes('text/csv') && r.text.includes(B.phrase)) || r.status === 429, 'admin downloads recovery phrases CSV (3 an hour)', r.status);
r = await A.post('/api/admin/phrases/export', { password: 'Tapam2026x' }); ok(r.status >= 401, 'players cannot download phrases', r.status);

await page(B, '/u/ada' + tag, { contains: ['ada' + tag, 'Won'] });
r = await A.post('/api/prefs', { hideProfile: true }); ok(r.status === 200, 'old hide-profile setting is ignored', r.j);
r = await B.get('/u/ada' + tag); ok(r.text.includes('>Won<') && !r.text.includes('private'), 'winnings stay public (no hide option)', null);
await page(A, '/u/ada' + tag, { contains: ['Won'] });
await page(B, '/players?q=ada' + tag, { contains: ['ada' + tag] });
await page(B, '/winners'); await page(B, '/winners?p=WEEK'); await page(B, '/top?q=bola' + tag, { contains: ['bola' + tag] });
r = await new Client('anon').post('/api/unsub', { u: 'x', t: '0'.repeat(32) }); ok(r.status === 400, 'unsubscribe link must be signed', r.j);
await page(new Client('anon'), '/unsub?u=x&t=y', { contains: ['Stop pool news emails?'] });

console.log('Suggest + archive');
r = await B.post('/api/suggest-pool', { name: 'Lagos vs Abuja', type: 'VS', idea: 'Big Friday battle', sides: 'Lagos vs Abuja' }); ok(r.status === 200, 'suggest a pool');
await page(admin, AP + '/suggestions', { contains: ['Lagos vs Abuja'] });
r = await C.post('/api/account/archive', { password: 'wrong', confirm: true }); ok(r.status === 403, 'archive needs password');
r = await C.post('/api/account/archive', { password: 'Tapam2026x', confirm: true }); ok(r.status === 200, 'archive account', r.j);
r = await C.get('/dashboard'); ok(r.status === 302, 'archived user logged out');
r = await C.post('/api/login', { identifier: 'chi' + tag, password: 'Tapam2026x' }); ok(r.status === 200 && r.j.restored, 'login restores archived account', r.j);

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
