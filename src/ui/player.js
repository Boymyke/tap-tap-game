// Player pages: home, pools list, pool detail (lobby / instructions / results), create pool.
import { tapoffButton, appPage, anyPage, esc, naira, nairaShort, short, compact, lagos, lagosDate, poolCard, tierBadge, stateBadge, whenPill, field, moneyField, select, choice, check, form, copyRow, copyBtn, upgradeAttrs, icon, nameTag, postBtn, playerPicker, fmtDur, pager } from './kit.js';
import { ICONS } from './theme.js';
import { rankAvatar, avatarSvg, avatarFor } from './avatar.js';
import { PATTERNS, patternBg } from './patterns.js';
import { splitText, INSTANT_LEAD_MS } from '../game/pools.js';

const pct = n => Math.round(Math.max(0, Math.min(1, n)) * 100);
const TAPOFF_ICON = '🥊';
const HEAD_CSS = '.pools-head{flex-wrap:wrap;gap:10px}.hbtns{display:flex;gap:8px;flex-wrap:nowrap;margin-left:auto}';
const shareCardAttr = d => `data-share-card='${esc(JSON.stringify(d))}'`;

export const HOME_CSS = `
.slides{position:relative;margin:2px 0 16px}
.livestats{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}
.livestats .ls{display:inline-flex;align-items:center;gap:7px;padding:7px 13px;border-radius:999px;background:rgba(21,11,51,.35);color:#fff;font-weight:700;font-size:14px;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.18)}
.livestats b{font:900 16px var(--display);color:var(--green);font-variant-numeric:tabular-nums}
.livestats .dot{width:9px;height:9px;border-radius:50%;background:var(--green);box-shadow:0 0 0 0 rgba(0,255,110,.6);animation:lsPulse 1.8s infinite}
@keyframes lsPulse{70%{box-shadow:0 0 0 8px rgba(0,255,110,0)}100%{box-shadow:0 0 0 0 rgba(0,255,110,0)}}
@media (prefers-reduced-motion:reduce){.livestats .dot{animation:none}}
.slides-track{display:grid;grid-auto-flow:column;grid-auto-columns:100%;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;border-radius:var(--r)}
.slides-track::-webkit-scrollbar{display:none}
.slide{scroll-snap-align:start;position:relative;display:grid;grid-template-columns:1fr auto;align-items:center;gap:10px;min-height:156px;padding:18px 16px 18px 20px;border-radius:var(--r);text-decoration:none;overflow:hidden;border:3px solid rgba(255,255,255,.92);box-shadow:0 6px 0 rgba(0,0,0,.25)}
.slide h3{margin:6px 0 4px;font:900 clamp(22px,6vw,30px)/1.02 var(--display);text-shadow:var(--ts-big)}
.slide p{margin:0 0 10px;font:600 14px/1.4 var(--body)}
.slide.img-only{display:block;min-height:0;aspect-ratio:16/7;padding:0}
.slide.img-only img.full{position:static;display:block;width:100%;height:100%}
.slide.img-only .cta{position:absolute;left:14px;bottom:12px;z-index:2}
.slide img.full{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.slide.has-img::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.55),rgba(0,0,0,0) 70%)}
.slide.has-img>div{position:relative;z-index:2}
.slides-dots{display:flex;gap:6px;justify-content:center;margin-top:10px}
.slides-dots button{width:8px;height:8px;padding:0;border:0;border-radius:99px;background:rgba(255,255,255,.4);cursor:pointer}
.slides-dots button[aria-current="true"]{width:22px;background:var(--green)}
.welcome{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center;padding:16px}
.welcome .ava{width:78px;height:78px;filter:drop-shadow(0 4px 0 rgba(0,0,0,.25))}
.welcome .hi{font:700 14px var(--body)}
.welcome .nm{font:900 clamp(24px,7vw,32px)/1 var(--display);margin:2px 0 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.welcome .rk{display:flex;justify-content:space-between;gap:8px;font:800 13px var(--body);margin:10px 0 6px}
.welcome .won{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-radius:18px;background:rgba(0,0,0,.25);text-shadow:none}
.welcome .won b{display:block;font:900 26px/1 var(--display);color:var(--green)}
.welcome .won small{font:700 12px var(--body);color:#fff;opacity:.9}
.codebox{padding:14px}
.codebox .row{gap:8px}
.codebox .ta-input{text-transform:uppercase;font-weight:800;letter-spacing:1px}
.codebox .ta-input::placeholder{text-transform:none;letter-spacing:0}
.bigcreate{width:100%;margin-top:12px;min-height:58px;font-size:20px}
.bigrow{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:10px}
.bigrow .bigcreate{padding-left:10px;padding-right:10px}
.invite{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;padding:18px}
`;

// ── Home ────────────────────────────────────────────────────────────────────
export function dashboardPage(ctx) {
  const { user, tier, rank, wallet, slides, sponsored, live, upcoming, mine, perk, origin, theme, bgCss } = ctx;
  const refUrl = `${origin}/signup?ref=${user.referral_code || ''}`;
  // Slides made by the super admin: either a picture (with just the button on it) or a colour with words.
  // Until the admin adds any, the Tap Am cards show.
  const shown = slides.length ? slides : defaultSlides(perk);
  const slideHtml = shown.map((s, i) => {
    const href = s.demo ? esc(s.link) : `/s/${esc(s.id)}`, cta = esc(s.cta || 'Check am'), noSwap = s.demo ? '' : 'data-no-swap';
    if (s.image_url) return `<a class="slide img-only" href="${href}" ${noSwap} aria-label="${esc(s.title)}"><img class="full" src="${esc(s.image_url)}" alt="${esc(s.title)}" loading="${i ? 'lazy' : 'eager'}"><span class="btn btn--white btn--sm cta">${cta}</span></a>`;
    return `<a class="slide" href="${href}" style="background:${esc(/^#[0-9a-fA-F]{6}$/.test(s.color || '') ? s.color : '#2E8BFF')}" ${noSwap} aria-label="${esc(s.title)}">
      <div><span class="tag">${s.sponsor ? 'Sponsored · ' + esc(s.sponsor) : esc(s.tag || 'Tap Am')}</span><h3>${esc(s.title)}</h3>${s.subtitle ? `<p>${esc(s.subtitle)}</p>` : ''}<span class="btn btn--white btn--sm">${cta}</span></div></a>`;
  }).join('');
  const count = shown.length;
  const section = (title, list, href, empty) => `<h2 class="h2">${title}${href ? ` <a href="${href}">See all</a>` : ''}</h2>${list.length ? `<div class="hscroll">${list.map(poolCard).join('')}</div>` : `<div class="empty">${empty}</div>`}`;
  const body = `${ctx.s?.overload === '1' ? '<div class="panel" style="margin-bottom:14px;box-shadow:0 0 0 3px var(--sunny),var(--sh)"><b>Our servers dey overloaded.</b><p class="muted" style="margin:6px 0 0">We paused the games for now and gave everybody back the money and boosters they spent on them. The pools will restart soon — check your notifications.</p></div>' : ''}
${ctx.stats ? `<div class="livestats" aria-label="Tap Am right now"><span class="ls"><i class="dot" aria-hidden="true"></i><b data-stat="online" data-n="${Number(ctx.stats.online) || 1}">${esc(compact(ctx.stats.online || 1))}</b> online now</span><span class="ls"><b data-stat="visits" data-n="${Number(ctx.stats.visits) || 0}">${esc(compact(ctx.stats.visits || 0))}</b> visits</span></div>` : ''}
${count ? `<section class="slides" data-slides aria-roledescription="carousel" aria-label="Featured">
  <div class="slides-track">${slideHtml}</div>
  ${count > 1 ? `<div class="slides-dots">${Array.from({ length: count }, (_, i) => `<button type="button" aria-label="Slide ${i + 1}" aria-current="${i === 0}"></button>`).join('')}</div>` : ''}
</section>` : ''}
<section class="tcard welcome ${tier === 'Nepo baby' ? 'c-pink' : tier === 'Mapo baby' ? 'c-teal' : 'c-purple'}" data-rank-level="${rank.current.level}" data-rank-name="${esc(rank.current.name)}">
  <a href="/ranks" aria-label="Your rank character">${rankAvatar(rank.current.level, { size: 78, title: rank.current.name })}</a>
  <div style="min-width:0"><div class="hi">Welcome back</div><div class="nm">${nameTag(user.username, user.emoji, user.emoji_meaning)}</div>${tierBadge(tier)}</div>
  <div style="grid-column:1/-1"><div class="rk"><span>${esc(rank.current.name)}</span><span>Rank ${rank.current.level}/100</span></div>
  <div class="bar-progress" role="progressbar" aria-valuenow="${pct(rank.progress)}" aria-valuemin="0" aria-valuemax="100" aria-label="Progress to next rank"><i style="width:${pct(rank.progress)}%"></i></div>
  <p class="small" style="margin:6px 0 0;font-weight:600">${rank.next ? `${pct(rank.progress)}% to <b>${esc(rank.next.name)}</b>` : 'You don reach the top. Legend!'}</p></div>
  <a class="won" href="/wallet" style="text-decoration:none;color:#fff"><span><small>Your winnings</small><b>${esc(naira(wallet.winnings_kobo))}</b></span><span class="btn btn--green btn--sm">Withdraw</span></a>
</section>

<h2 class="h2" style="margin-top:20px">Join a pool with a code</h2>
<form class="panel codebox" data-api="/api/pools/find" novalidate>
  <div class="row"><input class="ta-input" name="code" placeholder="Pool code, like TAPX7K2M" autocapitalize="characters" autocomplete="off" maxlength="12" aria-label="Pool code"><button class="btn btn--green" type="submit">Go</button></div>
  <p class="ta-error" data-err="code"></p>
</form>
<div class="bigrow">${perk.create ? '<a class="btn btn--white btn--shine bigcreate" href="/pools/new">+ Create a pool</a>' : `<button type="button" class="btn btn--white bigcreate" ${upgradeAttrs('MAPO', 'Creating your own pool')}>${ICONS.lock} Create a pool</button>`}${tapoffButton(ctx.s?.tapoffs_on === '1', 'btn--gold bigcreate')}</div>

${section('Sponsored pools', sponsored, '/pools?scope=sponsored', 'No sponsored pool right now. Brands dey come!')}
${section('Live pools', live, '/pools?scope=live', sponsored.length ? 'No other pool dey live now. The sponsored ones above dey run.' : 'No pool dey live now. Check the ones coming up.')}
${section('Coming up from players', upcoming, '/pools?scope=players-soon', perk.create ? 'Nothing coming up. <a href="/pools/new">Create the first one</a>.' : 'Nothing coming up yet.')}
${mine.length ? section('You don join', mine, '/pools?scope=mine', '') : ''}

<h2 class="h2">Invite your personal person <a href="/invite">See who joined</a></h2>
<section class="tcard invite c-sky">
  <p style="margin:0;font-weight:600">Every ${ctx.referralBatch} people wey join with your link = 1 free booster for you. You don bring <b>${user.referral_count || 0}</b>.</p>
  ${copyRow(refUrl, 'Copy')}
  <div class="row" style="gap:8px"><button type="button" class="btn btn--white btn--sm" style="flex:1" data-share-url="${esc(refUrl)}" data-share-text="Come play Tap Am with me! Use my link:">${ICONS.share} Share link</button><button type="button" class="btn btn--sm" style="flex:1" ${shareCardAttr({ url: refUrl, title: `${user.username} dey call you!`, line: 'Join Tap Am, tap fast and win prizes.', kind: 'invite', color: '#2E8BFF', display: 'www.tapammm.live' })}>${ICONS.qr} QR card</button></div>
</section>`;
  return appPage({ user, title: 'Home', active: '/dashboard', body, wallet, css: HOME_CSS, theme, bgCss });
}

