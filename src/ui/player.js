// Player pages: home, pools list, pool detail (lobby / instructions / results), create pool.
import { appPage, esc, naira, nairaShort, short, lagos, poolCard, tierBadge, stateBadge, whenPill, field, moneyField, select, choice, check, form, copyRow, copyBtn, upgradeAttrs, icon, nameTag } from './kit.js';
import { ICONS } from './theme.js';
import { rankAvatar, avatarSvg, avatarFor } from './avatar.js';
import { PATTERNS, patternBg } from './patterns.js';
import { splitText } from '../game/pools.js';

const pct = n => Math.round(Math.max(0, Math.min(1, n)) * 100);
const shareCardAttr = d => `data-share-card='${esc(JSON.stringify(d))}'`;

export const HOME_CSS = `
.slides{position:relative;margin:2px 0 16px}
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
.invite{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;padding:18px}
`;

// ── Home ────────────────────────────────────────────────────────────────────
export function dashboardPage(ctx) {
  const { user, tier, rank, wallet, slides, sponsored, live, upcoming, mine, perk, origin, theme, bgCss } = ctx;
  const refUrl = `${origin}/signup?ref=${user.referral_code || ''}`;
  // Slides made by the super admin: either a picture (with just the button on it) or a colour with words.
  const slideHtml = slides.map((s, i) => {
    const href = `/s/${esc(s.id)}`, cta = esc(s.cta || 'Check am');
    if (s.image_url) return `<a class="slide img-only" href="${href}" data-no-swap aria-label="${esc(s.title)}"><img class="full" src="${esc(s.image_url)}" alt="${esc(s.title)}" loading="${i ? 'lazy' : 'eager'}"><span class="btn btn--white btn--sm cta">${cta}</span></a>`;
    return `<a class="slide" href="${href}" style="background:${esc(/^#[0-9a-fA-F]{6}$/.test(s.color || '') ? s.color : '#2E8BFF')}" data-no-swap aria-label="${esc(s.title)}">
      <div><span class="tag">${s.sponsor ? 'Sponsored · ' + esc(s.sponsor) : 'Tap Am'}</span><h3>${esc(s.title)}</h3>${s.subtitle ? `<p>${esc(s.subtitle)}</p>` : ''}<span class="btn btn--white btn--sm">${cta}</span></div></a>`;
  }).join('');
  const count = slides.length;
  const section = (title, list, href, empty) => `<h2 class="h2">${title}${href ? ` <a href="${href}">See all</a>` : ''}</h2>${list.length ? `<div class="hscroll">${list.map(poolCard).join('')}</div>` : `<div class="empty">${empty}</div>`}`;
  const body = `
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
${perk.create ? '<a class="btn btn--white btn--shine bigcreate" href="/pools/new">+ Create a pool</a>' : `<button type="button" class="btn btn--white bigcreate" ${upgradeAttrs('MAPO', 'Creating your own pool')}>${ICONS.lock} Create a pool</button>`}

${section('Sponsored pools', sponsored, '/pools?scope=sponsored', 'No sponsored pool right now. Brands dey come!')}
${section('Live pools', live, '/pools?scope=live', sponsored.length ? 'No other pool dey live now. The sponsored ones above dey run.' : 'No pool dey live now. Check the ones coming up.')}
${section('Coming up from Nepo babies', upcoming, '/pools?scope=players-soon', perk.create ? 'Nothing coming up. <a href="/pools/new">Create the first one</a>.' : 'Nothing coming up yet.')}
${mine.length ? section('You don join', mine, '/pools?scope=mine', '') : ''}
${mine.filter(p => p.state === 'live').length > 1 ? `<div class="actions">${perk.pools > 1 ? `<a class="btn btn--green btn--shine btn--block" href="/play?pools=${mine.filter(p => p.state === 'live').map(p => p.id).slice(0, perk.pools).join(',')}" data-no-swap>Tap in ${Math.min(perk.pools, mine.filter(p => p.state === 'live').length)} live pools at once</a>` : `<button type="button" class="btn btn--white btn--block" ${upgradeAttrs('MAPO', 'Tapping in many pools at once')}>${ICONS.lock} Tap in all your live pools at once</button>`}</div>` : ''}

<h2 class="h2">Invite your personal person <a href="/invite">See who joined</a></h2>
<section class="tcard invite c-sky">
  <p style="margin:0;font-weight:600">Every ${ctx.referralBatch} people wey join with your link = 1 free booster for you. You don bring <b>${user.referral_count || 0}</b>.</p>
  ${copyRow(refUrl, 'Copy')}
  <div class="row" style="gap:8px"><button type="button" class="btn btn--white btn--sm" style="flex:1" data-share-url="${esc(refUrl)}" data-share-text="Come play Tap Am with me! Use my link:">${ICONS.share} Share link</button><button type="button" class="btn btn--sm" style="flex:1" ${shareCardAttr({ url: refUrl, title: `${user.username} dey call you!`, line: 'Join Tap Am, tap fast and win prizes.', kind: 'invite', color: '#2E8BFF', display: 'www.tapammm.live' })}>${ICONS.qr} QR card</button></div>
</section>`;
  return appPage({ user, title: 'Home', active: '/dashboard', body, wallet, css: HOME_CSS, theme, bgCss });
}

