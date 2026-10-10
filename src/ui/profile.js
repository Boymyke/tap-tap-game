// Me, settings, booster calculator, notifications, top tappers, ranks, suggest a pool.
import { appPage, anyPage, esc, naira, short, lagos, lagosDate, tierBadge, field, select, check, form, postBtn, upgradeAttrs, icon, nameTag, copyRow } from './kit.js';
import { ICONS } from './theme.js';
import { rankAvatar, avatarSvg, avatarFor, badgeSvg, RANK_LOOKS, STICKERS } from './avatar.js';
import { THEMES, SOUNDS, backgroundCss } from '../tiers.js';
import { RANK_TIERS } from '../game/ranks.js';

const pct = n => Math.round(Math.max(0, Math.min(1, n)) * 100);
const ME_CSS = `
.prof{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center;padding:18px}
.prof .ava{width:92px;height:92px}
.prof h1{margin:0 0 6px;font:900 clamp(26px,7vw,36px)/1 var(--display);overflow:hidden;text-overflow:ellipsis}
.badges{display:flex;gap:10px;overflow-x:auto;padding:4px 2px 8px;scrollbar-width:none}
.badges::-webkit-scrollbar{display:none}
.badges figure{flex:none;margin:0;display:grid;justify-items:center;align-content:start;gap:4px;width:96px;padding:10px 6px;border-radius:var(--r-sm);background:#fff;color:var(--ink);font:700 11px/1.2 var(--body);text-align:center;box-shadow:var(--sh)}
.badges figure b{display:block;font:900 15px/1 var(--display);color:var(--purple-d)}
.sbadge{display:grid;place-items:center;width:52px;height:52px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px var(--ink);color:#fff;font:900 15px/1 var(--display);text-shadow:var(--ts)}
.taps .pick{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
.taps .nums{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
.taps .nums div{padding:10px;border-radius:var(--r-sm);background:var(--cloud);text-align:center}
.taps .nums b{display:block;font:900 22px/1 var(--display);color:var(--ink)}
.taps .nums small{font:700 12px var(--body);color:var(--ink-soft)}
.chart{display:flex;align-items:flex-end;gap:2px;height:120px;padding:6px 2px 0;border-bottom:2px solid var(--line)}
.chart i{flex:1;min-width:2px;border-radius:3px 3px 0 0;background:var(--purple);position:relative}
.chart i.z{background:var(--line);height:2px!important}
.chart i.today{background:var(--green)}
.chart-x{display:flex;justify-content:space-between;font:700 11px var(--body);color:var(--ink-soft);margin-top:4px}
.mlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:6px;margin-top:14px}
.mlist a,.mlist span{display:block;padding:8px;border-radius:var(--r-in);background:var(--cloud);color:var(--ink);text-decoration:none;font:700 12px/1.25 var(--body)}
.mlist a[aria-current="true"]{box-shadow:inset 0 0 0 2px var(--ink)}
.mlist b{display:block;font:900 16px var(--display)}
.tiles{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media (min-width:700px){.tiles{grid-template-columns:repeat(4,1fr)}}
.tile{position:relative;display:flex;flex-direction:column;justify-content:flex-end;gap:2px;min-height:96px;padding:14px;text-decoration:none;font:900 18px/1.05 var(--display);cursor:pointer;text-align:left}
.tile small{font:600 12.5px/1.3 var(--body)}
.tile .ic{position:absolute;right:10px;top:10px;width:34px;height:34px}
.tile.is-locked{filter:grayscale(.5);opacity:.8}
.tile.is-locked::after{content:"";position:absolute;right:12px;top:12px;width:26px;height:26px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect x='8' y='17' width='24' height='19' rx='5' fill='%23FFD23F' stroke='%23150B33' stroke-width='2.5'/%3E%3Cpath d='M13 17v-4a7 7 0 0114 0v4' fill='none' stroke='%23150B33' stroke-width='3'/%3E%3C/svg%3E") center/contain no-repeat}
`;