function defaultSlides(perk) {
  return [
    { demo: true, title: 'Tap fast, chop prize', subtitle: 'Join a live pool and tap pass everybody.', link: '/pools', color: '#FF8A2A', cta: 'See pools', tag: 'Tap Am' },
    perk.tier === 'NEPO'
      ? { demo: true, title: 'Play 10 pools at once', subtitle: 'One tap counts in every pool you joined.', link: '/pools?scope=mine', color: '#FF4FA3', cta: 'My pools', tag: 'Nepo perk' }
      : { demo: true, title: 'Go Mapo or Nepo', subtitle: 'More fingers, more pools, bigger boosters.', link: '/plans', color: '#FF4FA3', cta: 'Compare plans', tag: 'Upgrade' },
    { demo: true, title: 'Mystery boxes dey!', subtitle: 'Open one for boosters and skins.', link: '/store?tab=BOX', color: '#9161FF', cta: 'Open a box', tag: 'Store' },
    { demo: true, title: 'Who be tapper of the day?', subtitle: 'Top tappers get badges every day, week, month and year.', link: '/top', color: '#21D4C8', cta: 'See the board', tag: 'Leaderboard' }
  ];
}

// "Tap in N live pools at once": shows when a player is in more than one live pool.
function multiTap(liveIds, perk) {
  if (!liveIds || liveIds.length < 2) return '';
  return `<div class="multitap">${perk?.pools > 1 ? `<a class="btn btn--green btn--shine btn--block" href="/play?pools=${liveIds.slice(0, perk.pools).map(encodeURIComponent).join(',')}" data-no-swap>Tap in ${Math.min(perk.pools, liveIds.length)} live pools at once</a>` : `<button type="button" class="btn btn--white btn--block" ${upgradeAttrs('MAPO', 'Tapping in many pools at once')}>${ICONS.lock} Tap in all your live pools at once</button>`}</div>`;
}

