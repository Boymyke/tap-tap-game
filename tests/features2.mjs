// Tap-offs, announcements, notifications, block lists, pool search, buying time, tier limits,
// the server-problem vote, WhatsApp numbers and email-code sign-up.
//   BASE=http://127.0.0.1:8787 LOCAL_DB=1 node tests/features2.mjs   (local dev with --test-scheduled)
import { execSync } from 'node:child_process';
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const SETUP = process.env.SETUP_KEY || 'local-setup-key-123';
const ADMIN_ID = process.env.ADMIN_ID || 'bossadmin', ADMIN_PW = process.env.ADMIN_PW || 'SuperSecret123';
const PW = 'Tapam2026x';
const tag = Date.now().toString(36).slice(-5);
let fails = 0, passes = 0;
const ok = (cond, msg, extra) => { if (cond) { passes++; console.log('  ✓', msg); } else { fails++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
class Client {
  constructor(name) { this.name = name; this.cookie = ''; }
  async req(method, path, body) {
    const r = await fetch(BASE + path, { method, redirect: 'manual', headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(this.cookie ? { cookie: this.cookie } : {}), origin: BASE }, body: body !== undefined ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie'); if (sc) { const m = /nakam_session=([^;]*)/.exec(sc); if (m) this.cookie = m[1] ? 'nakam_session=' + m[1] : ''; }
    const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch {}
    return { status: r.status, j: j || {}, text, location: r.headers.get('location') };
  }
  post(p, b = {}) { return this.req('POST', p, b); }
  get(p) { return this.req('GET', p); }
}
const db = sql => execSync(`npx wrangler d1 execute tap-am-ui-preview -c wrangler.preview.jsonc --local --command "${sql.replace(/"/g, '\\"')}"`, { stdio: 'ignore' });
const cron = async () => { for (let i = 0; i < 5; i++) { try { await fetch(BASE + '/__scheduled?cron=*/5+*+*+*+*'); break; } catch { await sleep(2000); } } await sleep(1500); };
async function signup(name) {
  const c = new Client(name), email = `${name.toLowerCase().replace(/_/g, '')}@example.com`;
  const st = await c.post('/api/signup/start', { nickname: name, email, password: PW, whatsapp: '08031234567', gender: 'MALE', country: 'NG', agree: true });
  const s = await c.post('/api/signup/verify', { email, code: st.j.testCode });
  ok(s.status === 200 && c.cookie, `${name} signs up with the email code`, { st: st.j, s: s.j });
  return c;
}
const wallet = async c => (await c.get('/api/wallet')).j.wallet;
const total = w => w.balance_kobo + w.winnings_kobo;
const state = async (c, id) => (await c.get(`/api/pools/${id}/state`)).j;

const admin = new Client('admin');
let r = await admin.post('/api/setup-admin', { setupKey: SETUP, username: ADMIN_ID, email: `${ADMIN_ID}@example.com`, password: ADMIN_PW });
if (r.status === 409) r = await admin.post('/api/admin/login', { identifier: ADMIN_ID, password: ADMIN_PW });
ok(admin.cookie, 'admin session', r.j);
await admin.post('/api/admin/settings', { stakes_on: false, signups_paused: false, lapo_pools_per_day: 3 });

console.log('Sign-up with an email code');
const anon = new Client('anon');
r = await anon.post('/api/signup/start', { nickname: 'wa' + tag, email: `wa${tag}@example.com`, password: PW, whatsapp: '123', gender: 'MALE', country: 'NG', agree: true });
ok(r.status === 400 && r.j.field === 'whatsapp', 'a WhatsApp number is needed', r.j);
r = await anon.post('/api/signup/start', { nickname: 'cd' + tag, email: `cd${tag}@example.com`, password: PW, whatsapp: '0803 123 4567', gender: 'MALE', country: 'NG', agree: true });
ok(r.status === 200 && r.j.step === 'verify' && !anon.cookie, 'step 1 sends a code and makes no account yet', r.j);
const code = r.j.testCode;
r = await anon.post('/api/signup/verify', { email: `cd${tag}@example.com`, code: code === '000000' ? '111111' : '000000' });
ok(r.status === 400 && r.j.field === 'code', 'a wrong code is refused', r.j);
r = await anon.post('/api/signup/verify', { email: `cd${tag}@example.com`, code });
ok(r.status === 200 && anon.cookie && r.j.phrase, 'the right code creates the account', r.j);
r = await new Client('again').post('/api/signup/verify', { email: `cd${tag}@example.com`, code });
ok(r.status >= 400, 'the same code can’t be used twice', r.j);
await admin.post('/api/admin/settings', { signups_paused: true });
r = await new Client('p').post('/api/signup/start', { nickname: 'ps' + tag, email: `ps${tag}@example.com`, password: PW, whatsapp: '08031234567', gender: 'MALE', country: 'NG', agree: true });
ok(r.status === 503, 'sign-ups can be paused by the super admin', r.j);
await admin.post('/api/admin/settings', { signups_paused: false });

const X = await signup('xx' + tag), Y = await signup('yy_' + tag), Z = await signup('zz' + tag);
for (const c of [X, Y, Z]) await c.post('/api/wallet/fund', { amount: 50000, ack: true, adult: true });

console.log('WhatsApp number');
r = await X.post('/api/account/whatsapp', { whatsapp: '0809 999 0000', password: 'Nope2026x' }); ok(r.status === 401, 'needs your password', r.j);
r = await X.post('/api/account/whatsapp', { whatsapp: '0809 999 0000', password: PW }); ok(r.status === 200, 'saved', r.j);
r = await X.get('/settings'); ok(r.text.includes('+2348099990000'), 'shown in settings as +234…');

console.log('Tap-offs');
r = await X.post('/api/challenges', { to: 'yy_' + tag, duration: '60' }); ok(r.status === 200, 'X challenges Y (no stake)', r.j);
r = await X.post('/api/challenges', { to: 'yy_' + tag, duration: '60' }); ok(r.status === 409, 'one open challenge per pair', r.j);
r = await Y.get('/challenges'); ok(r.text.includes('xx' + tag) && r.text.includes('challenged you'), 'Y sees it');
let cid = r.text.match(/\/api\/challenges\/([0-9a-f-]{36})\/accept/)?.[1];
r = await X.post(`/api/challenges/${cid}/accept`, {}); ok(r.status === 403, 'only the challenged player can accept', r.j);
r = await Y.post(`/api/challenges/${cid}/decline`, {}); ok(r.status === 200, 'Y declines', r.j);
r = await X.post('/api/challenges', { to: 'yy_' + tag, duration: '60', stake: '500' }); ok(r.status === 403 && r.j.field === 'stake', 'stakes are off until the super admin switches them on', r.j);
await admin.post('/api/admin/settings', { stakes_on: true });
r = await X.post('/api/challenges', { to: 'yy_' + tag, duration: '60', stake: '500' }); ok(r.status === 400 && r.j.field === 'password', 'a stake needs your password', r.j);
let wx = await wallet(X);
r = await X.post('/api/challenges', { to: 'yy_' + tag, duration: '60', stake: '500', password: PW }); ok(r.status === 200, 'X challenges Y for ₦500', r.j);
ok(total(await wallet(X)) === total(wx) - 50000, 'X’s ₦500 is held');
r = await X.post(`/api/challenges/${r.j.id}/cancel`, {}); ok(r.status === 200 && total(await wallet(X)) === total(wx), 'cancel gives it back', r.j);
r = await X.post('/api/challenges', { to: 'yy_' + tag, duration: '60', stake: '500', password: PW }); cid = r.j.id;
r = await Y.post(`/api/challenges/${cid}/accept`, {}); ok(r.status === 400 && r.j.field === 'password', 'accepting a stake needs a password', r.j);
const wy = await wallet(Y);
const [a1, a2] = await Promise.all([Y.post(`/api/challenges/${cid}/accept`, { password: PW }), Y.post(`/api/challenges/${cid}/accept`, { password: PW })]);
const acc = [a1, a2].filter(x => x.status === 200);
ok(acc.length === 1 && /^\/play\?pools=/.test(acc[0].j.redirect), 'accepted once (double click safe) and the game opens', [a1.j, a2.j]);
ok(total(await wallet(Y)) === total(wy) - 50000, 'Y’s ₦500 is held once');
const tapPool = acc[0]?.j.redirect?.split('=')[1];
let st = await state(X, tapPool);
ok(st.maxPlayers === 2 && st.players === 2 && st.state === 'soon', '1-on-1 pool made, starts in seconds', st);
await sleep(Math.max(0, Date.parse(st.startsAt) - Date.now() + 600));
for (let i = 0; i < 4; i++) { await X.post('/api/tap', { pools: [tapPool], taps: 10 }); await Y.post('/api/tap', { pools: [tapPool], taps: 4 }); await sleep(600); }
console.log('  … waiting for the tap-off to end');
st = await state(X, tapPool);
await sleep(Math.max(0, Date.parse(st.endsAt) - Date.now() + 3000));
await admin.post(`/api/admin/pools/${tapPool}/settle`, {});
r = await X.get(`/api/pools/${tapPool}/result`);
ok(r.j.settled && r.j.rank === 1 && r.j.prize === 100000, 'X wins and takes both stakes (₦1,000)', r.j);
r = await X.get('/challenges'); ok(r.text.includes('You won'), 'past tap-offs show the result');
r = await X.post('/api/challenges', { to: 'yy_' + tag, duration: '60', time_topup: true, lapo_rules: true, boosters_allowed: false }); ok(r.status === 200, 'X sends a tap-off with options', r.j);
r = await Y.get('/challenges'); ok(r.text.includes('Lapo baby rules') && r.text.includes('No boosters') && r.text.includes('Players can buy time'), 'Y sees the options');
r = await Y.post(`/api/challenges/${r.text.match(/\/api\/challenges\/([0-9a-f-]{36})\/accept/)?.[1]}/accept`, {});
const optPool = r.j.redirect?.split('=')[1];
r = await X.get('/pool/' + optPool); ok(r.text.includes('Lapo baby rules:') && r.text.includes('No boosters in this pool.'), 'the tap-off pool uses the options', r.status);
r = await X.get('/play?pools=' + optPool); ok(/"timeTopup":true/.test(r.text), 'players can buy time in that tap-off');
r = await X.get('/pools'); ok(r.text.includes('href="/challenges"') && r.text.includes('Tap-off'), 'Tap-off button beside Create a pool on Pools');
r = await X.get('/dashboard'); ok(r.text.includes('href="/challenges"'), 'Tap-off button on home');
r = await X.get('/me'); ok(r.status === 200 && !r.text.includes('tile c-purple" href="/challenges"'), 'Tap-offs tile gone from Me');
r = await X.get('/u/yy_' + tag); ok(r.text.includes('/challenges?to=yy_' + tag), 'profiles still have the challenge button');
if (process.env.LOCAL_DB) {
  console.log('Top winner badge');
  const yday = new Date(Date.now() + 3600000 - 86400000).toISOString().slice(0, 10);
  db(`UPDATE pools SET settled_at='${yday}T12:00:00.000Z' WHERE id='${tapPool}'`);
  db(`UPDATE pool_entries SET prize_kobo=${Date.now()} WHERE pool_id='${tapPool}' AND prize_kobo>0`);
  db(`DELETE FROM badges WHERE kind='WIN_DAY' AND period='D${yday}'`);
  await cron();
  r = await X.get('/me'); ok(r.text.includes('Top winner of the day'), 'yesterday’s top winner gets the badge', r.text.match(/Top winner[^<]*/)?.[0]);
  r = await Y.get('/u/xx' + tag); ok(r.text.includes('Top winner of the day'), 'others see it on the profile');
}

console.log('Notifications');
r = await Y.get('/notifications');
const nid = r.text.match(/data-dismiss="([0-9a-f-]{32,36})"/)?.[1];
r = await Y.post(`/api/notifications/${nid}/dismiss`, {}); ok(r.status === 200, 'dismiss one', r.j);
r = await Y.get('/notifications'); ok(!r.text.includes(`data-dismiss="${nid}"`), 'it is gone');
r = await X.post(`/api/notifications/${nid}/dismiss`, {}); ok(r.status === 200, 'dismissing someone else’s does nothing (no error leak)');
r = await Y.post('/api/notifications/clear', {}); r = await Y.get('/notifications'); ok(r.text.includes('all caught up'), 'clear all');

console.log('Announcements');
r = await X.post('/api/admin/announcements', { title: 'Hi', body: 'x' }); ok(r.status === 403 || r.status === 401, 'players can’t announce', r.status);
r = await admin.post('/api/admin/announcements', { title: 'Friday tournament ' + tag, body: 'Big prizes at 8 PM.', link: '/pools', audience: 'ALL', overlay: true, email: 'NEWS', days: 2 });
ok(r.status === 200 && /Sent to \d+/.test(r.j.message), 'announcement sent', r.j);
r = await Y.get('/notifications'); ok(r.text.includes('Friday tournament ' + tag), 'it lands in notifications');
r = await Y.get('/api/announcement'); ok(r.j.announcement?.title === 'Friday tournament ' + tag, 'pop-up waiting', r.j);
r = await Y.post(`/api/announcements/${r.j.announcement?.id}/seen`, {}); r = await Y.get('/api/announcement'); ok(!r.j.announcement, 'closed pop-up does not come back', r.j);
r = await admin.post('/api/admin/announcements', { title: 'Bad link', body: 'x x x', link: 'javascript:alert(1)' }); ok(r.status === 400 && r.j.field === 'link', 'unsafe links refused', r.j);
r = await admin.get('/whotfareyou123456789/messages'); ok(r.status === 200 && r.text.includes('Make an announcement'), 'announce page');
r = await admin.get('/whotfareyou123456789/errors'); ok(r.status === 200 && r.text.includes('what to do about it'), 'errors page');

console.log('Pools: block list, search, buying time');
r = await admin.post('/api/pools', { name: 'Blocky ' + tag, start_mode: 'INSTANT', instant_players: '3', duration: '60', blocked: 'yy_' + tag });
ok(r.status === 200 && r.j.blocked === 1, 'pool with a blocked player', r.j);
const blocky = r.j.id;
r = await Y.post(`/api/pools/${blocky}/join`, {}); ok(r.status === 403, 'blocked player can’t join', r.j);
r = await X.post(`/api/pools/${blocky}/join`, {}); ok(r.status === 200, 'others can', r.j);
r = await X.get('/pools?q=' + encodeURIComponent('Blocky ' + tag)); ok(r.text.includes('Blocky ' + tag), 'search finds it by name');
r = await X.get('/pools?q=nothingmatches' + tag); ok(r.text.includes('No pool matches'), 'empty search says so');
r = await admin.post('/api/pools', { name: 'Clock ' + tag, start_mode: 'NOW', duration: '300', time_topup: true });
const clock = r.j.id;
await X.post(`/api/pools/${clock}/join`, {});
st = await state(X, clock);
r = await X.post(`/api/pools/${clock}/topup`, { amount: '5,000', ingame: true }); ok(r.status === 400, 'buying time needs at least ₦10,000', r.j);
wx = await wallet(X);
r = await X.post(`/api/pools/${clock}/topup`, { amount: '20,000', ingame: true });
const st2 = await state(X, clock);
ok(r.status === 200 && r.j.addedSeconds === 20 && Date.parse(st2.endsAt) - Date.parse(st.endsAt) === 20000, '₦20,000 adds 20 seconds', { r: r.j, before: st.endsAt, after: st2.endsAt });
ok(total(await wallet(X)) === total(wx) - 2000000, '₦20,000 taken');
ok(st2.prize === st.prize, 'buying time does not change the prize', { before: st.prize, after: st2.prize });
r = await X.get('/wallet'); ok(r.text.includes('Extra game time'), 'wallet history says Extra game time');
r = await X.get(`/play?pools=${clock}`); ok(!/goes into the prize/.test(r.text), 'the buy-time sheet makes no prize claim');
r = await Z.post(`/api/pools/${clock}/topup`, { amount: '1,000' });
ok(r.status === 200 && (await state(X, clock)).endsAt === st2.endsAt, 'adding from the pool page grows the prize but not the time', r.j);
r = await admin.post(`/api/admin/pools/${clock}/cancel`, { confirm: true });
ok(r.status === 200 && total(await wallet(X)) === total(wx), 'a cancelled pool gives back the time bought', { r: r.j, now: total(await wallet(X)), was: total(wx) });
r = await admin.post('/api/pools', { name: 'NoClock ' + tag, start_mode: 'NOW', duration: '300', time_topup: false });
r = await X.post(`/api/pools/${r.j.id}/topup`, { amount: '10,000', ingame: true }); ok(r.status === 409, 'pools can switch buying time off', r.j);

console.log('Pools a day per tier');
await admin.post('/api/admin/settings', { lapo_pools_per_day: 1 });
r = await Z.post('/api/pools', { name: 'Z one ' + tag, start_mode: 'INSTANT', instant_players: '2', duration: '60', ack: true }); ok(r.status === 200, 'Lapo makes 1', r.j);
r = await Z.post('/api/pools', { name: 'Z two ' + tag, start_mode: 'INSTANT', instant_players: '2', duration: '60', ack: true }); ok(r.status === 403 && r.j.code === 'UPGRADE', 'the admin’s Lapo limit (1) applies', r.j);
await admin.post('/api/admin/settings', { lapo_pools_per_day: 3 });

console.log('Server problem: pause, vote, continue');
r = await admin.post('/api/pools', { name: 'Votey ' + tag, start_mode: 'NOW', duration: '300' });
const votey = r.j.id;
await X.post(`/api/pools/${votey}/join`, {}); await Y.post(`/api/pools/${votey}/join`, {});
await X.post('/api/tap', { pools: [votey], taps: 8 });
r = await admin.post('/api/admin/overload/pause-all', { confirm: true }); ok(r.status === 200, 'pause all games', r.j);
st = await state(X, votey); ok(st.state === 'paused', 'pool is paused', st);
r = await X.post('/api/tap', { pools: [votey], taps: 5 }); ok(r.j.results?.[votey]?.code === 'PAUSED', 'no tapping while paused', r.j);
r = await new Client('q').post('/api/signup/start', { nickname: 'qq' + tag, email: `qq${tag}@example.com`, password: PW, whatsapp: '08031234567', gender: 'MALE', country: 'NG', agree: true });
ok(r.status === 503, 'no sign-ups while the servers have a problem', r.j);
r = await admin.post('/api/pools', { name: 'During ' + tag, start_mode: 'NOW', duration: '60' }); ok(r.status === 503, 'no new pools either', r.j);
r = await X.post(`/api/pools/${votey}/vote`, { choice: 'CONTINUE' }); ok(r.status === 409, 'no vote until the servers are back', r.j);
r = await admin.post('/api/admin/overload/restart-all', { minutes: 5 }); ok(r.status === 200 && /vote open/.test(r.j.message), 'servers back: the vote opens', r.j);
r = await X.get('/pool/' + votey); ok(r.text.includes('Vote continue'), 'players see the vote');
r = await X.post(`/api/pools/${votey}/vote`, { choice: 'CONTINUE' }); ok(r.status === 200, 'X votes continue', r.j);
r = await Y.post(`/api/pools/${votey}/vote`, { choice: 'RESTART' }); ok(r.status === 200, 'Y votes restart', r.j);
r = await Z.post(`/api/pools/${votey}/vote`, { choice: 'RESTART' }); ok(r.status === 403, 'only players in the pool vote', r.j);
if (process.env.LOCAL_DB) {
  db(`UPDATE pools SET vote_until='2000-01-01T00:00:00.000Z' WHERE id='${votey}'`);
  await cron();
  st = await state(X, votey);
  ok(st.state === 'soon' && Date.parse(st.startsAt) - Date.now() < 31000, '50% continue = the match continues in 30 seconds', st);
  r = await X.get(`/api/pools/${votey}/board?n=5`);
  ok(r.j.me?.score === 8, 'scores were kept', r.j.me);
}

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
