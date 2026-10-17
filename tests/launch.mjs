// Launch features (17 Oct): players needed + caps, scheduled pools waiting for players, Lapo matches,
// invites (and the "don't invite me" switch), option switches, home page ad requests, inner circle,
// gift emails, live counters, top winners, health load panel.
//   BASE=http://127.0.0.1:8787 LOCAL_DB=1 node tests/launch.mjs   (local dev with --test-scheduled)
import { execSync } from 'node:child_process';
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const SETUP = process.env.SETUP_KEY || 'local-setup-key-123';
const ADMIN_ID = process.env.ADMIN_ID || 'bossadmin', ADMIN_PW = process.env.ADMIN_PW || 'SuperSecret123';
const AP = process.env.ADMIN_PATH || '/whotfareyou123456789';
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
    return { status: r.status, j: j || {}, text };
  }
  post(p, b = {}) { return this.req('POST', p, b); }
  get(p) { return this.req('GET', p); }
}
const q = sql => JSON.parse(execSync(`npx wrangler d1 execute tap-am-ui-preview -c wrangler.preview.jsonc --local --json --command "${sql.replace(/"/g, '\\"')}"`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString())[0].results;
const cron = async () => { await fetch(BASE + '/__scheduled?cron=*/5+*+*+*+*').catch(() => {}); await sleep(1500); };
async function signup(name) {
  const c = new Client(name), email = `${name.toLowerCase().replace(/_/g, '')}@example.com`;
  const st = await c.post('/api/signup/start', { nickname: name, email, password: PW, whatsapp: '08031234567', gender: 'MALE', country: 'NG', agree: true });
  await c.post('/api/signup/verify', { email, code: st.j.testCode });
  c.id = q(`SELECT id FROM users WHERE username='${name}'`)[0]?.id;
  ok(c.cookie && c.id, `${name} signs up`);
  return c;
}
const state = async (c, id) => (await c.get(`/api/pools/${id}/state`)).j;

const admin = new Client('admin');
let r = await admin.post('/api/setup-admin', { setupKey: SETUP, username: ADMIN_ID, email: `${ADMIN_ID}@example.com`, password: ADMIN_PW });
if (r.status === 409) r = await admin.post('/api/admin/login', { identifier: ADMIN_ID, password: ADMIN_PW });
ok(admin.cookie, 'admin session', r.j);
await admin.post('/api/admin/settings', { signups_paused: false, lapo_pools_per_day: 50, opt_lapo_rules: true, opt_boosters: true });

const A = await signup('la' + tag), B = await signup('lb' + tag), C = await signup('lc' + tag), N = await signup('ln' + tag);
await admin.post(`/api/admin/users/${A.id}/tier`, { tier: 'MAPO', plan: 'month' });
await admin.post(`/api/admin/users/${N.id}/tier`, { tier: 'NEPO', plan: 'month' });

console.log('Players needed + cap');
r = await A.post('/api/pools', { name: 'Cap ' + tag, start_mode: 'INSTANT', instant_players: '2', max_players: '1', duration: '60', ack: true });
ok(r.status === 400 && r.j.field === 'max_players', 'cap can’t be below players needed', r.j);
r = await A.post('/api/pools', { name: 'Unl ' + tag, start_mode: 'INSTANT', instant_players: '2', max_players: '', duration: '60', ack: true });
let st = await state(A, r.j.id);
ok(r.status === 200 && st.needed === 2 && st.maxPlayers === 100000, 'instant: 2 needed, cap unlimited by default', st);
const starts = new Date(Date.now() + 22000).toISOString();
r = await A.post('/api/pools', { name: 'Later ' + tag, start_mode: 'LATER', starts_at: starts, instant_players: '2', max_players: '2', duration: '60', ack: true });
const lp = r.j.id;
st = await state(A, lp);
ok(r.status === 200 && st.state === 'soon' && st.needed === 2 && st.maxPlayers === 2, 'scheduled pool: 2 needed, capped at 2', { r: r.j, st });
r = await B.post(`/api/pools/${lp}/join`, {}); ok(r.status === 200, 'one player joins the scheduled pool', r.j);
let page = await B.get('/pool/' + lp);
ok(page.text.includes('Players needed to start') && page.text.includes('Up to <b>2</b> players'), 'pool rules show players needed and the cap');
await sleep(Math.max(0, Date.parse(starts) - Date.now() - 6000));
st = await state(B, lp);
ok(st.state === 'waiting' && Date.parse(st.startsAt) > Date.now() + 3600000, 'short of players 10 s before the start: it waits for them', st);
r = await B.get('/notifications'); ok(r.text.includes('needs 1 more player'), 'joined players are told it is waiting');
r = await C.post(`/api/pools/${lp}/join`, {});
ok(r.status === 200 && /starts in/.test(r.j.message || ''), 'the second player starts it', r.j);
st = await state(C, lp); ok(st.state === 'soon' && Date.parse(st.startsAt) - Date.now() < 16000, 'it starts in ~15 s', st);
r = await N.post(`/api/pools/${lp}/join`, {}); ok(r.status === 409, 'the cap keeps a third player out', r.j);

console.log('Lapo matches');
r = await A.post('/api/pools', { name: 'Lapo ' + tag, start_mode: 'INSTANT', instant_players: '2', duration: '60', audience: 'LAPO', ack: true });
const lap = r.j.id;
r = await N.post(`/api/pools/${lap}/join`, {}); ok(r.status === 200, 'a Nepo baby can join a Lapo match', r.j);
ok(q(`SELECT lapo_rules FROM pools WHERE id='${lap}'`)[0].lapo_rules === 1, 'Lapo matches always use Lapo rules');
page = await N.get('/pool/' + lap); ok(page.text.includes('play as Lapo babies here'), 'pool page explains it');

console.log('Option switches');
await admin.post('/api/admin/settings', { opt_lapo_rules: false, opt_boosters: false });
page = await A.get('/pools/new'); ok(!page.text.includes('name="lapo_rules"') && !page.text.includes('name="boosters_allowed"'), 'options hidden for players when switched off');
r = await A.post('/api/pools', { name: 'Opt ' + tag, start_mode: 'INSTANT', instant_players: '2', duration: '60', lapo_rules: true, boosters_allowed: false, ack: true });
let row = q(`SELECT lapo_rules, boosters_allowed FROM pools WHERE id='${r.j.id}'`)[0];
ok(row.lapo_rules === 0 && row.boosters_allowed === 1, 'the server ignores switched-off options', row);
page = await admin.get('/pools/new'); ok(page.text.includes('name="lapo_rules"'), 'the super admin still has them');
await admin.post('/api/admin/settings', { opt_lapo_rules: true, opt_boosters: true });
page = await A.get('/pools/new'); ok(page.text.includes('name="lapo_rules"') && page.text.includes('name="boosters_allowed"'), 'back on for everybody');

console.log('Invites');
await C.post('/api/prefs', { allowInvites: false });
r = await A.post('/api/pools', { name: 'Inv ' + tag, start_mode: 'INSTANT', instant_players: '3', duration: '60', ack: true, invites: [B.name, C.name] });
ok(r.status === 200 && r.j.invited === 1, 'a player who switched invites off is skipped', r.j);
row = q(`SELECT user_id, emailed_at FROM pool_invites WHERE pool_id='${r.j.id}'`);
ok(row.length === 1 && row[0].user_id === B.id && row[0].emailed_at, 'the invited player got an invite email', row);
await C.post('/api/prefs', { allowInvites: true });
page = await C.get('/settings'); ok(page.text.includes('name="allowInvites"') && page.text.includes('name="emailGames"'), 'settings have the invite and game-email switches');
page = await new Client('x').get(`/unsub?k=games&u=x&t=y`); ok(page.text.includes('Stop top games emails?'), 'unsubscribe page for game emails');

console.log('Home page ad requests');
r = await B.post('/api/ad-requests', { title: 'My song ' + tag, youtube_url: 'https://youtu.be/dQw4w9WgXcQ', period: 'DAY', units: 2 });
ok(r.status === 402, 'needs money in the wallet', r.j);
await admin.post(`/api/admin/users/${B.id}/wallet`, { amount: '20000', note: 'test funds' });
r = await B.post('/api/ad-requests', { title: 'x', youtube_url: 'https://youtu.be/dQw4w9WgXcQ', period: 'DAY' }); ok(r.status === 400 && r.j.field === 'title', 'title is checked', r.j);
r = await B.post('/api/ad-requests', { title: 'No media ' + tag, period: 'DAY' }); ok(r.status === 400, 'needs a video or a picture link', r.j);
r = await B.post('/api/ad-requests', { title: 'My song ' + tag, youtube_url: 'https://youtu.be/dQw4w9WgXcQ', target_url: 'https://example.com', period: 'DAY', units: 2 });
ok(r.status === 200, 'applies and pays', r.j);
let w = (await B.get('/api/wallet')).j.wallet;
ok(w.balance_kobo === 2000000 - 1000000, '2 days × ₦5,000 taken', w);
const reqId = q(`SELECT id FROM ad_requests WHERE user_id='${B.id}' ORDER BY created_at DESC LIMIT 1`)[0].id;
page = await B.get('/advertise'); ok(page.text.includes('My song ' + tag) && page.text.includes('Waiting for Tap Am'), 'their request shows on Advertise');
r = await B.post(`/api/admin/ad-requests/${reqId}/publish`, { days: 2 }); ok(r.status === 403 || r.status === 401, 'players can’t publish', r.j);
r = await admin.post(`/api/admin/ad-requests/${reqId}/publish`, { days: 2, email: true, note: 'Enjoy!' });
ok(r.status === 200 && /2 days/.test(r.j.message), 'admin publishes it for 2 days', r.j);
page = await C.get('/dashboard'); ok(page.text.includes('My song ' + tag), 'it is on everybody’s home page');
r = await B.get('/notifications'); ok(r.text.includes('is live for 2 days'), 'the owner is told');
q(`UPDATE ad_requests SET live_until='2000-01-01T00:00:00Z' WHERE id='${reqId}'; UPDATE slides SET expires_at='2000-01-01T00:00:00Z' WHERE request_id='${reqId}'`); await sleep(2500);
page = await C.get('/dashboard'); ok(!page.text.includes('My song ' + tag), 'gone from the home page when its days are up');
await cron();
ok(q(`SELECT status FROM ad_requests WHERE id='${reqId}'`)[0].status === 'ENDED', 'the cron ends it');
r = await B.post('/api/ad-requests', { title: 'Second ' + tag, image_url: 'https://drive.google.com/file/abc', period: 'DAY' });
const r2 = q(`SELECT id FROM ad_requests WHERE user_id='${B.id}' AND title='Second ${tag}'`)[0].id;
r = await admin.post(`/api/admin/ad-requests/${r2}/reject`, { note: 'Picture is blurry' });
w = (await B.get('/api/wallet')).j.wallet;
ok(r.status === 200 && w.balance_kobo === 1000000, 'rejected and refunded', { r: r.j, w });
q(`DELETE FROM auth_throttle`); await sleep(2000);   // 5 applications a day
r = await B.post('/api/ad-requests', { title: 'Third ' + tag, youtube_url: 'https://youtu.be/dQw4w9WgXcQ', period: 'DAY' });
const r3 = q(`SELECT id FROM ad_requests WHERE user_id='${B.id}' AND title='Third ${tag}'`)[0].id;
r = await C.post(`/api/ad-requests/${r3}/cancel`); ok(r.status === 409, 'someone else can’t cancel it', r.j);
r = await B.post(`/api/ad-requests/${r3}/cancel`); w = (await B.get('/api/wallet')).j.wallet;
ok(r.status === 200 && w.balance_kobo === 1000000, 'the owner cancels and gets the money back', { r: r.j, w });
page = await admin.get(AP + '/ad-requests'); ok(page.status === 200 && page.text.includes('Second ' + tag) && page.text.includes('slide_price_day_kobo'), 'admin ad requests page with prices');

console.log('Inner circle');
q(`UPDATE users SET referred_by='${A.id}' WHERE id IN ('${B.id}','${C.id}')`); await sleep(2500);
r = await A.get('/inner-circle'); ok(r.status === 404, 'not a member: no rules page');
r = await admin.post(`/api/admin/users/${A.id}/inner`, { on: true }); ok(r.status === 200, 'admin adds a member', r.j);
r = await A.get('/inner-circle'); ok(r.status === 200 && r.text.includes('Keep it quiet') && r.text.includes('Only market the product'), 'member reads the rules');
r = await A.get('/invite'); ok(r.text.includes('spent') && r.text.includes(B.name) && r.text.includes('₦10,000'), 'member sees what each invitee spent (not their wallets)');
page = await admin.get(AP + '/inner-circle'); ok(page.text.includes(A.name), 'admin tab lists the member');
page = await admin.get(AP + `/inner-circle?m=${A.id}`); ok(page.text.includes(B.name) && page.text.includes('Wallet'), 'admin sees each invitee’s wallet and spend');
r = await admin.post('/api/admin/inner-circle/rules', { rules: 'Rule one: be nice and only market Tap Am.' }); ok(r.status === 200, 'admin edits the rules', r.j);
r = await A.get('/inner-circle'); ok(r.text.includes('Rule one: be nice'), 'members see the new rules');
r = await admin.post('/api/admin/inner-circle/send', { email: true }); ok(r.status === 200 && /Rules sent to \d+ member/.test(r.j.message), 'admin sends the rules', r.j);
await admin.post('/api/admin/inner-circle/rules', { rules: '' });

console.log('Gifts by email');
r = await admin.post(`/api/admin/users/${B.id}/gift`, { item: 'b-quick-3x', qty: 1, email: true });
ok(r.status === 200 && /emailed/.test(r.j.message), 'admin gift can also be emailed', r.j);

console.log('Home, winners, health');
page = await B.get('/dashboard'); ok(page.text.includes('data-stat="online"') && page.text.includes('visits'), 'home shows online and visits');
r = await B.post('/api/presence', { vid: 'test-visitor-' + tag }); ok(r.status === 200 && r.j.online >= 1 && r.j.visits >= 1, 'presence counts', r.j);
page = await B.get('/winners'); ok(page.status === 200 && page.text.includes('Top winners') && page.text.includes('Top tappers'), 'top winners page');
page = await admin.get(AP + '/health'); ok(page.text.includes('Server load') && page.text.includes('Database round trip'), 'health page shows server load');
page = await B.get('/u/' + B.name); ok(!page.text.includes('Share my profile') || page.text.includes('&quot;badgeTotal&quot;'), 'profile share card has badges, no QR');
r = await new Client('anon').get('/api/links'); ok(r.status === 200, 'links');

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
