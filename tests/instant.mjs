// Scheduling, instant matches, invites, player search and admin "add time".
//   BASE=http://127.0.0.1:8787 node tests/instant.mjs   (local dev started with --test-scheduled)
// LOCAL_DB=1 lets the test move an instant match's deadline into the past (wrangler d1 --local).
import { execSync } from 'node:child_process';
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const SETUP = process.env.SETUP_KEY || 'local-setup-key-123';
const ADMIN_ID = process.env.ADMIN_ID || 'bossadmin', ADMIN_PW = process.env.ADMIN_PW || 'SuperSecret123';
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
    return { status: r.status, j: j || {}, text };
  }
  post(p, b = {}) { return this.req('POST', p, b); }
  get(p) { return this.req('GET', p); }
}
async function signup(name) {
  const c = new Client(name);
  const s = await c.post('/api/signup', { nickname: name, email: `${name.replace(/_/g, '')}@example.com`, password: 'Tapam2026x', gender: 'FEMALE', country: 'NG', agree: true });
  ok(s.status === 200 && c.cookie, `${name} signs up`, s.j);
  return c;
}
const lagos = ms => new Date(ms + 3600000).toISOString();   // Lagos wall clock in UTC fields
const state = async (c, id) => (await c.get(`/api/pools/${id}/state`)).j;

const admin = new Client('admin');
let r = await admin.post('/api/setup-admin', { setupKey: SETUP, username: ADMIN_ID, email: `${ADMIN_ID}@example.com`, password: ADMIN_PW });
if (r.status === 409) r = await admin.post('/api/admin/login', { identifier: ADMIN_ID, password: ADMIN_PW });
ok(admin.cookie, 'admin session', r.j);
const P1 = await signup('mk' + tag), P2 = await signup('zu_' + tag), P3 = await signup('o_' + tag + 'x'), P4 = await signup('kk' + tag);

console.log('Player search (underscore kept)');
r = await P1.get('/api/players/search?q=' + encodeURIComponent('zu_'));
ok(r.status === 200 && r.j.players.some(p => p.name === 'zu_' + tag), 'search "zu_" finds zu_…', r.j);
r = await P1.get('/api/players/search?q=' + encodeURIComponent('zu_' + tag));
ok(r.j.players?.[0]?.name === 'zu_' + tag, 'exact name comes first', r.j);
r = await P1.get('/api/players/search?q=' + encodeURIComponent('zu' + tag));
ok(r.status === 200 && !r.j.players.some(p => p.name === 'zu_' + tag), 'underscore is not dropped ("zu" + rest does not match zu_…)', r.j);
r = await P1.get('/api/players/search?q=%25');
ok(r.status === 200 && r.j.players.length === 0, '"%" is a literal, not a wildcard', r.j);
r = await P1.get('/api/players/search?q=mk' + tag);
ok(!r.j.players.some(p => p.name === 'mk' + tag), 'you are not in your own results', r.j);
r = await new Client('anon').get('/api/players/search?q=zu');
ok(r.status === 401 || r.status === 403, 'search needs an account', r.status);
r = await P1.get('/players?q=' + encodeURIComponent('zu_' + tag));
ok(r.text.includes('zu_' + tag), 'players page search keeps "_"');

console.log('Schedule for later (Lagos time) + durations');
const tmr = lagos(Date.now() + 86400000).slice(0, 10);
r = await admin.post('/api/pools', { name: 'Later ' + tag, kind: 'FREE', start_mode: 'LATER', start_date: tmr, start_time: '20:00', duration: '3600' });
ok(r.status === 200, 'schedule tomorrow 8 PM for 1 hour', r.j);
let st = await state(P1, r.j.id);
ok(st.startsAt === `${tmr}T19:00:00.000Z` && Date.parse(st.endsAt) - Date.parse(st.startsAt) === 3600000 && st.state === 'soon', '8 PM Lagos = 19:00 UTC, ends an hour later', st);
r = await admin.post('/api/pools', { name: 'Past ' + tag, start_mode: 'LATER', start_date: lagos(Date.now() - 86400000).slice(0, 10), start_time: '10:00', duration: '300' });
ok(r.status === 400 && r.j.field === 'start_time', 'a time in the past is refused', r.j);
r = await admin.post('/api/pools', { name: 'Bad ' + tag, start_mode: 'LATER', start_date: 'tomorrow', start_time: '20:00', duration: '300' });
ok(r.status === 400 && r.j.field === 'start_date', 'a bad day is refused', r.j);
r = await admin.post('/api/pools', { name: 'Custom ' + tag, start_mode: 'LATER', start_date: tmr, start_time: '09:30', duration: 'CUSTOM', custom_len: '2.5', custom_unit: 'HOUR' });
st = await state(P1, r.j.id);
ok(r.status === 200 && Date.parse(st.endsAt) - Date.parse(st.startsAt) === 9000000, 'custom length 2.5 hours', st);
r = await admin.post('/api/pools', { name: 'Tiny ' + tag, start_mode: 'NOW', duration: '30' });
ok(r.status === 400 && r.j.field === 'duration', 'less than a minute refused', r.j);
r = await admin.post('/api/pools', { name: 'Huge ' + tag, start_mode: 'NOW', duration: 'CUSTOM', custom_len: '8', custom_unit: 'DAY' });
ok(r.status === 400 && r.j.field === 'custom_len', 'more than 7 days refused', r.j);
r = await admin.post('/api/pools', { name: 'Now ' + tag, start_mode: 'NOW', duration: '300' });
st = await state(P1, r.j.id);
ok(r.status === 200 && st.state === 'live' && Math.abs(Date.parse(st.endsAt) - Date.now() - 300000) < 15000, 'start now for 5 min is live', st);
const nowPool = r.j.id;