// ── Pools list ──────────────────────────────────────────────────────────────
export function poolsPage(ctx) {
  const { user, scope, pools, wallet, perk, theme, bgCss, term = '', page = 1, hasNext = false, liveIds = [] } = ctx;
  const sponsor = user.role === 'SPONSOR', admin = user.role === 'ADMIN';
  const tabs = [['open', 'Open'], ['live', 'Live'], ['sponsored', 'Sponsored'], ['players-soon', 'From players'], ['mine', 'Joined'], ...(perk?.create ? [['created', 'Created by me']] : []), ['recent', 'Results']];
  const canCreate = sponsor || admin || perk?.create;
  const createBtn = canCreate ? `<a class="btn btn--green btn--sm" href="/pools/new">+ Create a pool</a>` : `<button type="button" class="btn btn--white btn--sm" ${upgradeAttrs('MAPO', 'Creating a pool')}>${ICONS.lock} Create a pool</button>`;
  const tapoffBtn = user.role === 'USER' ? tapoffButton(ctx.s?.tapoffs_on === '1', 'btn--gold btn--sm') : '';
  const body = `<div class="headrow pools-head"><h1 class="h1">Pools</h1><div class="hbtns">${tapoffBtn}${createBtn}</div></div>
<form class="psearch" method="get" action="/pools" role="search"><input type="hidden" name="scope" value="${esc(scope)}"><input class="ta-input" type="search" name="q" value="${esc(term)}" placeholder="Search pools by name, code or sponsor" maxlength="40" aria-label="Search pools" autocomplete="off"><button class="btn btn--green btn--sm" type="submit">Search</button></form>
<nav class="tabs" aria-label="Pool lists">${tabs.map(([k, l]) => `<a href="/pools?scope=${k}${term ? '&q=' + encodeURIComponent(term) : ''}" ${k === scope ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
${user.role === 'USER' ? multiTap(liveIds, perk) : ''}
${term ? `<p class="sub" style="margin:-4px 2px 12px">${pools.length ? `Pools matching “${esc(term)}”` : ''} <a href="/pools?scope=${esc(scope)}" style="color:var(--green);font-weight:800">Clear search</a></p>` : ''}
${pools.length ? `<div class="pgrid">${pools.map(poolCard).join('')}</div>${pager(`/pools?scope=${encodeURIComponent(scope)}${term ? '&q=' + encodeURIComponent(term) : ''}`, page, hasNext)}` : term ? `<div class="empty">No pool matches “${esc(term)}”. Try another word or the pool code.</div>` : `<div class="empty">${scope === 'mine' ? 'You never join any pool yet. <a href="/pools">See open pools</a>.' : scope === 'recent' ? 'No results this week yet.' : scope === 'created' ? 'You never create a pool. <a href="/pools/new">Create one</a>.' : 'Nothing here right now. Check back soon.'}</div>`}`;
  return appPage({ user, title: 'Pools', active: sponsor ? '/sponsor/pools' : admin ? '/admin/pools' : '/pools', body, wallet, theme, bgCss, css: '.psearch{display:flex;gap:8px;margin:0 2px 12px}.psearch .ta-input{flex:1;min-width:0;background:#fff}.multitap{margin:0 0 14px}' + HEAD_CSS });
}

// ── Pool detail: join, lobby, instructions, results ─────────────────────────
const POOL_CSS = `
.phead{padding:18px 18px 16px;overflow:hidden}
.phead h1{margin:10px 0 4px;font:900 clamp(28px,7.5vw,42px)/1 var(--display)}
.phead .stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.phead .stats>div{padding:10px 12px;border-radius:var(--r-sm);background:rgba(0,0,0,.24);text-shadow:none}
.phead .stats .k{font:700 12px var(--body);opacity:.9}.phead .stats .v{font:900 24px/1.05 var(--display)}
.instr h2{margin:0 0 10px;font:900 22px/1.1 var(--display);color:var(--ink)}
.instr ul{margin:0 0 12px;padding:0;list-style:none;display:grid;gap:8px}
.instr li{position:relative;padding-left:20px;font-size:15px;line-height:1.45}
.instr li::before{content:"";position:absolute;left:0;top:6px;width:10px;height:10px;border-radius:50%;background:var(--purple)}
.instr .code-line{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;border-radius:16px;background:var(--cloud)}
.instr .code-line b{font:900 22px var(--display);letter-spacing:1px}
.board-me{box-shadow:0 0 0 3px var(--green),0 4px 0 rgba(21,11,51,.22)!important}
.mini-ava{flex:none;width:36px;height:36px}
.rk{width:40px;font:900 20px var(--display);color:var(--ink-soft)}
.waitbox{box-shadow:0 0 0 3px var(--sunny),var(--sh)}
.wait-n{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.wait-n b{font:900 46px/1 var(--display);color:var(--ink)}.wait-n span{font:800 17px var(--body);color:var(--ink-soft)}
.list .item:nth-child(1) .rk{color:#E0A800}.list .item:nth-child(2) .rk{color:#8A93A6}.list .item:nth-child(3) .rk{color:#C96A2B}
`;
export function poolPage(ctx) {
  const { user, pool: p, board, results, wallet, isCreator, joinBlock, myBoosters, entries, origin, tierKey, theme, bgCss } = ctx;
  const color = p.kind === 'SPONSORED' ? 'c-orange' : p.kind === 'PAID' ? 'c-pink' : 'c-sky';
  const url = `${origin}/pool/${p.id}`;
  const vs = p.gameType === 'MATCH' && p.sideA;
  const head = `<section class="tcard phead ${color}" style="${p.theme ? `--c:${esc(p.theme)};--cd:color-mix(in srgb,${esc(p.theme)} 65%,#000)` : ''}">
  <div class="row wrap" style="justify-content:flex-start;gap:6px">${stateBadge(p.state)}${p.kind === 'SPONSORED' ? `<span class="badge sponsor">Sponsored</span>` : p.kind === 'PAID' ? '<span class="badge paid">Paid pool</span>' : '<span class="badge">Free pool</span>'}${p.private ? `<span class="badge">${ICONS.lock.replace('<svg', '<svg width="12" height="12"')}Private</span>` : ''}${p.lapoRules ? '<span class="badge lapo">Lapo rules</span>' : ''}${p.paused ? '<span class="badge red">Paused</span>' : ''}${p.instant ? '<span class="badge instant">⚡ Instant match</span>' : ''}${p.joined ? '<span class="badge live">Joined</span>' : p.invited ? '<span class="badge">You’re invited</span>' : ''}</div>
  ${vs ? `<div class="vsrow" style="margin-top:12px"><span class="code">${esc(p.sideA)}</span><span class="vs">VS</span><span class="code">${esc(p.sideB)}</span></div>` : ''}
  <h1>${esc(p.name)}</h1>
  ${p.sponsor ? `<p style="margin:0 0 6px;font-weight:700">Sponsored by ${esc(p.sponsor)}</p>` : ''}
  ${p.description ? `<p style="margin:0 0 6px">${esc(p.description)}</p>` : ''}
  <div class="stats"><div><div class="k">Prize pool</div><div class="v">${p.prize ? esc(nairaShort(p.prize)) : 'Akara'}</div></div><div><div class="k">Entry</div><div class="v">${p.entryFee ? esc(naira(p.entryFee)) : 'Free'}</div></div>
  <div><div class="k">Players</div><div class="v" data-players>${short(p.players || 0)}${p.maxPlayers < 100000 ? `<small style="font-size:14px"> / ${short(p.maxPlayers)}</small>` : ''}</div></div><div><div class="k">${p.state === 'waiting' ? 'Match length' : p.state === 'soon' ? 'Starts' : p.state === 'live' ? 'Ends' : 'Ended'}</div><div class="v" style="font-size:16px;line-height:1.3">${p.state === 'waiting' ? esc(fmtDur(p.duration)) : esc(lagos(p.state === 'soon' ? p.startsAt : p.endsAt))}</div></div></div>
  <div style="margin-top:12px">${whenPill(p).replace('data-when', 'data-reload-at-zero data-when')}</div>
  ${p.state === 'waiting' ? `<div class="bar-progress" style="margin-top:10px" aria-hidden="true"><i data-fill style="width:${pct((p.players || 0) / Math.max(1, p.needed || p.maxPlayers))}%"></i></div>` : ''}
</section>`;

  let action = '';
  if (p.paused && p.pauseMode === 'VOTE') {
    const v = ctx.votes || { CONTINUE: 0, RESTART: 0 }, tot = v.CONTINUE + v.RESTART;
    action = `<div class="panel" style="margin-top:14px;box-shadow:0 0 0 3px var(--sunny),var(--sh)"><b>${p.voteUntil ? 'Vote: continue or restart?' : 'Paused because of a server problem.'}</b>
      <p class="muted" style="margin:6px 0 0">${p.voteUntil ? `We’re back! Players vote until <b>${esc(lagos(p.voteUntil))}</b>. <b>Continue</b> picks up from the scores when it stopped. <b>Restart</b> starts from zero and gives back the boosters everybody used. No vote = continue.` : 'Every score, entry fee and prize is safe. When the servers are fine, the players in this pool vote to continue the match or restart it.'}</p>
      ${p.voteUntil ? `<div class="grid g2" style="margin-top:12px"><div class="tcard card c-green" style="padding:12px"><div class="stat"><span class="k">Continue</span><span class="v">${short(v.CONTINUE)}</span></div></div><div class="tcard card c-orange" style="padding:12px"><div class="stat"><span class="k">Restart</span><span class="v">${short(v.RESTART)}</span></div></div></div>
      ${p.joined && user?.role === 'USER' ? `<div class="actions">${postBtn(`/api/pools/${p.id}/vote`, v.mine === 'CONTINUE' ? '✓ You voted continue' : 'Vote continue', { body: { choice: 'CONTINUE' }, cls: 'btn--green' })}${postBtn(`/api/pools/${p.id}/vote`, v.mine === 'RESTART' ? '✓ You voted restart' : 'Vote restart', { body: { choice: 'RESTART' }, cls: 'btn--gold' })}</div>` : ''}<p class="small muted" style="margin:8px 0 0">${tot} vote${tot === 1 ? '' : 's'} so far.</p>` : ''}</div>`;
  } else if (p.paused) action = `<div class="panel" style="margin-top:14px;box-shadow:0 0 0 3px var(--sunny),var(--sh)"><b>This pool is paused.</b><p class="muted" style="margin:6px 0 0">We stopped it and gave everybody back the money and boosters they put in. It will restart soon — join again when it does.</p></div>`;
  else if (p.state === 'cancelled') action = '';
  else if (p.state === 'ended') action = `<div class="panel" style="margin-top:14px;text-align:center">${p.joined ? (p.myPrize ? `<div class="small muted">You finished #${esc(p.myRank || '—')}</div><b class="pos" style="font:900 32px var(--display)">You won ${esc(naira(p.myPrize))}</b><p class="small muted" style="margin:4px 0 0">It don land for your winnings.</p>` : `<div class="small muted">Your result</div><b style="font:900 28px var(--display)">${p.myRank ? '#' + esc(p.myRank) : 'No taps'}</b><p class="small muted" style="margin:4px 0 0">No prize this time.</p>`) : ''}
    <div class="actions" style="justify-content:center"><a class="btn btn--green btn--shine" href="/pool/${esc(p.id)}/results">${ICONS.share} See &amp; share results</a></div></div>`;
  else if (!p.joined && user?.role === 'USER') {
    if (joinBlock) action = `<div class="panel" style="margin-top:14px"><p style="margin:0 0 4px;font-weight:700">${esc(joinBlock.why)}</p>${joinBlock.need ? `<div class="actions"><a class="btn btn--green" href="/plans">See plans</a></div>` : ''}</div>`;
    else action = `<div class="panel" style="margin-top:14px">${form(`/api/pools/${p.id}/join`, `
      ${p.private && p.invited ? '<div class="note">You’re invited, so you don’t need the password.</div>' : ''}
      ${p.private && !p.invited ? field({ label: 'Pool password', name: 'password', placeholder: 'XXXX-XXXX', attrs: 'autocapitalize="characters" autocomplete="off" maxlength="9" required' }) : ''}
      ${vs ? choice({ label: 'Pick your side', name: 'side', options: [[p.sideA, p.sideA], [p.sideB, p.sideB]], value: '' }) : ''}
      ${p.entryFee ? `<div class="note">Entry fee <b>${esc(naira(p.entryFee))}</b> comes from your wallet (you have ${esc(naira(wallet.balance_kobo))}). It joins the prize and is <b>not refunded</b> once the pool starts.</div>${wallet.balance_kobo < p.entryFee && wallet.winnings_kobo >= p.entryFee ? check({ name: 'use_winnings', label: `Pay from my winnings (${esc(naira(wallet.winnings_kobo))})` }) : ''}` : ''}
      ${p.state === 'waiting' ? `<div class="note">${p.instant ? 'Instant match' : 'Waiting for players'}: it starts by itself ${INSTANT_LEAD_MS / 1000} seconds after ${short(p.needed || p.maxPlayers)} players are in, then runs ${esc(fmtDur(p.duration))}. ${p.entryFee ? 'If it doesn’t fill in time, your entry fee comes back.' : ''}</div>` : ''}
    `, { submit: p.entryFee ? `Pay ${naira(p.entryFee)} and join` : 'Join this pool', shine: true })}</div>`;
  } else if (p.joined && p.state === 'waiting') {
    const left = Math.max(0, (p.needed || p.maxPlayers) - (p.players || 0));
    action = `<div class="panel waitbox" style="margin-top:14px">
      <div class="wait-n"><b data-left>${short(left)}</b><span>more player${left === 1 ? '' : 's'} to go</span></div>
      <p style="margin:8px 0 0">You’re in! The match starts by itself ${INSTANT_LEAD_MS / 1000} seconds after ${short(p.needed || p.maxPlayers)} players are in, and runs <b>${esc(fmtDur(p.duration))}</b>. Keep this page open and we’ll take you straight to the game — or we’ll send you a notification.</p>
      <p class="small muted" style="margin:8px 0 0">Not full by ${esc(lagos(p.startsAt))}? It’s cancelled${p.entryFee ? ' and your entry fee comes back' : ''}. Share the code to fill it faster.</p>
      <div class="actions"><button type="button" class="btn btn--green btn--shine btn--block" data-share-url="${esc(url)}" data-share-text="Join my Tap Am match “${esc(p.name)}” — we start when ${short(p.needed || p.maxPlayers)} people join. Code ${esc(p.code)}">${ICONS.share} Invite friends to fill it</button></div>
    </div>`;
  } else if (p.joined) {
    action = `<div class="panel" style="margin-top:14px">
      <div class="row wrap"><div><div class="small muted">Your score</div><b style="font:900 30px var(--display)">${short(board?.me?.score || 0)}</b></div><div style="text-align:right"><div class="small muted">Your position</div><b style="font:900 30px var(--display)">${board?.me?.rank ? '#' + board.me.rank : '—'}</b></div></div>
      <div class="actions"><a class="btn btn--green btn--shine btn--block" href="/play?pools=${esc(p.id)}" data-no-swap>${p.state === 'live' ? 'Tap now' : 'Enter the lobby'}</a></div>
      <p class="small muted" style="margin:10px 0 0">${p.boosters ? `Boosters are on. You have ${myBoosters} booster${myBoosters === 1 ? '' : 's'} — use as many as you like in this game.` : 'Boosters are off for this pool.'}</p>
    </div>`;
  }

  // Paid pools: anybody can add money to the prize. The creator can add to any of their pools.
  const canTop = !p.paused && (p.state === 'soon' || p.state === 'live' || p.state === 'waiting') && (user?.role === 'USER' || (user?.role === 'SPONSOR' && isCreator));
  const open = !p.paused && (p.state === 'soon' || p.state === 'live' || p.state === 'waiting');
  if (open && user?.role === 'ADMIN') action += `<div class="panel" style="margin-top:14px"><h2 style="margin:0 0 4px;font:900 20px var(--display);color:var(--ink)">Add time</h2><p class="muted" style="margin:0 0 10px;font-size:14px">${p.state === 'waiting' ? 'Makes the match run longer once it starts.' : `Ends ${esc(lagos(p.endsAt))}. Players see the new end time straight away.`}</p><div class="actions" style="margin-top:0">${[1, 5, 15, 30, 60].map(m => postBtn(`/api/admin/pools/${p.id}/extend`, `+${m < 60 ? m + ' min' : '1 hour'}`, { body: { minutes: m }, cls: 'btn--soft btn--sm' })).join('')}</div></div>`;
  if (open && isCreator) action += `<div class="panel" style="margin-top:14px"><h2 style="margin:0 0 4px;font:900 20px var(--display);color:var(--ink)">Invite players</h2><p class="muted" style="margin:0 0 10px;font-size:14px">Search by name. They get a notification with this pool${p.private ? ', and they can join without the password' : ''}.</p>${form(`/api/pools/${p.id}/invite`, playerPicker({ name: 'invites', label: 'Players', id: 'inv' }), { submit: 'Send invites', btn: 'btn--green' })}</div>`;
  if (canTop) action += `<div class="panel" style="margin-top:14px"><h2 style="margin:0 0 4px;font:900 20px var(--display);color:var(--ink)">Make the prize bigger</h2><p class="muted" style="margin:0 0 10px;font-size:14px">Anybody can add money from their wallet to the prize. It goes to the winners and is not refunded once the pool starts (unless the pool is cancelled or paused). Adding here does not change the time${p.timeTopup ? ' — inside the game, players can buy more time (₦10,000 = +10 seconds)' : ''}.</p>${form(`/api/pools/${p.id}/topup`, `${moneyField({ label: 'Amount (₦)', name: 'amount', placeholder: '1,000', attrs: 'required' })}`, { submit: 'Add to prize', btn: 'btn--gold' })}</div>`;
  const sp = p.split, tie = p.tie === 'SPLIT' ? 'Ties: tied players split the prize.' : 'Ties: whoever reached the score first wins.';
  const aud = { ALL: 'Everybody fit join.', LAPO: 'Lapo baby match: Mapo and Nepo babies can join, but they play as Lapo babies here (no Mapo or Nepo boosters or perks).', MAPO: 'Mapo and Nepo babies only.', NEPO: 'Nepo babies only.' }[p.audience] || '';
  const instr = `<section class="panel instr" style="margin-top:14px"><h2>Pool instructions</h2><ul>
    ${p.instant ? `<li><b>Instant match:</b> ${p.state === 'waiting' ? `starts by itself when ${short(p.needed || p.maxPlayers)} players join` : `started when ${short(p.needed || p.maxPlayers)} players joined`}, and runs ${esc(fmtDur(p.duration))}.</li>` : `<li>Runs ${esc(fmtDur(p.duration))}${p.state === 'soon' ? `, from ${esc(lagos(p.startsAt))}` : ''}.</li>${p.needed && p.state !== 'ended' ? `<li><b>Players needed to start:</b> ${short(p.needed)}. If fewer have joined at the start time, it waits for them, then starts by itself.</li>` : ''}`}
    <li>${p.maxPlayers < 100000 ? `Up to <b>${short(p.maxPlayers)}</b> players can join.` : 'No limit on players.'}</li>
    ${p.vsSplit ? '' : `<li>${esc(splitText(sp, p.splitStyle, p.vsSplit))}.</li>`}
    ${vs && p.vsSplit ? `<li>VS pool: pick ${esc(p.sideA)} or ${esc(p.sideB)}. The side with the most taps in total wins the <b>whole</b> prize pool, and everybody on that side who tapped shares it by their taps (more taps, bigger share). If both sides finish level, each side shares half.</li>` : ''}
    <li>${esc(tie)}</li><li>${esc(aud)}</li>
    <li>${p.boosters ? 'Boosters allowed — you fit use many, one after the other.' : 'No boosters in this pool.'}</li>
    ${p.lapoRules ? '<li><b>Lapo baby rules:</b> everybody taps with one finger at the Lapo speed and only everybody-boosters work. A fair fight.</li>' : ''}
    <li>Taps only count while the pool is live. The server score is the official score.</li>
    ${p.entryFee ? '<li>Entry fees go into the prize and are not refunded once the pool starts (unless the pool is cancelled or nobody taps).</li>' : ''}
    ${p.houseCut > 0 ? `<li>Tap Am keeps ${p.houseCut}% of the prize pot as a service fee.</li>` : ''}
  </ul>
  <div class="code-line"><span>Code:</span><b>${esc(p.code)}</b>${copyBtn(p.code, 'Copy')}</div>
  ${isCreator && p.private ? `<div class="code-line" style="margin-top:8px"><span>Password:</span><b>${esc(p.password)}</b>${copyBtn(p.password, 'Copy')}</div>` : ''}
  ${p.state === 'ended' || p.state === 'cancelled' ? '' : `<div class="actions"><button type="button" class="btn btn--soft btn--sm" data-share-url="${esc(url)}" data-share-text="Join my Tap Am pool “${esc(p.name)}” — code ${esc(p.code)}">${ICONS.share} Share link</button><button type="button" class="btn btn--sm" ${shareCardAttr({ url, title: p.name, line: (p.prize ? 'Prize pool ' + nairaShort(p.prize) + ' · ' : '') + (p.entryFee ? naira(p.entryFee) + ' entry' : 'Free entry'), code: p.code, display: 'www.tapammm.live', color: p.theme || (p.kind === 'SPONSORED' ? '#FF8A2A' : p.kind === 'PAID' ? '#FF4FA3' : '#2E8BFF') })}>${ICONS.qr} QR share card</button></div>`}
</section>`;

  const creator = isCreator && entries ? `<h2 class="h2">Players who joined (${entries.length})</h2><div class="panel">
    <p class="muted" style="margin:0 0 10px">Pools can’t be deleted until they end.</p>
    ${entries.length ? `<div class="list">${entries.slice(0, 50).map(e => `<div class="item" style="box-shadow:none;padding:8px 4px"><div class="mini-ava">${rankAvatar(e.rank_level || 1, { size: 36 })}</div><div class="grow"><div class="t" style="font-size:15px">${esc(e.username)}</div><div class="s">Joined ${esc(lagos(e.joined_at))}${e.paid_kobo ? ' · paid ' + esc(naira(e.paid_kobo)) : ''}${e.side_choice ? ' · ' + esc(e.side_choice) : ''}</div></div></div>`).join('')}</div>` : '<p class="muted" style="margin:0">Nobody don join yet. Share the code!</p>'}
  </div>` : '';

  const rows = results || board?.top || [];
  const leader = rows.length ? `<h2 class="h2">${p.state === 'ended' ? 'Final board' : 'Leaderboard'}</h2>
    ${board?.teams && Object.keys(board.teams).length ? `<div class="grid g2" style="margin-bottom:12px">${Object.entries(board.teams).map(([k, v], i) => `<div class="tcard card ${i ? 'c-sky' : 'c-orange'}" style="padding:12px 14px"><div class="stat"><span class="k">Team ${esc(k)}</span><span class="v">${short(v)}</span></div></div>`).join('')}</div>` : ''}
    <div class="list">${rows.map(r => `<div class="item ${r.me ? 'board-me' : ''}"><b class="rk">#${r.r}</b><div class="mini-ava">${rankAvatar(r.k || 1, { size: 36 })}</div><div class="grow"><div class="t" style="font-size:16px">${nameTag(r.n, r.e)}${r.t === 'NEPO' ? ' <span class="badge nepo" style="font-size:10px;padding:3px 7px">Nepo</span>' : r.t === 'MAPO' ? ' <span class="badge mapo" style="font-size:10px;padding:3px 7px">Mapo</span>' : ''}</div>${r.side ? `<div class="s">Team ${esc(r.side)}</div>` : ''}</div><div style="text-align:right"><div class="amt">${short(r.s)}</div>${r.prize ? `<div class="small pos" style="font-weight:800">${esc(naira(r.prize))}</div>` : ''}</div></div>`).join('')}
    ${board?.near?.length ? `<div class="small" style="text-align:center;color:#fff;opacity:.8">· · ·</div>${board.near.map(r => `<div class="item ${r.me ? 'board-me' : ''}"><b class="rk">#${r.r}</b><div class="grow"><div class="t" style="font-size:16px">${nameTag(r.n, r.e)}</div></div><div class="amt">${short(r.s)}</div></div>`).join('')}` : ''}</div>`
    : (p.state === 'ended' ? '<div class="empty" style="margin-top:14px">Nobody tap for this pool.</div>' : '');

  const listHref = user?.role === 'SPONSOR' ? '/sponsor/pools' : user?.role === 'ADMIN' ? '/admin/pools' : '/pools';
  const body = head + action + instr + creator + leader;
  const script = p.state === 'waiting' || (p.joined && p.state === 'soon') ? `
(function(){var id=${JSON.stringify(p.id)},joined=${p.joined ? 'true' : 'false'},busy=false,mark=document.querySelector('[data-waiting],[data-reload-at-zero]');
function stop(){clearInterval(t);document.removeEventListener('visibilitychange',tick);}
function tick(){if(!mark||!document.contains(mark))return stop();if(busy||document.hidden)return;busy=true;
 TA.api('/api/pools/'+encodeURIComponent(id)+'/state',undefined,'GET').then(function(j){busy=false;if(!j._ok)return;
  if(!document.contains(mark))return stop();
  if(j.state==='soon')return;
  if(j.state!=='waiting'){stop();if(joined&&j.state!=='cancelled'&&j.state!=='ended'){TA.toast('Game on!');TA.go('/play?pools='+encodeURIComponent(id));}else TA.go(location.pathname,{replace:true,fresh:true});return;}
  var need=j.needed||j.maxPlayers,left=Math.max(0,need-j.players);
  document.querySelectorAll('[data-waiting]').forEach(function(e){e.textContent=j.players+'/'+need+' joined · starts at '+need;});
  document.querySelectorAll('[data-left]').forEach(function(e){e.textContent=left;});
  var f=document.querySelector('[data-fill]');if(f)f.style.width=Math.round(Math.min(1,j.players/Math.max(1,need))*100)+'%';
  var pl=document.querySelector('[data-players]');if(pl&&pl.firstChild)pl.firstChild.nodeValue=String(j.players);});}
var t=setInterval(tick,${p.state === 'soon' ? 8000 : 3000});document.addEventListener('visibilitychange',tick);})();` : '';
  return appPage({ user, title: p.name, active: listHref, back: listHref, body, wallet, css: POOL_CSS, script, theme, bgCss });
}

// ── Create pool ─────────────────────────────────────────────────────────────
const CREATE_CSS = `
.cp h2{margin:4px 0 2px;font:900 18px var(--display);color:var(--ink)}
.cp .group{display:grid;gap:15px;min-width:0;padding:14px;border-radius:var(--r-sm);background:var(--cloud)}
.cp .group .ta-input{background:#fff}
.cp .preview{padding:10px 12px;border-radius:var(--r-in);background:#fff;font:600 14px/1.45 var(--body);color:var(--ink)}
.cp .lockrow{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-radius:var(--r-in);background:#fff;color:var(--ink-soft);font-weight:700}
/* phones: one column, nothing wider than the screen */
.cp form,.cp .ta-field{min-width:0}
.cp .two>*{min-width:0}
.cp input[type=date],.cp input[type=time]{min-width:0;width:100%;max-width:100%;-webkit-appearance:none;appearance:none;font-size:16px;padding-right:8px}
.cp .modes{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(min(100%,165px),1fr))}
.cp .mode{position:relative;display:grid;align-content:start;gap:3px;padding:12px 14px;border-radius:var(--r-in);background:var(--cloud);box-shadow:inset 0 0 0 2px var(--line);cursor:pointer;color:var(--ink)}
.cp .mode input{position:absolute;opacity:0;pointer-events:none}
.cp .mode b{font:900 17px/1.1 var(--display)}
.cp .mode small{font:600 13px/1.35 var(--body);color:var(--ink-soft)}
.cp .mode:has(input:checked){background:#fff;box-shadow:inset 0 0 0 3px var(--ink),0 3px 0 var(--ink)}
.cp .mode:has(input:focus-visible){outline:3px solid var(--purple);outline-offset:2px}
.cp .qchips{display:flex;flex-wrap:wrap;gap:8px}
.cp .qchip{min-height:40px;padding:0 14px;border:0;border-radius:999px;background:#fff;color:var(--ink);font:800 14px var(--body);box-shadow:inset 0 0 0 2px var(--line);cursor:pointer}
.cp .qchip.on{background:var(--ink);color:#fff;box-shadow:none}
.cp .when-prev{display:flex;gap:10px;align-items:flex-start;background:var(--ink);color:#fff;font-weight:700}
.cp .when-prev::before{content:"⏱";flex:none}
.cp .when-prev.bad{background:#FFE3E8;color:#8A0F25}
.cp .seg-choice{grid-auto-flow:row;grid-template-columns:repeat(auto-fit,minmax(min(100%,110px),1fr))}
.cp .seg-choice label{min-height:42px;font-size:14px}
.pats{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:8px}
.pat{position:relative;display:grid;place-items:end center;height:64px;padding:4px;border-radius:var(--r-in);border:3px solid #fff;box-shadow:0 0 0 2px var(--line);cursor:pointer;color:#fff;font:800 10.5px/1.1 var(--body);text-shadow:var(--ts);text-align:center;overflow:hidden}
.pat input{position:absolute;opacity:0;pointer-events:none}
.pat:has(input:checked){box-shadow:0 0 0 3px var(--ink)}
.pat:has(input:focus-visible){outline:3px solid var(--purple)}
.padprev{display:grid;place-items:center;height:110px;border-radius:var(--r);border:3px solid #fff;box-shadow:0 5px 0 rgba(0,0,0,.2);font:900 italic 34px var(--display);color:#fff;text-shadow:var(--ts-big)}
@media (max-width:560px){.cp .two{grid-template-columns:1fr}.cp .group{padding:12px}}
`;
export function createPoolPage(ctx) {
  const { user, wallet, role, tierKey, ads, theme, bgCss, blast = null, lapoLeft = null } = ctx;
  const admin = role === 'ADMIN', sponsor = role === 'SPONSOR';
  const opts = { lapo: admin || ctx.opts?.lapo !== false, boosters: admin || ctx.opts?.boosters !== false };   // the super admin turns these options on/off
  const canColour = admin || sponsor;   // pool colours, background and tap area: sponsors and the admin only
  // Day and time are typed in Lagos time (UTC+1, no summer time): UTC fields of (now + 1h) = the Lagos clock.
  const lagosClock = ms => new Date(ms + 3600000).toISOString();
  const nextSlot = Math.ceil((Date.now() + 3600000) / 900000) * 900000;   // an hour from now, on the next quarter hour
  const minDay = lagosClock(Date.now()).slice(0, 10), maxDay = lagosClock(Date.now() + 60 * 86400000).slice(0, 10);
  const kinds = admin ? [['FREE', 'Free'], ['PAID', 'Paid'], ['SPONSORED', 'Sponsored']] : [['FREE', 'Free'], ['PAID', 'Paid']];
  const approved = (ads || []).filter(a => a.approved && a.active);
  const body = `<h1 class="h1">Create a pool</h1><p class="sub">${sponsor ? 'You fund the prize from your wallet; players join free.' : admin ? 'As super admin you can create any type of pool.' : 'A free pool for fun, or a paid pool where every entry fee joins the prize.'}${lapoLeft !== null ? ` <b style="color:#fff">Lapo babies create ${lapoLeft.max} pools a day: you have ${lapoLeft.left} left today.</b>` : ''}</p>
<div class="panel cp">${form('/api/pools', `
  ${field({ label: 'Pool name', name: 'name', placeholder: 'Friday Night Tap', attrs: 'maxlength="60" required autocomplete="off"' })}
  <div class="ta-field"><label class="ta-label" for="f-description">Description <small>(optional)</small></label><textarea class="ta-input" id="f-description" name="description" maxlength="300" placeholder="Anything players should know"></textarea><p class="ta-error" data-err="description"></p></div>
  ${sponsor ? '<input type="hidden" name="kind" value="SPONSORED">' : choice({ label: 'Type', name: 'kind', options: kinds, value: 'FREE' })}
  <div class="group" data-show="kind=PAID">
    <div class="two">${moneyField({ label: 'Entry fee (₦)', name: 'entry_fee', placeholder: '500', tip: 'What each player pays to join. Every entry fee goes into the prize pot, so the prize grows as more people join.' })}
    ${moneyField({ label: 'Starting prize (₦)', name: 'prize', placeholder: '0', tip: 'Optional money you add from your wallet so the pot starts bigger. It is locked into the pool once you create it.' })}</div>
  </div>
  ${sponsor || admin ? `<div class="group" data-show="kind=SPONSORED">${moneyField({ label: admin ? 'Prize (₦)' : 'Prize (₦, at least ₦10,000)', name: 'prize', id: 'f-prize-sp', placeholder: '50,000', tip: admin ? 'Funded by Tap Am. Players join free.' : 'The prize you fund from your wallet. Players join free.' })}</div>` : ''}
  <div class="ta-field" data-field="start_mode"><span class="ta-label">When does it start?</span><div class="modes" role="radiogroup" aria-label="When does it start?">
    <label class="mode"><input type="radio" name="start_mode" value="INSTANT" checked><b>⚡ Instant match</b><small>Starts the moment enough players join</small></label>
    <label class="mode"><input type="radio" name="start_mode" value="LATER"><b>Schedule for later</b><small>Pick the day and time</small></label>
  </div><p class="ta-error" data-err="start_mode"></p></div>
  <div class="group" data-show="start_mode=LATER" hidden>
    <div class="qchips" role="group" aria-label="Quick picks"><button type="button" class="qchip" data-q="30">In 30 min</button><button type="button" class="qchip" data-q="60">In 1 hour</button><button type="button" class="qchip" data-q="t20">Tonight 8 PM</button><button type="button" class="qchip" data-q="m20">Tomorrow 8 PM</button><button type="button" class="qchip" data-q="sat18">Saturday 6 PM</button></div>
    <div class="two">${field({ label: 'Day', name: 'start_date', type: 'date', value: lagosClock(nextSlot).slice(0, 10), attrs: `min="${minDay}" max="${maxDay}" required disabled` })}${field({ label: 'Time (Lagos)', name: 'start_time', type: 'time', value: lagosClock(nextSlot).slice(11, 16), attrs: 'step="300" required disabled' })}</div>
  </div>
  <div class="group">
    <div class="two">${field({ label: 'Players needed to start', name: 'instant_players', value: '2', attrs: 'inputmode="numeric" autocomplete="off" maxlength="5" data-num', tip: 'The game waits until this many players join, then starts by itself. A scheduled pool that is short at its start time waits for them too.' })}
    ${field({ label: 'Max players (cap)', name: 'max_players', value: '', placeholder: 'Unlimited', attrs: 'inputmode="numeric" autocomplete="off" maxlength="6" data-num', tip: 'The most people that can join. Leave it on Unlimited to let everybody in. Must be at least the players needed to start.' })}</div>
    <div class="qchips" role="group" aria-label="Quick picks for players needed">${[2, 4, 10, 20, 50, 100].map(n => `<button type="button" class="qchip${n === 2 ? ' on' : ''}" data-n="${n}">${n} to start</button>`).join('')}</div>
    <p class="ta-hint" style="margin:0" data-show="start_mode=INSTANT">It starts ${INSTANT_LEAD_MS / 1000} seconds after enough players are in. If they aren’t in within 24 hours, it’s cancelled and every entry fee goes back.</p>
    <p class="ta-hint" style="margin:0" data-show="start_mode=LATER" hidden>Short of players at the start time? It waits up to 24 hours for them, then it’s cancelled and every entry fee goes back.</p>
  </div>
  ${choice({ label: 'How long does it run?', name: 'duration', options: [['60', '1 min'], ['300', '5 min'], ['900', '15 min'], ['1800', '30 min'], ['3600', '1 hour'], ...(admin ? [['86400', '1 day'], ['604800', '1 week'], ['2592000', '30 days'], ['31536000', '1 year'], ['CUSTOM', 'Custom']] : [])], value: '60' })}
  ${admin ? '' : '<p class="ta-hint" style="margin-top:-8px">Longer games and custom lengths are set by the Tap Am team.</p>'}
  <div class="group" data-show="duration=CUSTOM" hidden><div class="two">${field({ label: 'Length', name: 'custom_len', value: '2', attrs: 'inputmode="decimal" autocomplete="off" maxlength="6" disabled' })}${select({ label: 'Unit', name: 'custom_unit', options: [['MIN', 'Minutes'], ['HOUR', 'Hours'], ['DAY', 'Days']], value: 'HOUR', attrs: 'disabled' })}</div></div>
  <div class="preview when-prev" data-when-preview aria-live="polite"></div>
  ${choice({ label: 'Who fit join', name: 'audience', options: [['ALL', 'Everybody'], ['LAPO', 'Lapo match'], ['MAPO', 'Mapo + Nepo'], ['NEPO', 'Nepo only']], value: 'ALL', cls: 'wrap4' })}
  ${choice({ label: 'Game type', name: 'game_type', options: [['STANDARD', 'Normal'], ['MATCH', 'VS (two sides)']], value: 'STANDARD', tip: 'VS: players pick a side. The side with the most taps wins the whole pot, and everyone on it shares by taps.' })}
  <div class="group" data-show="game_type=MATCH">
    <div class="two">${field({ label: 'Side A', name: 'side_a', placeholder: 'Jollof', attrs: 'maxlength="24" autocomplete="off"' })}${field({ label: 'Side B', name: 'side_b', placeholder: 'Fried rice', attrs: 'maxlength="24" autocomplete="off"' })}</div>
  </div>
  <div class="group" data-show="game_type=STANDARD" style="background:none;padding:0">
  <div class="two">${field({ label: 'How many winners', name: 'winners', type: 'number', value: '1', attrs: 'min="1" max="100" inputmode="numeric" data-split', tip: 'Up to 100 winners share the prize.' })}
  ${select({ label: 'Share it', name: 'split_style', options: [['TOP', 'Bigger for top places'], ['EQUAL', 'Equal shares']], value: 'TOP', attrs: 'data-split' })}</div>
  <div class="preview" data-split-preview>Winner takes all.</div></div>
  <div class="preview" data-show="game_type=MATCH" hidden>VS: the side with the most taps wins the whole prize pool, shared by everybody on that side by their taps.</div>
  ${choice({ label: 'If players tie', name: 'tie_rule', options: [['FIRST', 'First to reach wins'], ['SPLIT', 'Split the prize']], value: 'FIRST' })}
  ${playerPicker({ name: 'invites', label: 'Invite players <small>(optional)</small>', hint: 'Search by name and add as many as you like (50 at a time). They get a notification with the link, and invited players can join a private pool without the password.' })}
  ${playerPicker({ name: 'blocked', id: 'f-block', label: 'Block players from this pool <small>(optional)</small>', hint: 'Type a nickname. Blocked players can’t join or play in this pool.' })}
  <div class="row" style="justify-content:flex-start;gap:8px;align-items:flex-start">${check({ name: 'time_topup', label: '<b>Let players buy more time during the game</b> (₦10,000 = +10 seconds)', checked: true })}<button type="button" class="tip" data-tip="During the game, a button lets anybody buy more time: every ₦10,000 adds 10 seconds to the clock for everybody." aria-label="More info">i</button></div>
  ${opts.lapo ? `<div class="row" style="justify-content:flex-start;gap:8px;align-items:flex-start">${check({ name: 'lapo_rules', label: '<b>Use Lapo baby rules</b> (level the game)' })}<button type="button" class="tip" data-tip="Everybody in this pool plays like a Lapo baby: one finger at a time, the Lapo tap speed, and only the boosters every player can use. Mapo and Nepo perks are switched off here, so it is a fair fight." aria-label="More info">i</button></div>` : ''}
  ${canColour ? `${check({ name: 'custom_pad', label: `Set the tap area for this pool${sponsor ? ' (your brand colours)' : ''}` })}
  <div class="group" data-show="custom_pad=true">
    <div class="padprev tcard" data-padprev style="background:${patternBg('waves', '#2E8BFF')}">TAP AM</div>
    <div class="ta-field"><label class="ta-label" for="tc">Tap area colour</label><input class="color-in" id="tc" type="color" name="theme_color" value="#2E8BFF"></div>
    <div class="ta-field"><span class="ta-label">Pattern</span><div class="pats" role="radiogroup" aria-label="Pattern">
      <label class="pat" style="background:#2E8BFF" data-pat="none"><input type="radio" name="pad_pattern" value="none">Plain</label>
      ${Object.entries(PATTERNS).map(([k, p]) => `<label class="pat" style="background:${patternBg(k, '#2E8BFF')}" data-pat="${k}"><input type="radio" name="pad_pattern" value="${k}" ${k === 'waves' ? 'checked' : ''}>${esc(p.name)}</label>`).join('')}
    </div></div>
    ${check({ name: 'allow_own_pad', label: 'Let players use their own tap area instead' })}
    <p class="ta-hint" style="margin:-8px 0 0">If you leave this off, everybody taps on your tap area in this pool.</p>
  </div>
  <div class="ta-field"><label class="ta-label" for="bgc">Pool background</label><input class="color-in" id="bgc" type="color" name="bg_color" value="#4B1FD8"></div>`
    : ''}
  ${sponsor && blast ? `<div class="group">
    ${choice({ label: 'Let Tap Am email this pool to players?', name: 'email_blast', options: [['NO', 'No'], ['ALL', 'Everybody'], ['LAPO', 'Lapo'], ['MAPO', 'Mapo'], ['NEPO', 'Nepo']], value: 'NO', cls: 'wrap4', tip: 'We email your pool to players who said yes to pool news, the moment it is created. You pay once from your wallet.' })}
    <p class="ta-hint" style="margin:-6px 0 0">Costs <b>${esc(naira(blast.price))}</b> from your wallet. Players who get it now: everybody ${short(blast.counts.ALL)} · Lapo ${short(blast.counts.LAPO)} · Mapo ${short(blast.counts.MAPO)} · Nepo ${short(blast.counts.NEPO)}.</p>
  </div>` : ''}
  ${sponsor || admin ? `${admin
    ? choice({ label: 'Ad in this pool', name: 'with_ad', options: [['RUNNING', 'Running Tap Am ad'], ['YES', 'Pick an ad'], ['NO', 'No ad']], value: 'RUNNING', tip: 'The running ad is the one Tap Am ad switched on in Admin → Ads. It shows before the game (and finishes before the first tap), to players who join late, and before results.' })
    : choice({ label: 'Show your ad in this pool?', name: 'with_ad', options: [['NO', 'Without ad'], ['YES', 'With ad']], value: 'NO', tip: 'With ad: your ad shows before the game (it finishes before the first tap), to players who join late, and before results.' })}
  <div class="group" data-show="with_ad=YES">${approved.length ? select({ label: admin ? 'Pick the ad' : 'Pick your ad', name: 'promo_id', options: approved.map(a => [a.id, a.title + (a.owner ? ' · ' + a.owner : '')]) }) : `<div class="note" style="margin:0">You don’t have an approved ad yet. <a href="${sponsor ? '/sponsor/ads' : '/admin/ads'}"><b>Create an ad first</b></a></div>`}</div>` : ''}
  ${check({ name: 'is_private', label: 'Private pool — Tap Am makes a password you share' })}
  ${opts.boosters ? check({ name: 'boosters_allowed', label: 'Allow boosters', checked: true }) : ''}
  ${admin ? '' : `<div class="note">Once you create a pool, <b>you can’t delete it</b> until it ends. Prize money you put in is locked into the pool.</div>${check({ name: 'ack', label: 'I understand the pool can’t be deleted until it ends.' })}`}
`, { submit: 'Create pool', shine: true })}</div>`;
  const script = `
var f=document.querySelector('.cp form'),pv=f.querySelector('[data-split-preview]');
function split(n,style){n=Math.max(1,Math.min(100,n|0||1));var P={1:[100],2:[65,35],3:[60,25,15],5:[40,25,15,12,8],10:[25,18,13,10,8,7,6,5,4,4]},w;
 if(style==='EQUAL'){w=[];for(var i=0;i<n;i++)w.push(1);}else if(P[n])w=P[n];else{w=[];for(var k=0;k<n;k++)w.push(1/Math.pow(k+1,.85));}
 var s=w.reduce(function(a,b){return a+b},0);return w.map(function(x){return Math.round(x/s*1000)/10});}
function paint(){var n=+f.winners.value||1,st=f.split_style.value,vs=(f.querySelector('input[name=game_type]:checked')||{}).value==='MATCH',sp=split(n,st);
 pv.textContent=n===1?(vs?'Top tapper on each side takes that side’s pot.':'Winner takes all.'):(st==='EQUAL'?('Top '+n+(vs?' on each side':'')+' share equally: '+sp[0]+'% each.'):('Top '+n+(vs?' on each side':'')+' share: '+sp.slice(0,6).join('% / ')+'%'+(n>6?' / …':'')+'.'));}
f.addEventListener('input',paint);f.addEventListener('change',paint);paint();
var pp=f.querySelector('[data-padprev]'),PB=${JSON.stringify(Object.fromEntries(Object.entries(PATTERNS).map(([k, p]) => [k, p.img + ' ' + p.pos + '/' + p.size + ' ' + p.rep])))};
function pad(){if(!pp)return;var c=(f.theme_color||{}).value||'#2E8BFF',k=(f.querySelector('input[name=pad_pattern]:checked')||{}).value;pp.style.background=(PB[k]?PB[k]+',':'')+c;
 f.querySelectorAll('[data-pat]').forEach(function(l){var kk=l.getAttribute('data-pat');l.style.background=(PB[kk]?PB[kk]+',':'')+c;});}
f.addEventListener('input',pad);f.addEventListener('change',pad);pad();
var pre=f.querySelector('[data-when-preview]');
function clock(ms){var d=new Date(ms+3600000).toISOString();return {date:d.slice(0,10),time:d.slice(11,16),dow:new Date(ms+3600000).getUTCDay(),h:+d.slice(11,13),m:+d.slice(14,16)};}
function fmt(ms,day){try{return new Intl.DateTimeFormat('en-NG',day?{timeZone:'Africa/Lagos',weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}:{timeZone:'Africa/Lagos',hour:'numeric',minute:'2-digit'}).format(new Date(ms));}catch(e){return new Date(ms).toLocaleString();}}
function dur(){var v=(f.querySelector('input[name=duration]:checked')||{}).value;if(v==='CUSTOM'){var n=parseFloat(String(f.custom_len.value).replace(/[^0-9.]/g,''))||0;return Math.round(n*({MIN:60,HOUR:3600,DAY:86400}[f.custom_unit.value]||60));}return +v||0;}
function fd(s){if(s<60)return s+' sec';if(s%86400===0)return s/86400+(s===86400?' day':' days');if(s%3600===0)return s/3600+(s===3600?' hour':' hours');if(s<3600)return Math.round(s/60)+' min';var h=Math.floor(s/3600),m=Math.round(s%3600/60);return h>=24?Math.floor(h/24)+'d '+(h%24)+'h':h+'h '+m+'m';}
function mode(){return (f.querySelector('input[name=start_mode]:checked')||{}).value||'INSTANT';}
function when(){var m=mode(),d=dur(),bad=false,txt;
 if(d<60){txt='A pool runs at least 1 minute.';bad=true;}
 else if(d>${admin ? 31622400 : 3600}){txt='${admin ? 'A pool fit run 1 year max.' : 'Pick a length up to 1 hour.'}';bad=true;}
 else if(m==='INSTANT'){var n=parseInt(String(f.instant_players.value).replace(/[^0-9]/g,''),10)||0,cap=parseInt(String(f.max_players.value).replace(/[^0-9]/g,''),10)||0;txt=n<2?'At least 2 players are needed to start.':cap&&cap<n?'Max players can’t be less than the players needed.':'Starts by itself when '+n.toLocaleString('en-NG')+' players join, then runs '+fd(d)+(cap?' · up to '+cap.toLocaleString('en-NG')+' players':' · no player limit')+'.';bad=n<2||(cap&&cap<n);}
 else{var s=m==='LATER'?Date.parse(f.start_date.value+'T'+f.start_time.value+':00+01:00'):Date.now();
  if(!s){txt='Pick the day and time.';bad=true;}
  else if(m==='LATER'&&s<Date.now()-60000){txt='That time don pass. Pick a later time.';bad=true;}
  else{var e=s+d*1000;txt=(m==='NOW'?'Starts now':'Starts '+fmt(s,true))+' · ends '+fmt(e,clock(s).date!==clock(e).date)+' · runs '+fd(d)+' (Lagos time)';}}
 pre.textContent=txt;pre.classList.toggle('bad',bad);}
f.addEventListener('input',when);f.addEventListener('change',when);when();
var wt=setInterval(function(){if(!document.contains(pre))return clearInterval(wt);when();},30000);
var c0=clock(Date.now()),tb=f.querySelector('[data-q=t20]');if(tb&&(c0.h>19||(c0.h===19&&c0.m>=30)))tb.hidden=true;
f.addEventListener('click',function(e){
 var b=e.target.closest('[data-q]');
 if(b){e.preventDefault();var now=Date.now(),k=b.getAttribute('data-q'),t,c=clock(now),mid=Date.parse(c.date+'T00:00:00+01:00');
  if(k==='30'||k==='60')t=Math.ceil((now+k*60000)/300000)*300000;
  else if(k==='t20')t=mid+20*3600000;
  else if(k==='m20')t=mid+86400000+20*3600000;
  else{var add=(6-c.dow+7)%7;if(add===0&&c.h>=18)add=7;t=mid+add*86400000+18*3600000;}
  var p=clock(t);f.start_date.value=p.date;f.start_time.value=p.time;
  f.querySelectorAll('[data-q]').forEach(function(x){x.classList.toggle('on',x===b);});when();return;}
 var nb=e.target.closest('[data-n]');
 if(nb){e.preventDefault();f.instant_players.value=nb.getAttribute('data-n');f.querySelectorAll('[data-n]').forEach(function(x){x.classList.toggle('on',x===nb);});when();}
});
f.addEventListener('input',function(e){if(e.target.name==='start_date'||e.target.name==='start_time')f.querySelectorAll('[data-q]').forEach(function(x){x.classList.remove('on');});if(e.target.name==='instant_players')f.querySelectorAll('[data-n]').forEach(function(x){x.classList.toggle('on',x.getAttribute('data-n')===e.target.value.replace(/[^0-9]/g,''));});});`;
  return appPage({ user, title: 'Create a pool', active: role === 'SPONSOR' ? '/sponsor/pools' : role === 'ADMIN' ? '/admin/pools' : '/pools', body, wallet, narrow: true, css: CREATE_CSS, script, theme, bgCss });
}

// ── Shareable results: podium, top 10, what each won; VS shows the winning side ──
const RES_CSS = `
.rhead{padding:18px;text-align:center}
.rhead h1{margin:6px 0 4px;font:900 clamp(26px,7vw,40px)/1.05 var(--display)}
.rhead .meta{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 14px;font:700 14px var(--body)}
.pod{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr) minmax(0,1fr);align-items:end;gap:8px;margin:16px 0}
.pod>div{display:flex;flex-direction:column;align-items:center;gap:5px;min-width:0;padding:12px 8px;border-radius:22px;text-align:center}
.pod .pl{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#fff;color:var(--ink);font:900 16px/1 var(--display)}
.pod .nm{width:100%;font:900 15px/1.15 var(--display);overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pod .tp{font:800 12.5px var(--body);opacity:.95}
.pod .pz{padding:4px 10px;border-radius:999px;background:var(--ink);color:var(--green);font:900 14px var(--display);white-space:nowrap}
.pod .p1{padding-top:18px}
.vsres{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}
.vsres>div{padding:14px;border-radius:var(--r-sm);text-align:center;color:#fff}
.vsres .side{font:900 22px/1.1 var(--display);overflow-wrap:anywhere}
.vsres .tt{font:800 14px var(--body)}
.vsres .win{box-shadow:0 0 0 4px var(--green),var(--sh)}
.vsres .tag{display:inline-block;margin-top:6px;padding:3px 10px;border-radius:999px;background:var(--green);color:var(--ink);font:900 12px var(--body)}
.rlist .rk{width:40px;font:900 18px var(--display);color:var(--ink-soft)}
.rlist .grow{min-width:0}.rlist .t{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rlist .amt{text-align:right;line-height:1.1}.rlist .amt small{display:block;font:700 11px var(--body);color:var(--ink-soft)}
`;
export function resultsPage(ctx) {
  const { user, pool: p, rows, vs, origin, players, theme, bgCss, me } = ctx;
  const url = `${origin}/pool/${p.id}/results`;
  const medal = ['🥇', '🥈', '🥉'];
  const top3 = rows.slice(0, 3);
  const pod = top3.length ? `<div class="pod">${[1, 0, 2].map(i => top3[i] ? `<div class="tcard ${['c-sunny', 'c-sky', 'c-orange'][i]} ${i === 0 ? 'p1' : ''}"><span class="pl">${i + 1}</span><div class="mini-ava">${rankAvatar(top3[i].k || 1, { size: i === 0 ? 56 : 44 })}</div><span class="nm">${esc(top3[i].n)}</span><span class="tp">${short(top3[i].s)} taps</span>${top3[i].prize ? `<span class="pz">${esc(nairaShort(top3[i].prize))}</span>` : ''}</div>` : '<div></div>').join('')}</div>` : '';
  const vsBlock = vs ? `<div class="vsres">${[p.side_a, p.side_b].map((x, i) => `<div class="tcard ${i ? 'c-sky' : 'c-orange'} ${vs.winners.includes(x) ? 'win' : ''}"><div class="side">${esc(x)}</div><div class="tt">${short(vs.taps[x] || 0)} taps · ${short(vs.count[x] || 0)} player${vs.count[x] === 1 ? '' : 's'}</div>${vs.winners.includes(x) ? `<span class="tag">${vs.winners.length > 1 ? 'Draw' : 'WINNERS'}${vs.won[x] ? ' · ' + esc(nairaShort(vs.won[x])) : ''}</span>` : ''}</div>`).join('')}</div>` : '';
  const list = rows.length ? `<h2 class="h2">Top ${Math.min(10, rows.length)}</h2><div class="list rlist">${rows.slice(0, 10).map((r, i) => `<div class="item ${r.me ? 'board-me' : ''}"><b class="rk">${i < 3 ? medal[i] : '#' + (i + 1)}</b><div class="mini-ava">${rankAvatar(r.k || 1, { size: 36 })}</div><div class="grow"><div class="t" style="font-size:16px">${esc(r.n)}</div>${r.side ? `<div class="s">Team ${esc(r.side)}</div>` : ''}</div><div class="amt"><b>${short(r.s)}</b><small>taps</small>${r.prize ? `<div class="pos" style="font:900 14px var(--display)">${esc(naira(r.prize))}</div>` : ''}</div></div>`).join('')}</div>` : '<div class="empty">Nobody tapped in this pool.</div>';
  const winLine = vs ? (vs.winners.length === 1 ? `Team ${vs.winners[0]} won` : 'It ended in a draw') : top3[0] ? `${top3[0].n} won` : 'Results';
  const card = { url, kind: 'results', title: p.name, line: `${lagosDate(p.ends_at)} · ${short(players)} player${players === 1 ? '' : 's'}${p.prize_kobo ? ' · Prize pool ' + nairaShort(p.prize_kobo) : ''}`, display: 'tapammm.live', color: '#9161FF',
    vs: vs ? [p.side_a, p.side_b].map(x => ({ name: x, taps: short(vs.taps[x] || 0), players: `${short(vs.count[x] || 0)} PLAYER${vs.count[x] === 1 ? '' : 'S'}`, win: vs.winners.length === 1 && vs.winners[0] === x })) : null,
    podium: top3.map(r => ({ n: r.n, s: short(r.s), prize: r.prize ? nairaShort(r.prize) : '', avatar: rankAvatar(r.k || 1, { size: 170 }) })), ask: winLine === 'Results' ? 'Your turn: tap pass them' : `${winLine}. Your turn!` };
  const mine = me ? `<div class="panel" style="margin-top:14px;text-align:center"><div class="small muted">Your result</div><b style="font:900 28px var(--display)">${me.final_rank ? '#' + me.final_rank : '—'} · ${short(me.taps || 0)} taps</b>${me.prize_kobo ? `<div class="pos" style="font:900 22px var(--display);margin-top:4px">You won ${esc(naira(me.prize_kobo))}</div>` : '<div class="muted small" style="margin-top:4px">No prize this time</div>'}</div>` : '';
  const body = `<section class="tcard rhead c-purple"><span class="badge live">Final results</span><h1>${esc(p.name)}</h1>
<div class="meta"><span>${esc(lagosDate(p.ends_at))}</span><span>${short(players)} player${players === 1 ? '' : 's'}</span><span>${p.prize_kobo ? 'Prize pool ' + esc(nairaShort(p.prize_kobo)) : 'Free pool'}</span>${p.entry_fee_kobo ? `<span>${esc(naira(p.entry_fee_kobo))} entry</span>` : ''}</div></section>
${vsBlock}${pod}${mine}${list}
<div class="actions" style="justify-content:center;margin-top:16px"><button type="button" class="btn btn--green btn--shine" ${shareCardAttr(card)}>${ICONS.share} Share results</button><button type="button" class="btn btn--white" data-share-url="${esc(url)}" data-share-text="${esc(winLine + ' in “' + p.name + '” on Tap Am')}">Share link</button>${user ? `<a class="btn btn--soft" href="/pools">Play another</a>` : `<a class="btn btn--soft" href="/signup">Play Tap Am</a>`}</div>`;
  return anyPage({ user, title: `Results: ${p.name}`, description: `${winLine} in “${p.name}” on Tap Am.`, body, css: RES_CSS + '.mini-ava{flex:none;width:36px;height:36px}', theme, bgCss, active: '/pools' });
}