// ── Pools list ──────────────────────────────────────────────────────────────
export function poolsPage(ctx) {
  const { user, scope, pools, wallet, perk, theme, bgCss } = ctx;
  const sponsor = user.role === 'SPONSOR', admin = user.role === 'ADMIN';
  const tabs = [['open', 'Open'], ['live', 'Live'], ['sponsored', 'Sponsored'], ['players-soon', 'From players'], ['mine', 'Joined'], ...(perk?.create ? [['created', 'Created by me']] : []), ['recent', 'Results']];
  const canCreate = sponsor || admin || perk?.create;
  const createBtn = canCreate ? `<a class="btn btn--green btn--sm" href="/pools/new">+ Create a pool</a>` : `<button type="button" class="btn btn--white btn--sm" ${upgradeAttrs('MAPO', 'Creating a pool')}>${ICONS.lock} Create a pool</button>`;
  const body = `<div class="headrow"><h1 class="h1">Pools</h1>${createBtn}</div>
<nav class="tabs" aria-label="Pool lists">${tabs.map(([k, l]) => `<a href="/pools?scope=${k}" ${k === scope ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
${pools.length ? `<div class="pgrid">${pools.map(poolCard).join('')}</div>` : `<div class="empty">${scope === 'mine' ? 'You never join any pool yet. <a href="/pools">See open pools</a>.' : scope === 'recent' ? 'No results this week yet.' : scope === 'created' ? 'You never create a pool. <a href="/pools/new">Create one</a>.' : 'Nothing here right now. Check back soon.'}</div>`}`;
  return appPage({ user, title: 'Pools', active: sponsor ? '/sponsor/pools' : admin ? '/admin/pools' : '/pools', body, wallet, theme, bgCss });
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
.instr li{display:flex;gap:10px;align-items:flex-start;font-size:15px;line-height:1.45}
.instr li::before{content:"";flex:none;width:10px;height:10px;margin-top:6px;border-radius:50%;background:var(--purple)}
.instr .code-line{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;border-radius:16px;background:var(--cloud)}
.instr .code-line b{font:900 22px var(--display);letter-spacing:1px}
.board-me{box-shadow:0 0 0 3px var(--green),0 4px 0 rgba(21,11,51,.22)!important}
.mini-ava{flex:none;width:36px;height:36px}
.rk{width:40px;font:900 20px var(--display);color:var(--ink-soft)}
.list .item:nth-child(1) .rk{color:#E0A800}.list .item:nth-child(2) .rk{color:#8A93A6}.list .item:nth-child(3) .rk{color:#C96A2B}
`;
export function poolPage(ctx) {
  const { user, pool: p, board, results, wallet, isCreator, joinBlock, myBoosters, entries, origin, tierKey, theme, bgCss, sidePots } = ctx;
  const color = p.kind === 'SPONSORED' ? 'c-orange' : p.kind === 'PAID' ? 'c-pink' : 'c-sky';
  const url = `${origin}/pool/${p.id}`;
  const vs = p.gameType === 'MATCH' && p.sideA;
  const head = `<section class="tcard phead ${color}" style="${p.theme ? `--c:${esc(p.theme)};--cd:color-mix(in srgb,${esc(p.theme)} 65%,#000)` : ''}">
  <div class="row wrap" style="justify-content:flex-start;gap:6px">${stateBadge(p.state)}${p.kind === 'SPONSORED' ? `<span class="badge sponsor">Sponsored</span>` : p.kind === 'PAID' ? '<span class="badge paid">Paid pool</span>' : '<span class="badge">Free pool</span>'}${p.private ? `<span class="badge">${ICONS.lock.replace('<svg', '<svg width="12" height="12"')}Private</span>` : ''}${p.joined ? '<span class="badge live">Joined</span>' : ''}</div>
  ${vs ? `<div class="vsrow" style="margin-top:12px"><span class="code">${esc(p.sideA)}</span><span class="vs">VS</span><span class="code">${esc(p.sideB)}</span></div>` : ''}
  <h1>${esc(p.name)}</h1>
  ${p.sponsor ? `<p style="margin:0 0 6px;font-weight:700">Sponsored by ${esc(p.sponsor)}</p>` : ''}
  ${p.description ? `<p style="margin:0 0 6px">${esc(p.description)}</p>` : ''}
  <div class="stats"><div><div class="k">Prize pool</div><div class="v">${p.prize ? esc(nairaShort(p.prize)) : 'Akara'}</div></div><div><div class="k">Entry</div><div class="v">${p.entryFee ? esc(naira(p.entryFee)) : 'Free'}</div></div>
  <div><div class="k">Players</div><div class="v">${short(p.players || 0)}${p.maxPlayers < 100000 ? `<small style="font-size:14px"> / ${short(p.maxPlayers)}</small>` : ''}</div></div><div><div class="k">${p.state === 'soon' ? 'Starts' : p.state === 'live' ? 'Ends' : 'Ended'}</div><div class="v" style="font-size:16px;line-height:1.3">${esc(lagos(p.state === 'soon' ? p.startsAt : p.endsAt))}</div></div></div>
  <div style="margin-top:12px">${whenPill(p).replace('data-when', 'data-reload-at-zero data-when')}</div>
</section>`;

  let action = '';
  if (p.state === 'ended' || p.state === 'cancelled') action = '';
  else if (!p.joined && user?.role === 'USER') {
    if (joinBlock) action = `<div class="panel" style="margin-top:14px"><p style="margin:0 0 4px;font-weight:700">${esc(joinBlock.why)}</p>${joinBlock.need ? `<div class="actions"><a class="btn btn--green" href="/plans">See plans</a></div>` : ''}</div>`;
    else action = `<div class="panel" style="margin-top:14px">${form(`/api/pools/${p.id}/join`, `
      ${p.private ? field({ label: 'Pool password', name: 'password', placeholder: 'XXXX-XXXX', attrs: 'autocapitalize="characters" autocomplete="off" maxlength="9" required' }) : ''}
      ${vs ? choice({ label: 'Pick your side', name: 'side', options: [[p.sideA, p.sideA], [p.sideB, p.sideB]], value: '' }) : ''}
      ${p.entryFee ? `<div class="note">Entry fee <b>${esc(naira(p.entryFee))}</b> comes from your wallet (you have ${esc(naira(wallet.balance_kobo))}). It joins the prize and is <b>not refunded</b> once the pool starts.</div>${wallet.balance_kobo < p.entryFee && wallet.winnings_kobo >= p.entryFee ? check({ name: 'use_winnings', label: `Pay from my winnings (${esc(naira(wallet.winnings_kobo))})` }) : ''}` : ''}
    `, { submit: p.entryFee ? `Pay ${naira(p.entryFee)} and join` : 'Join this pool', shine: true })}</div>`;
  } else if (p.joined) {
    action = `<div class="panel" style="margin-top:14px">
      <div class="row wrap"><div><div class="small muted">Your score</div><b style="font:900 30px var(--display)">${short(board?.me?.score || 0)}</b></div><div style="text-align:right"><div class="small muted">Your position</div><b style="font:900 30px var(--display)">${board?.me?.rank ? '#' + board.me.rank : '—'}</b></div></div>
      <div class="actions"><a class="btn btn--green btn--shine btn--block" href="/play?pools=${esc(p.id)}" data-no-swap>${p.state === 'live' ? 'Tap now' : 'Enter the lobby'}</a></div>
      <p class="small muted" style="margin:10px 0 0">${p.boosters ? `Boosters are on. You have ${myBoosters} booster${myBoosters === 1 ? '' : 's'} — use as many as you like in this game.` : 'Boosters are off for this pool.'}</p>
    </div>`;
  }

  const sp = p.split, tie = p.tie === 'SPLIT' ? 'Ties: tied players split the prize.' : 'Ties: whoever reached the score first wins.';
  const aud = { ALL: 'Everybody fit join.', LAPO: 'Lapo babies only.', MAPO: 'Mapo and Nepo babies only.', NEPO: 'Nepo babies only.' }[p.audience] || '';
  const instr = `<section class="panel instr" style="margin-top:14px"><h2>Pool instructions</h2><ul>
    <li>${esc(splitText(sp, p.splitStyle, p.vsSplit))}.</li>
    ${vs && p.vsSplit ? `<li>VS pool: pick ${esc(p.sideA)} or ${esc(p.sideB)}. Each side has its own pot — its players’ entry fees plus half of any starting prize${sidePots ? ` (${esc(p.sideA)} ${esc(naira(sidePots[p.sideA] || 0))} · ${esc(p.sideB)} ${esc(naira(sidePots[p.sideB] || 0))})` : ''}. The top tappers on each side share their side’s pot.</li>` : ''}
    <li>${esc(tie)}</li><li>${esc(aud)}</li>
    <li>${p.boosters ? 'Boosters allowed — you fit use many, one after the other.' : 'No boosters in this pool.'}</li>
    <li>Taps only count while the pool is live. The server score is the official score.</li>
    ${p.entryFee ? '<li>Entry fees go into the prize and are not refunded once the pool starts (unless the pool is cancelled or nobody taps).</li>' : ''}
    ${p.houseCut > 0 ? `<li>Tap Am keeps ${p.houseCut}% of the prize pot as a service fee.</li>` : ''}
  </ul>
  <div class="code-line"><span>Code:</span><b>${esc(p.code)}</b>${copyBtn(p.code, 'Copy')}</div>
  ${isCreator && p.private ? `<div class="code-line" style="margin-top:8px"><span>Password:</span><b>${esc(p.password)}</b>${copyBtn(p.password, 'Copy')}</div>` : ''}
  <div class="actions"><button type="button" class="btn btn--soft btn--sm" data-share-url="${esc(url)}" data-share-text="Join my Tap Am pool “${esc(p.name)}” — code ${esc(p.code)}">${ICONS.share} Share link</button><button type="button" class="btn btn--sm" ${shareCardAttr({ url, title: p.name, line: (p.prize ? 'Prize pool ' + nairaShort(p.prize) + ' · ' : '') + (p.entryFee ? naira(p.entryFee) + ' entry' : 'Free entry'), code: p.code, display: 'www.tapammm.live', color: p.theme || (p.kind === 'SPONSORED' ? '#FF8A2A' : p.kind === 'PAID' ? '#FF4FA3' : '#2E8BFF') })}>${ICONS.qr} QR share card</button></div>
</section>`;

  const creator = isCreator && entries ? `<h2 class="h2">Players who joined (${entries.length})</h2><div class="panel">
    <p class="muted" style="margin:0 0 10px">Pools can’t be deleted until they end.</p>
    ${entries.length ? `<div class="list">${entries.slice(0, 50).map(e => `<div class="item" style="box-shadow:none;padding:8px 4px"><div class="mini-ava">${avatarSvg(avatarFor(e.username), { size: 36 })}</div><div class="grow"><div class="t" style="font-size:15px">${esc(e.username)}</div><div class="s">Joined ${esc(lagos(e.joined_at))}${e.paid_kobo ? ' · paid ' + esc(naira(e.paid_kobo)) : ''}${e.side_choice ? ' · ' + esc(e.side_choice) : ''}</div></div></div>`).join('')}</div>` : '<p class="muted" style="margin:0">Nobody don join yet. Share the code!</p>'}
  </div>` : '';

  const rows = results || board?.top || [];
  const leader = rows.length ? `<h2 class="h2">${p.state === 'ended' ? 'Final board' : 'Leaderboard'}</h2>
    ${board?.teams && Object.keys(board.teams).length ? `<div class="grid g2" style="margin-bottom:12px">${Object.entries(board.teams).map(([k, v], i) => `<div class="tcard card ${i ? 'c-sky' : 'c-orange'}" style="padding:12px 14px"><div class="stat"><span class="k">Team ${esc(k)}</span><span class="v">${short(v)}</span></div></div>`).join('')}</div>` : ''}
    <div class="list">${rows.map(r => `<div class="item ${r.me ? 'board-me' : ''}"><b class="rk">#${r.r}</b><div class="mini-ava">${avatarSvg(avatarFor(r.n), { size: 36 })}</div><div class="grow"><div class="t" style="font-size:16px">${nameTag(r.n, r.e)}${r.t === 'NEPO' ? ' <span class="badge nepo" style="font-size:10px;padding:3px 7px">Nepo</span>' : r.t === 'MAPO' ? ' <span class="badge mapo" style="font-size:10px;padding:3px 7px">Mapo</span>' : ''}</div>${r.side ? `<div class="s">Team ${esc(r.side)}</div>` : ''}</div><div style="text-align:right"><div class="amt">${short(r.s)}</div>${r.prize ? `<div class="small pos" style="font-weight:800">${esc(naira(r.prize))}</div>` : ''}</div></div>`).join('')}
    ${board?.near?.length ? `<div class="small" style="text-align:center;color:#fff;opacity:.8">· · ·</div>${board.near.map(r => `<div class="item ${r.me ? 'board-me' : ''}"><b class="rk">#${r.r}</b><div class="grow"><div class="t" style="font-size:16px">${nameTag(r.n, r.e)}</div></div><div class="amt">${short(r.s)}</div></div>`).join('')}` : ''}</div>`
    : (p.state === 'ended' ? '<div class="empty" style="margin-top:14px">Nobody tap for this pool.</div>' : '');

  const listHref = user?.role === 'SPONSOR' ? '/sponsor/pools' : user?.role === 'ADMIN' ? '/admin/pools' : '/pools';
  const body = head + action + instr + creator + leader;
  return appPage({ user, title: p.name, active: listHref, back: listHref, body, wallet, css: POOL_CSS, theme, bgCss });
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
.cp input[type=datetime-local]{min-width:0;width:100%;max-width:100%;-webkit-appearance:none;appearance:none;font-size:15px;padding-right:8px}
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
  const { user, wallet, role, tierKey, ads, theme, bgCss } = ctx;
  const admin = role === 'ADMIN', sponsor = role === 'SPONSOR';
  const canColour = admin || sponsor || tierKey === 'NEPO';
  const now = new Date(Date.now() + 10 * 60000), later = new Date(Date.now() + 70 * 60000);
  const local = d => new Date(d.getTime() + 60 * 60000).toISOString().slice(0, 16);   // shown in Lagos time (UTC+1); the browser converts back
  const kinds = admin ? [['FREE', 'Free'], ['PAID', 'Paid'], ['SPONSORED', 'Sponsored']] : [['FREE', 'Free'], ['PAID', 'Paid']];
  const approved = (ads || []).filter(a => a.approved && a.active);
  const body = `<h1 class="h1">Create a pool</h1><p class="sub">${sponsor ? 'You fund the prize from your wallet; players join free.' : admin ? 'As super admin you can create any type of pool.' : 'A free pool for fun, or a paid pool where every entry fee joins the prize.'}</p>
<div class="panel cp">${form('/api/pools', `
  ${field({ label: 'Pool name', name: 'name', placeholder: 'Friday Night Tap', attrs: 'maxlength="60" required autocomplete="off"' })}
  <div class="ta-field"><label class="ta-label" for="f-description">Description <small>(optional)</small></label><textarea class="ta-input" id="f-description" name="description" maxlength="300" placeholder="Anything players should know"></textarea><p class="ta-error" data-err="description"></p></div>
  ${sponsor ? '<input type="hidden" name="kind" value="SPONSORED">' : choice({ label: 'Type', name: 'kind', options: kinds, value: 'FREE' })}
  <div class="group" data-show="kind=PAID">
    <div class="two">${moneyField({ label: 'Entry fee (₦)', name: 'entry_fee', placeholder: '500', tip: 'What each player pays to join. Every entry fee goes into the prize pot, so the prize grows as more people join.' })}
    ${moneyField({ label: 'Starting prize (₦)', name: 'prize', placeholder: '0', tip: 'Optional money you add from your wallet so the pot starts bigger. It is locked into the pool once you create it.' })}</div>
  </div>
  ${sponsor || admin ? `<div class="group" data-show="kind=SPONSORED">${moneyField({ label: 'Prize (₦)', name: 'prize', id: 'f-prize-sp', placeholder: '50,000', tip: admin ? 'Funded by Tap Am. Players join free.' : 'The prize you fund from your wallet. Players join free.' })}</div>` : ''}
  <div class="two">${field({ label: 'Starts', name: 'starts_at', type: 'datetime-local', value: local(now), attrs: 'required' })}${field({ label: 'Ends', name: 'ends_at', type: 'datetime-local', value: local(later), attrs: 'required' })}</div>
  <p class="ta-hint" style="margin-top:-8px">A pool runs at least 60 seconds.</p>
  ${choice({ label: 'Who fit join', name: 'audience', options: [['ALL', 'Everybody'], ['LAPO', 'Lapo only'], ['MAPO', 'Mapo + Nepo'], ['NEPO', 'Nepo only']], value: 'ALL', cls: 'wrap4' })}
  ${choice({ label: 'Game type', name: 'game_type', options: [['STANDARD', 'Normal'], ['MATCH', 'VS (two sides)']], value: 'STANDARD', tip: 'VS: players pick a side. Each side has its own pot and the top tappers on each side share it.' })}
  <div class="group" data-show="game_type=MATCH">
    <div class="two">${field({ label: 'Side A', name: 'side_a', placeholder: 'Jollof', attrs: 'maxlength="24" autocomplete="off"' })}${field({ label: 'Side B', name: 'side_b', placeholder: 'Fried rice', attrs: 'maxlength="24" autocomplete="off"' })}</div>
  </div>
  <div class="two">${field({ label: 'How many winners', name: 'winners', type: 'number', value: '1', attrs: 'min="1" max="100" inputmode="numeric" data-split', tip: 'Up to 100 winners share the prize. For VS pools this is per side.' })}
  ${select({ label: 'Share it', name: 'split_style', options: [['TOP', 'Bigger for top places'], ['EQUAL', 'Equal shares']], value: 'TOP', attrs: 'data-split' })}</div>
  <div class="preview" data-split-preview>Winner takes all.</div>
  ${choice({ label: 'If players tie', name: 'tie_rule', options: [['FIRST', 'First to reach wins'], ['SPLIT', 'Split the prize']], value: 'FIRST' })}
  ${field({ label: 'Max players', name: 'max_players', placeholder: 'No limit', attrs: 'inputmode="numeric" autocomplete="off" data-num', hint: 'Leave empty for no limit.' })}
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
    : `<button type="button" class="lockrow" ${upgradeAttrs('NEPO', 'Custom tap area and background colours')}><span>Tap area + background</span>${ICONS.lock}</button>`}
  ${sponsor || admin ? `${choice({ label: 'Show your ad in this pool?', name: 'with_ad', options: [['NO', 'Without ad'], ['YES', 'With ad']], value: 'NO', tip: 'With ad: your ad pops up when players open the game, in the lobby and before results.' })}
  <div class="group" data-show="with_ad=YES">${approved.length ? select({ label: 'Pick your ad', name: 'promo_id', options: approved.map(a => [a.id, a.title]) }) : `<div class="note" style="margin:0">You don’t have an approved ad yet. <a href="${sponsor ? '/sponsor/ads' : '/admin/ads'}"><b>Create an ad first</b></a></div>`}</div>` : ''}
  ${check({ name: 'is_private', label: 'Private pool — Tap Am makes a password you share' })}
  ${check({ name: 'boosters_allowed', label: 'Allow boosters', checked: true })}
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
f.addEventListener('input',pad);f.addEventListener('change',pad);pad();`;
  return appPage({ user, title: 'Create a pool', active: role === 'SPONSOR' ? '/sponsor/pools' : role === 'ADMIN' ? '/admin/pools' : '/pools', body, wallet, narrow: true, css: CREATE_CSS, script, theme, bgCss });
}