console.log('Admin adds time');
r = await P1.post(`/api/admin/pools/${nowPool}/extend`, { minutes: 5 });
ok(r.status === 403, 'players cannot add time', r.status);
const before = Date.parse((await state(P1, nowPool)).endsAt);
r = await admin.post(`/api/admin/pools/${nowPool}/extend`, { minutes: 5 });
st = await state(P1, nowPool);
ok(r.status === 200 && Date.parse(st.endsAt) - before === 300000, 'super admin adds 5 minutes', { r: r.j, st });
r = await P2.post(`/api/pools/${nowPool}/join`, {});
const board = (await P2.get(`/api/pools/${nowPool}/board?n=5`)).j;
ok(board.endsAt === Date.parse(st.endsAt), 'the game room knows the new end time', board);
r = await admin.post(`/api/admin/pools/${nowPool}/extend`, { minutes: 0 });
ok(r.status === 400, 'minutes must be 1 or more', r.j);

console.log('Instant match');
r = await admin.post('/api/pools', { name: 'Insta ' + tag, start_mode: 'INSTANT', instant_players: '3', duration: '60', max_players: '50' });
ok(r.status === 200 && /3 players/.test(r.j.message), 'instant match for 3 players, 1 minute', r.j);
const ip = r.j.id;
st = await state(P1, ip);
ok(st.state === 'waiting' && st.maxPlayers === 3 && st.players === 0, 'waiting, max players = 3 (max_players ignored)', st);
r = await P1.get('/pool/' + ip);
ok(r.text.includes('Filling up') && r.text.includes('0/3 joined'), 'pool page shows it filling up');
r = await P1.get('/api/pools?scope=open');
ok(r.j.pools.some(p => p.id === ip && p.state === 'waiting' && p.instant && p.duration === 60), 'listed as an instant match', r.j.pools?.find(p => p.id === ip));
r = await P1.post(`/api/pools/${ip}/join`, {});
ok(r.status === 200 && /2 more players/.test(r.j.message) && r.j.redirect === '/pool/' + ip, 'first player waits (2 more)', r.j);
r = await P1.post('/api/tap', { pools: [ip], taps: 5 });
ok(r.j.results?.[ip]?.code === 'NOT_STARTED' && !r.j.results[ip].score, 'no tapping while it fills', r.j);
r = await P1.get('/play?pools=' + ip);
ok(r.status === 302 || r.status === 303, 'play screen sends you back while it fills', r.status);
r = await P1.post(`/api/pools/${ip}/boost`, { item: 'booster-2x' });
ok(r.status === 409 && /starts/.test(r.j.error || ''), 'no boosters while it fills', r.j);
r = await admin.post(`/api/admin/pools/${ip}/extend`, { minutes: 1 });
st = await state(P1, ip);
ok(r.status === 200 && st.state === 'waiting', 'admin adds time to a waiting match', r.j);
r = await P2.post(`/api/pools/${ip}/join`, {});
ok(/1 more player\b/.test(r.j.message || ''), 'second player (1 more)', r.j);
const [j3, j4] = await Promise.all([P3.post(`/api/pools/${ip}/join`, {}), P4.post(`/api/pools/${ip}/join`, {})]);
const winner = [j3, j4].find(x => x.status === 200 && /full/.test(x.j.message || '')), loser = [j3, j4].find(x => x !== winner);
ok(winner && winner.j.redirect === '/play?pools=' + ip, 'last seat starts the match and opens the game', [j3.j, j4.j]);
ok(loser && loser.status === 409, 'nobody gets in after it is full', loser?.j);
st = await state(P1, ip);
const len = Date.parse(st.endsAt) - Date.parse(st.startsAt);
ok(st.state === 'soon' && Date.parse(st.startsAt) - Date.now() <= 16000 && len === 120000, 'starts in ~15 s and runs 1 min + the minute the admin added', { st, len });
r = await P1.get('/notifications');
ok(r.text.includes('is full'), 'players are told it started');
await sleep(Math.max(0, Date.parse(st.startsAt) - Date.now() + 800));
r = await P1.post('/api/tap', { pools: [ip], taps: 5 });
ok(r.j.results?.[ip]?.score > 0, 'taps count once it starts', r.j);