// ── Me ──────────────────────────────────────────────────────────────────────
export function mePage(ctx) {
  const { user, tier, tierKey, rank, wallet, until, badges, perk, theme, bgCss, taps } = ctx;
  const next = rank.next;
  const req = next ? [
    next.min_taps ? `${short(user.lifetime_taps)} / ${short(next.min_taps)} lifetime taps` : '',
    next.min_games ? `${user.games_played} / ${next.min_games} games` : '',
    next.min_wins ? `${user.wins} / ${next.min_wins} wins` : ''].filter(Boolean) : [];
  const tile = (href, title, sub, c, locked = null) => locked
    ? `<button type="button" class="tcard tile ${c} is-locked" ${upgradeAttrs(locked, title)}>${title}<small>${sub}</small></button>`
    : `<a class="tcard tile ${c}" href="${href}">${title}<small>${sub}</small></a>`;
  const body = `
<section class="tcard prof c-purple" data-rank-level="${rank.current.level}" data-rank-name="${esc(rank.current.name)}">${rankAvatar(rank.current.level, { size: 92, title: rank.current.name })}
  <div style="min-width:0"><h1>${nameTag(user.username, user.emoji, user.emoji_meaning)}</h1><div class="row" style="justify-content:flex-start;gap:6px;flex-wrap:wrap">${tierBadge(tier)}${tierKey !== 'LAPO' && until ? `<span class="small" style="font-weight:700">till ${esc(lagosDate(until))}</span>` : ''}</div></div>
  <div style="grid-column:1/-1"><div class="row" style="font:800 14px var(--body);margin-bottom:6px"><span>${esc(rank.current.name)}</span><span>Rank ${rank.current.level}/100</span></div>
  <div class="bar-progress"><i style="width:${pct(rank.progress)}%"></i></div>
  ${next ? `<p class="small" style="margin:8px 0 0;font-weight:600">Next: <b>${esc(next.name)}</b> — ${esc(req.join(' · '))}</p>` : ''}</div>
</section>
${tierKey === 'LAPO' ? '<a class="btn btn--green btn--block btn--shine" style="margin-top:12px" href="/plans">Go Mapo or Nepo</a>' : ''}
${badges.length ? `<h2 class="h2">Your badges</h2><div class="badges">${badges.map(badgeFigure).join('')}</div>` : ''}
${taps ? tapsSection(taps) : ''}
<div class="grid g3" style="margin-top:14px;grid-template-columns:repeat(3,1fr)">
  <div class="panel stat"><span class="k">Lifetime taps</span><span class="v">${short(user.lifetime_taps)}</span></div>
  <div class="panel stat"><span class="k">Games</span><span class="v">${short(user.games_played)}</span></div>
  <div class="panel stat"><span class="k">Wins</span><span class="v">${short(user.wins)}</span></div>
</div>
<h2 class="h2">Your stuff</h2>
<div class="tiles">
  ${tile('/settings', 'Settings', 'Theme, sounds, account', 'c-ink')}
  ${tile('/bag', 'My bag', 'Boosters and skins', 'c-orange')}
  ${tile('/ranks', 'Ranks', 'What every rank unlocks', 'c-pink')}
  ${tile('/top', 'Top tappers', 'Day, week, month, year', 'c-sky')}
  ${tile('/plans', 'Plans', 'Lapo vs Mapo vs Nepo', 'c-sunny')}
  ${tile('/calc', 'Booster calculator', 'Where your booster hits hardest', 'c-teal', perk.calc ? null : 'MAPO')}
  ${tile('/suggest-pool', 'Suggest a pool', 'Tell us the pool you want', 'c-purple')}
  ${tile('/invite', 'Invite people', `${user.referral_count || 0} joined with your link`, 'c-green')}
</div>
<div class="actions" style="margin-top:18px"><a class="btn btn--white btn--sm" href="/rules">Game rules</a><button type="button" class="btn btn--ghost btn--sm" data-logout>Log out</button></div>`;
  return appPage({ user, title: 'Me', active: '/me', body, wallet, css: ME_CSS, theme, bgCss });
}