console.log('Instant match that never fills (refund)');
await P2.post('/api/wallet/fund', { amount: 5000, ack: true, adult: true });
const w0 = (await P2.get('/api/wallet')).j.wallet;
r = await admin.post('/api/pools', { name: 'Lonely ' + tag, kind: 'PAID', entry_fee: '500', start_mode: 'INSTANT', instant_players: '5', duration: '300' });
const lp = r.j.id;
r = await P2.post(`/api/pools/${lp}/join`, { adult: true });
const w1 = (await P2.get('/api/wallet')).j.wallet;
ok(r.status === 200 && (w0.balance_kobo + w0.winnings_kobo) - (w1.balance_kobo + w1.winnings_kobo) === 50000, 'paid ₦500 to join', { r: r.j, w0, w1 });
if (process.env.LOCAL_DB) {
  execSync(`npx wrangler d1 execute tap-am-ui-preview -c wrangler.preview.jsonc --local --command "UPDATE pools SET starts_at='2000-01-01T00:00:00.000Z' WHERE id='${lp}'"`, { stdio: 'ignore' });
  await fetch(BASE + '/__scheduled?cron=*/5+*+*+*+*');
  await sleep(1500);
  st = await state(P2, lp);
  const w2 = (await P2.get('/api/wallet')).j.wallet;
  ok(st.state === 'cancelled', 'cancelled after the deadline', st);
  ok(w2.balance_kobo + w2.winnings_kobo === w0.balance_kobo + w0.winnings_kobo, 'entry fee refunded', { w0, w2 });
  r = await P2.get('/notifications');
  ok(r.text.includes('in time'), 'player told why');
  await fetch(BASE + '/__scheduled?cron=*/5+*+*+*+*'); await sleep(800);
  const w3 = (await P2.get('/api/wallet')).j.wallet;
  ok(w3.balance_kobo === w2.balance_kobo && w3.winnings_kobo === w2.winnings_kobo, 'refund happens once', { w2, w3 });
}

console.log('Invites');
r = await P1.post('/api/pools', { name: 'Secret ' + tag, kind: 'FREE', start_mode: 'NOW', duration: '900', is_private: true, ack: true, invites: `zu_${tag},nobody_${tag},mk${tag}` });
ok(r.status === 200 && r.j.invited === 1, 'private pool with invites (unknown names and yourself skipped)', r.j);
const sp = r.j.id;
r = await P2.get('/notifications');
ok(r.text.includes('invited you') && r.text.includes('Secret ' + tag), 'invited player is notified');
r = await P2.get('/api/pools?scope=open');
ok(r.j.pools.some(p => p.id === sp && p.invited), 'invited player sees the private pool', null);
r = await P4.get('/api/pools?scope=open');
ok(!r.j.pools.some(p => p.id === sp), 'other players do not see it', null);
r = await P2.get('/pool/' + sp);
ok(r.text.includes('don’t need the password') && !r.text.includes('name="password"'), 'invited player skips the password field');
r = await P2.post(`/api/pools/${sp}/join`, {});
ok(r.status === 200, 'invited player joins without the password', r.j);
r = await P4.post(`/api/pools/${sp}/join`, {});
ok(r.status === 403 && r.j.field === 'password', 'others still need the password', r.j);
r = await P4.post(`/api/pools/${sp}/invite`, { invites: 'kk' + tag });
ok(r.status === 403, 'only the creator can invite', r.j);
r = await P1.post(`/api/pools/${sp}/invite`, { invites: ['kk' + tag, 'zu_' + tag] });
ok(r.status === 200 && /1 player invited/.test(r.j.message), 'creator invites more later (already-invited skipped)', r.j);
r = await P1.post(`/api/pools/${sp}/invite`, { invites: 'kk' + tag });
ok(r.status === 400, 'inviting the same player twice does nothing', r.j);
r = await P4.post(`/api/pools/${sp}/join`, {});
ok(r.status === 200, 'newly invited player joins', r.j);

console.log('Pages');
r = await P1.get('/pools/new');
ok(r.status === 200 && ['name="start_mode"', 'value="INSTANT"', 'name="start_date"', 'name="duration"', 'data-picker'].every(x => r.text.includes(x)) && !/undefined|NaN/.test(r.text.replace(/<script[\s\S]*?<\/script>/g, '')), 'create page has the new start + invite controls');
r = await admin.get('/pool/' + ip);
ok(r.status === 200 && r.text.includes('/extend'), 'admin sees add-time buttons on the pool page');

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