// A badge with the taps that won it. Special badges (made by the super admin) show their meaning.
function badgeFigure(b) {
  if (b.kind.startsWith('X:')) return `<figure title="${esc(b.smeaning || '')}"><span class="sbadge" style="background:${/^#[0-9a-fA-F]{6}$/.test(b.scolor || '') ? b.scolor : '#9161FF'}">${esc((b.slabel || b.sname || '?').slice(0, 3))}</span><figcaption>${esc(b.sname || 'Special badge')}${b.smeaning ? `<br><span style="font-weight:600">${esc(b.smeaning)}</span>` : ''}</figcaption></figure>`;
  const what = b.kind === 'ALL' ? 'era' : b.kind.toLowerCase();
  return `<figure>${badgeSvg(b.kind, { size: 52 })}<figcaption>Tapper of the ${what}<br>${esc(b.period.slice(1))}<b>${short(b.taps || 0)} taps</b></figcaption></figure>`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "Your taps": today, this month, lifetime + a daily chart for the picked month and a month list for the year.
function tapsSection(t) {
  const daysIn = new Date(Date.UTC(+t.y, +t.m, 0)).getUTCDate();
  const byDay = Object.fromEntries(t.days.map(d => [d.period.slice(9), Number(d.taps)]));
  const byMonth = Object.fromEntries(t.months.map(d => [d.period.slice(6), Number(d.taps)]));
  const max = Math.max(1, ...Object.values(byDay));
  const todayKey = new Date(Date.now() + 3600000).toISOString().slice(0, 10);
  const monthTotal = Object.values(byDay).reduce((a, b) => a + b, 0);
  const bars = Array.from({ length: daysIn }, (_, i) => {
    const d = String(i + 1).padStart(2, '0'), n = byDay[d] || 0;
    return `<i class="${n ? '' : 'z'} ${`${t.y}-${t.m}-${d}` === todayKey ? 'today' : ''}" style="height:${Math.max(3, Math.round(n / max * 100))}%" title="${MONTHS[+t.m - 1]} ${+d}: ${n.toLocaleString('en-NG')} taps"></i>`;
  }).join('');
  return `<h2 class="h2">Your taps</h2>
<section class="panel taps">
  <div class="nums"><div><b>${short(t.today)}</b><small>Today</small></div><div><b>${short(t.month)}</b><small>This month</small></div><div><b>${short(t.lifetime)}</b><small>Lifetime</small></div></div>
  <form class="pick" method="get" action="/me" data-autosubmit>
    <div><label class="ta-label" for="f-y">Year</label><select class="ta-input" id="f-y" name="y">${t.years.map(y => `<option ${y === t.y ? 'selected' : ''}>${esc(y)}</option>`).join('')}</select></div>
    <div><label class="ta-label" for="f-m">Month</label><select class="ta-input" id="f-m" name="m">${MONTHS.map((n, i) => { const v = String(i + 1).padStart(2, '0'); return `<option value="${v}" ${v === t.m ? 'selected' : ''}>${n}</option>`; }).join('')}</select></div>
  </form>
  <div class="row" style="font:800 14px var(--body);margin-bottom:6px"><span>${MONTHS[+t.m - 1]} ${esc(t.y)}, day by day</span><span>${monthTotal.toLocaleString('en-NG')} taps</span></div>
  <div class="chart" role="img" aria-label="Taps per day in ${MONTHS[+t.m - 1]} ${esc(t.y)}">${bars}</div>
  <div class="chart-x"><span>1</span><span>${Math.ceil(daysIn / 2)}</span><span>${daysIn}</span></div>
  <div class="mlist">${MONTHS.map((n, i) => { const v = String(i + 1).padStart(2, '0'); return `<a href="/me?y=${esc(t.y)}&m=${v}" aria-current="${v === t.m}">${n}<b>${short(byMonth[v] || 0)}</b></a>`; }).join('')}</div>
  <p class="small muted" style="margin:10px 0 0">Taps count when each pool ends (Lagos time).</p>
</section>`;
}

// ── Invite people (players and sponsors) ────────────────────────────────────
export function invitePage(ctx) {
  const { user, wallet, origin, joined, referralBatch, theme, bgCss } = ctx;
  const refUrl = `${origin}/signup?ref=${user.referral_code || ''}`;
  const sponsor = user.role === 'SPONSOR';
  const card = { url: refUrl, title: `${user.username} dey call you!`, line: 'Join Tap Am, tap fast and win prizes.', kind: 'invite', color: '#2E8BFF', display: 'www.tapammm.live' };
  const body = `<h1 class="h1">Invite people</h1>
<p class="sub">${sponsor ? 'Bring your customers and fans to play your pools. Everyone who signs up with your link shows here.' : `Every ${referralBatch} people wey join with your link = 1 free booster for you.`}</p>
<section class="tcard card c-sky" style="display:grid;grid-template-columns:minmax(0,1fr);gap:12px">
  <p style="margin:0;font-weight:700">You don bring <b style="font-size:20px">${short(user.referral_count || 0)}</b> ${Number(user.referral_count) === 1 ? 'person' : 'people'}.</p>
  ${copyRow(refUrl, 'Copy')}
  <div class="row" style="gap:8px"><button type="button" class="btn btn--white btn--sm" style="flex:1" data-share-url="${esc(refUrl)}" data-share-text="Come play Tap Am with me! Use my link:">${ICONS.share} Share link</button><button type="button" class="btn btn--sm" style="flex:1" data-share-card='${esc(JSON.stringify(card))}'>${ICONS.qr} QR card</button></div>
</section>
<h2 class="h2">People wey join</h2>
${joined.length ? `<div class="list">${joined.map(j => `<div class="item"><div class="grow"><div class="t">${esc(j.username)}</div><div class="s">Joined ${esc(lagosDate(j.created_at))}</div></div></div>`).join('')}</div>` : '<div class="empty">Nobody yet. Share your link!</div>'}`;
  return appPage({ user, title: 'Invite people', active: '', body, wallet, narrow: true, theme, bgCss });
}

// ── Settings ────────────────────────────────────────────────────────────────
const SET_CSS = `
.set h2{margin:0 0 4px;font:900 20px var(--display);color:var(--ink)}
.set p.sub2{margin:0 0 12px;color:var(--ink-soft);font-size:14px}
.bgs{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:10px}
.bgopt{position:relative;display:grid;align-content:end;height:86px;padding:8px;border-radius:var(--r-sm);border:3px solid #fff;box-shadow:0 0 0 2px var(--line);color:#fff;font:800 12px var(--body);text-shadow:var(--ts);cursor:pointer;overflow:hidden}
.bgopt input{position:absolute;opacity:0}
.bgopt:has(input:checked){box-shadow:0 0 0 3px var(--ink)}
.bgopt:has(input:checked)::after{content:"";position:absolute;right:10px;top:10px;width:12px;height:7px;border:3px solid #fff;border-top:0;border-right:0;transform:rotate(-45deg);filter:drop-shadow(0 1px 0 rgba(0,0,0,.6))}
.sndrow{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end}
`;
export function settingsPage(ctx) {
  const { user, tierKey, prefs, backgrounds, wallet, theme, bgCss } = ctx;
  const nepo = tierKey === 'NEPO', paid = tierKey !== 'LAPO';
  const curTheme = nepo && THEMES[prefs.theme] ? prefs.theme : 'grape';
  const swatches = Object.entries(THEMES).map(([k, t]) => `<label class="swatch ${nepo || k === 'grape' ? '' : 'locked'}" style="background:linear-gradient(135deg,${t.a},${t.b})" title="${esc(t.name)}"><input type="radio" name="theme" value="${k}" ${k === curTheme ? 'checked' : ''} ${nepo || k === 'grape' ? '' : 'disabled'} aria-label="${esc(t.name)} theme"></label>`).join('');
  const lvl = user.rank_level || 1;
  const soundOpts = SOUNDS.map(snd => [snd.id, `${snd.name}${!paid && snd.id !== 'pop' ? ' (Mapo/Nepo)' : lvl < snd.minRank ? ` (rank ${snd.minRank})` : ''}`]);
  const body = `<h1 class="h1">Settings</h1>
<div class="panel set">
  <h2>App theme</h2><p class="sub2">${nepo ? 'Pick one of 10 colours for your whole app.' : 'Nepo babies pick from 10 app colours.'}</p>
  ${nepo ? form('/api/prefs', `<div class="swatches">${swatches}</div>`, { submit: 'Save theme' }) : `<div class="swatches" style="margin-bottom:12px">${swatches}</div><button type="button" class="btn btn--soft btn--block" ${upgradeAttrs('NEPO', 'App themes')}>${ICONS.lock} Unlock themes with Nepo</button>`}
</div>
<div class="panel set">
  <h2>Background</h2><p class="sub2">${nepo ? 'Backgrounds made by the Tap Am team. Shows across the app and in games.' : 'Nepo babies can change their background.'}</p>
  ${nepo ? form('/api/prefs', `<div class="bgs"><label class="bgopt" style="background:linear-gradient(165deg,#6A35FF,#1B0B4D)"><input type="radio" name="bg" value="none" ${!prefs.bg ? 'checked' : ''}>Default</label>${backgrounds.map(b => `<label class="bgopt" style="background:${esc(backgroundCss(b))}"><input type="radio" name="bg" value="${esc(b.id)}" ${prefs.bg === b.id ? 'checked' : ''}>${esc(b.name)}</label>`).join('')}</div>`, { submit: 'Save background' })
    : `<div class="bgs" style="margin-bottom:12px">${backgrounds.slice(0, 4).map(b => `<div class="bgopt" style="background:${esc(backgroundCss(b))};opacity:.6">${esc(b.name)}</div>`).join('')}</div><button type="button" class="btn btn--soft btn--block" ${upgradeAttrs('NEPO', 'Backgrounds')}>${ICONS.lock} Unlock backgrounds with Nepo</button>`}
</div>
<div class="panel set">
  <h2>Tap sound</h2><p class="sub2">${paid ? 'More sounds unlock as you rank up.' : 'Mapo and Nepo babies change their tap sound. More unlock as you rank up.'}</p>
  ${paid ? form('/api/prefs', `<div class="sndrow">${select({ label: 'Sound', name: 'sound', options: soundOpts, value: prefs.sound || 'pop' })}<button type="button" class="btn btn--soft" data-try-sound>Try</button></div>`, { submit: 'Save sound' })
    : `<button type="button" class="btn btn--soft btn--block" ${upgradeAttrs('MAPO', 'Tap sounds')}>${ICONS.lock} Unlock tap sounds</button>`}
</div>
<div class="panel set">
  <h2>Game</h2>
  ${form('/api/prefs', `${check({ name: 'vibrate', label: 'Vibrate on combos and milestones', checked: prefs.vibrate !== false })}${check({ name: 'muted', label: 'Start games with sound off', checked: !!prefs.muted })}`, { submit: 'Save' })}
</div>
<div class="panel set">
  <h2>Account</h2><p class="sub2">${esc(user.username)} · ${esc(user.email || '')}</p>
  <div class="actions" style="margin-top:0"><button type="button" class="btn btn--soft btn--sm" data-logout>Log out</button><a class="btn btn--soft btn--sm" href="/privacy">Privacy</a></div>
</div>
<div class="panel set" style="box-shadow:0 0 0 3px var(--danger),var(--sh)">
  <h2>Archive my account</h2><p class="sub2">Hides your profile and logs you out everywhere. Log in again within 30 days to bring it back. After that, contact us to restore it. Withdraw your winnings first — wallet money can’t be withdrawn.</p>
  ${form('/api/account/archive', `${field({ label: 'Your password', name: 'password', type: 'password', attrs: 'autocomplete="current-password" required' })}${check({ name: 'confirm', label: 'I understand my account will be archived.' })}`, { submit: 'Archive account', btn: 'btn--danger' })}
</div>`;
  const script = `var t=document.querySelector('[data-try-sound]');if(t)t.addEventListener('click',function(){var s=t.closest('form').querySelector('select[name=sound]').value;TA.loadScript('/assets/sounds.js?v=7').then(function(){window.TASound.play(s,12,true);});});`;
  return appPage({ user, title: 'Settings', active: '/me', body, wallet, css: SET_CSS, script, narrow: true, theme, bgCss });
}

// ── Booster calculator ──────────────────────────────────────────────────────
export function calcPage(ctx) {
  const { user, wallet, theme, bgCss } = ctx;
  const body = `<h1 class="h1">Booster calculator</h1><p class="sub">We look at your live pools, the scores around you and your tap speed, then show where your boosters move you the most.</p>
<div class="panel"><label class="ta-label" for="rate">Your speed (taps per second)</label><div class="row" style="gap:8px"><input class="ta-input" id="rate" type="number" min="1" max="40" value="6" inputmode="numeric"><button class="btn btn--green" id="go" type="button">Calculate</button></div><p class="small muted" style="margin:8px 0 0">Not sure? Most people do 5–8 with one finger. Try the 10-second game on the home page.</p></div>
<div id="out" style="margin-top:14px"></div>`;
  const script = `
(function(){var out=document.getElementById('out'),r=document.getElementById('rate');try{var b=localStorage.getItem('ta-best');if(b)r.value=Math.max(1,Math.round(+b/10));}catch(e){}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function run(){out.innerHTML='<div class="empty"><span class="ring"></span></div>';TA.api('/api/calc?rate='+encodeURIComponent(r.value),undefined,'GET').then(function(j){
 if(!j._ok){out.innerHTML='<div class="empty">'+esc(j.error||'Error')+'</div>';return;}
 if(!j.pools.length){out.innerHTML='<div class="empty">Join some pools first, then come back.</div>';return;}
 var h='';if(j.best)h+='<div class="tcard card c-green" style="margin-bottom:14px"><h3>Best move</h3><p>Use <b>'+j.best.uses+'× '+esc(j.best.itemName)+'</b> in <b>'+esc(j.best.poolName)+'</b> — e fit carry you to the <b>top '+j.best.reach+'</b>.</p><a class="btn btn--sm" href="/play?pools='+encodeURIComponent(j.best.pool)+'" data-no-swap>Go there</a></div>';
 else h+='<div class="panel" style="margin-bottom:14px">No booster go change your position much right now. Keep tapping and check again.</div>';
 j.pools.forEach(function(p){h+='<div class="panel" style="margin-bottom:12px"><div class="row"><b style="font:900 19px var(--display)">'+esc(p.name)+'</b><span class="badge">#'+(p.rank||'—')+' of '+p.total+'</span></div>';
  if(!p.boostersAllowed)h+='<p class="small muted" style="margin:6px 0 0">Boosters are off here.</p>';
  else if(!p.options.length)h+='<p class="small muted" style="margin:6px 0 0">You have no boosters. <a href="/store">Get some</a>.</p>';
  else{h+='<div class="tbl-wrap" style="margin-top:10px;box-shadow:none"><table class="tbl" style="min-width:0"><tr><th>Booster</th><th>+taps each</th><th>To #1</th><th>Top 3</th><th>Top 10</th></tr>';p.options.forEach(function(o){var u=function(n){return n===0?'In':n+'×'};h+='<tr><td>'+esc(o.name)+' <span class="small muted">(have '+o.owned+')</span></td><td>+'+o.extraPerUse+'</td><td>'+(o.toTop1===0?'You lead':u(o.toTop1))+'</td><td>'+u(o.toTop3)+'</td><td>'+u(o.toTop10)+'</td></tr>'});h+='</table></div>';}
  h+='</div>';});out.innerHTML=h;});}
document.getElementById('go').addEventListener('click',run);run();})();`;
  return appPage({ user, title: 'Booster calculator', active: '/me', body, wallet, script, narrow: true, theme, bgCss });
}

// ── Notifications ───────────────────────────────────────────────────────────
export function notificationsPage(ctx) {
  const { user, notes, wallet, theme, bgCss } = ctx;
  const body = `<h1 class="h1">Notifications</h1>${notes.length ? `<div class="list">${notes.map(n => `<a class="item" href="${esc(n.link && n.link.startsWith('/') ? n.link : '#')}" style="${n.read ? '' : 'box-shadow:0 0 0 3px var(--green),0 4px 0 rgba(21,11,51,.22)'}"><div class="grow"><div style="font-weight:600">${esc(n.text)}</div><div class="s">${esc(lagos(n.created_at))}</div></div></a>`).join('')}</div>` : '<div class="empty">Nothing yet.</div>'}`;
  return appPage({ user, title: 'Notifications', body, wallet, script: `TA.api('/api/notifications/read',{});var d=document.querySelector('.bell .dot');if(d)d.remove();`, theme, bgCss });
}

// ── Top tappers (day / week / month / year / all time) ──────────────────────
const TOP_CSS = `.podium{display:grid;grid-template-columns:1fr 1.15fr 1fr;align-items:end;gap:10px;margin:6px 0 16px}
.podium>div{display:grid;justify-items:center;gap:6px;padding:12px 8px;border-radius:22px;text-align:center}
.podium .n{font:900 15px/1.1 var(--display);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.podium .s{font:800 13px var(--body)}
.podium .p1{padding-top:18px}
.mini-ava{flex:none;width:40px;height:40px}`;
export function topPage(ctx) {
  const { user, period, rows, me, label, wallet, theme, bgCss, badgeKind } = ctx;
  const tabs = [['DAY', 'Today'], ['WEEK', 'This week'], ['MONTH', 'This month'], ['YEAR', 'This year'], ['ALL', 'All time']];
  const [a, b, c] = rows;
  const pod = (r, cls, place) => r ? `<div class="tcard ${cls} ${place === 1 ? 'p1' : ''}">${avatarSvg(avatarFor(r.username), { size: place === 1 ? 74 : 58 })}<div class="n">${esc(r.username)}</div><div class="s">${short(r.taps)} taps</div></div>` : '<div></div>';
  const body = `<h1 class="h1">Top tappers</h1><p class="sub">Whoever taps the most ${label} wins the <b style="color:#fff">Tapper of the ${badgeKind.toLowerCase()}</b> badge. Taps count when a pool ends.</p>
<nav class="tabs">${tabs.map(([k, l]) => `<a href="/top?p=${k}" ${k === period ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
${rows.length ? `<div class="podium">${pod(b, 'c-sky', 2)}${pod(a, 'c-sunny', 1)}${pod(c, 'c-pink', 3)}</div>
<div class="list">${rows.slice(3).map((r, i) => `<div class="item ${user && r.id === user.id ? 'me' : ''}"><b style="width:38px;font:900 18px var(--display);color:var(--ink-soft)">#${i + 4}</b><div class="mini-ava">${avatarSvg(avatarFor(r.username), { size: 40 })}</div><div class="grow"><div class="t">${esc(r.username)}</div><div class="s">${esc(r.rank_name || '')}</div></div><b class="amt">${short(r.taps)}</b></div>`).join('')}</div>
${me && me.pos > rows.length ? `<div class="item me" style="margin-top:12px"><b style="width:38px;font:900 18px var(--display)">#${me.pos}</b><div class="grow"><div class="t">You</div></div><b class="amt">${short(me.taps)}</b></div>` : ''}` : `<div class="empty">No taps counted ${label} yet. ${user ? '<a href="/pools">Go tap!</a>' : '<a href="/signup">Join and tap!</a>'}</div>`}
<div class="panel" style="margin-top:18px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">${['DAY', 'WEEK', 'MONTH', 'YEAR'].map(k => badgeSvg(k, { size: 44 })).join('')}<p style="margin:0;flex:1;min-width:180px" class="small">Badges are given when each day, week, month and year ends. They show on your profile forever.</p></div>`;
  return anyPage({ user, title: 'Top tappers', active: '/me', body, css: TOP_CSS, theme, bgCss, description: 'The fastest fingers on Tap Am today, this week, month and year.' });
}

// ── Ranks: what every rank offers ───────────────────────────────────────────
const RANKS_CSS = `.rgrid{display:grid;gap:14px}
@media (min-width:760px){.rgrid{grid-template-columns:1fr 1fr}}
.rcard{display:grid;grid-template-columns:auto 1fr;gap:12px;padding:14px;align-items:start}
.rcard h3{margin:2px 0 4px;font:900 21px/1.05 var(--display)}
.rcard .lv{font:800 12px var(--body);opacity:.9}
.rcard ul{grid-column:1/-1;margin:4px 0 0;padding:0;list-style:none;display:grid;gap:5px;font:600 13.5px/1.35 var(--body)}
.rcard li{padding:7px 10px;border-radius:12px;background:rgba(0,0,0,.22);text-shadow:none;color:#fff}
.rcard.c-sunny li,.rcard.c-green li{background:rgba(255,255,255,.55);color:var(--ink)}
.rcard.me{outline:4px solid var(--green);outline-offset:3px}
.rcard.locked{filter:saturate(.7)}`;
const UNLOCK_NAMES = { voice: 'Live voice in games (Nepo, top 5)', 'skin-kente': 'Kente tap skin', 'skin-neon': 'Neon night tap skin', 'booster-long': 'Long Thing 2× booster', 'booster-4x': 'Gbas Gbos 4× booster', 'booster-5x': 'Odogwu 5× booster', 'booster-8x': 'Jaga Jaga 8× booster', 'booster-10x': 'Odogwu Pro 10× booster' };
const unlockName = k => UNLOCK_NAMES[k] || (k.startsWith('sound-') ? `${(SOUNDS.find(s => s.id === k.slice(6)) || { name: k.slice(6) }).name} tap sound` : k);
export function ranksPage(ctx) {
  const { user, ranks, myLevel, wallet, theme, bgCss } = ctx;
  const COLORS = ['c-sky', 'c-purple', 'c-teal', 'c-orange', 'c-pink', 'c-sunny', 'c-green'];
  const tiers = RANK_TIERS.map((_, t) => ranks.filter(r => Math.floor((r.level - 1) / 5) === t)).filter(x => x.length);
  const extra = ranks.filter(r => r.level > 100);
  const card = (list, t) => {
    const first = list[0], last = list[list.length - 1];
    const tierName = first.name.replace(/\s+(I|II|III|IV|V)$/, '');
    const unlocks = list.flatMap(r => (r.unlocks || '').split(',').filter(Boolean).map(u => `Rank ${r.level}: ${unlockName(u)}`));
    const mine = myLevel >= first.level && myLevel <= last.level;
    return `<section class="tcard rcard ${COLORS[t % COLORS.length]} ${mine ? 'me' : ''} ${myLevel && myLevel < first.level ? 'locked' : ''}">${rankAvatar(first.level, { size: 72, title: tierName })}
      <div><div class="lv">Ranks ${first.level}–${last.level}${mine ? ' · You are here' : ''}</div><h3>${esc(tierName)}</h3><div class="small" style="font-weight:700">${first.min_taps ? short(first.min_taps) + ' taps' : 'Start here'}${first.min_games ? ` · ${first.min_games} games` : ''}${first.min_wins ? ` · ${first.min_wins} wins` : ''}</div></div>
      <ul>${unlocks.length ? unlocks.map(u => `<li>${esc(u)}</li>`).join('') : '<li>Bragging rights and a new look</li>'}${last.min_taps ? `<li>To finish this tier: ${short(last.min_taps)} taps${last.min_games ? ', ' + last.min_games + ' games' : ''}${last.min_wins ? ', ' + last.min_wins + ' wins' : ''}</li>` : ''}</ul></section>`;
  };
  const body = `<h1 class="h1">Ranks</h1><p class="sub">100 ranks in 20 tiers. Climb by tapping, playing games and winning. Every tier comes with a new character — and some unlock boosters, skins, sounds and live voice.</p>
<div class="rgrid">${tiers.map(card).join('')}${extra.length ? card(extra, 21) : ''}</div>`;
  return anyPage({ user, title: 'Ranks', active: '/me', body, css: RANKS_CSS, theme, bgCss, description: 'Every Tap Am rank and what it unlocks.' });
}

// ── Suggest a pool ──────────────────────────────────────────────────────────
export function suggestPoolPage(ctx) {
  const { user, wallet, mine, theme, bgCss } = ctx;
  const body = `<h1 class="h1">Suggest a pool</h1><p class="sub">Tell us the pool you want — a VS battle, a big prize, a special day. If the Tap Am team likes it, we go open am.</p>
<div class="panel">${form('/api/suggest-pool', `
  ${field({ label: 'Pool name', name: 'name', placeholder: 'Lagos vs Abuja Friday', attrs: 'maxlength="60" required autocomplete="off"' })}
  ${select({ label: 'Type', name: 'type', options: [['FREE', 'Free pool'], ['PAID', 'Paid pool'], ['VS', 'VS (two sides)']] })}
  ${field({ label: 'Sides (for VS)', name: 'sides', placeholder: 'Jollof vs Fried rice', attrs: 'maxlength="60"' })}
  ${field({ label: 'When?', name: 'when', placeholder: 'Friday night, 8pm', attrs: 'maxlength="60"' })}
  <div class="ta-field"><label class="ta-label" for="f-idea">Tell us more</label><textarea class="ta-input" id="f-idea" name="idea" maxlength="600" required placeholder="Who should play, the prize, why e go sweet…"></textarea><p class="ta-error" data-err="idea"></p></div>`, { submit: 'Send suggestion', shine: true })}</div>
${mine.length ? `<h2 class="h2">Your suggestions</h2><div class="list">${mine.map(s => `<div class="item"><div class="grow"><div class="t">${esc(s.message.split('\n')[0])}</div><div class="s">${esc(lagos(s.created_at))}</div></div><span class="badge ${s.status === 'DONE' ? 'live' : 'soon'}">${s.status === 'DONE' ? 'Opened' : 'Sent'}</span></div>`).join('')}</div>` : ''}`;
  return appPage({ user, title: 'Suggest a pool', active: '/me', body, wallet, narrow: true, theme, bgCss });
}
