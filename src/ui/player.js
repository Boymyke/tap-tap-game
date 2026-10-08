// Player pages: home, pools, pool detail/lobby/results, store, bag, wallet, Nepo, me, create pool, calculator.
import { appPage, esc, naira, lagos, poolCard, tierBadge, stateBadge, field, select, choice, check, upload, form, postBtn } from './kit.js';
import { skinPreview } from './skins.js';

const pct = n => Math.round(Math.max(0, Math.min(1, n)) * 100);

// ── Home ────────────────────────────────────────────────────────────────────
export function dashboardPage(ctx) {
  const { user, tier, rank, wallet, live, mine, notes, nepo, unread } = ctx;
  const body = `
<section class="tcard card ${nepo ? 'tcard--gold' : ''}" style="margin-top:4px" data-rank-level="${rank.current.level}" data-rank-name="${esc(rank.current.name)}">
  <div class="row wrap"><div><div style="font:600 14px var(--body);opacity:.9">Welcome back</div><div style="font:800 36px/1 var(--display);text-transform:uppercase">${esc(user.username)}</div></div>${tierBadge(tier)}</div>
  <div style="margin-top:14px" class="row"><span style="font:800 20px var(--display);text-transform:uppercase">${esc(rank.current.name)}</span><span class="small">Rank ${rank.current.level}/100</span></div>
  <div class="bar-progress" style="margin-top:8px" role="progressbar" aria-valuenow="${pct(rank.progress)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct(rank.progress)}%"></i></div>
  ${rank.next ? `<p class="small" style="margin:8px 0 0">${pct(rank.progress)}% to <b>${esc(rank.next.name)}</b></p>` : '<p class="small" style="margin:8px 0 0">You don reach the top. Legend!</p>'}
</section>
<div class="grid g2" style="margin-top:14px">
  <a class="panel stat" href="/wallet" style="text-decoration:none"><span class="k">Wallet</span><span class="v">${naira(wallet.balance_kobo)}</span><span class="small muted">Spend only</span></a>
  <a class="panel stat" href="/wallet" style="text-decoration:none"><span class="k">Winnings</span><span class="v pos">${naira(wallet.winnings_kobo)}</span><span class="small muted">You fit withdraw</span></a>
</div>
<div class="grid g2" style="margin-top:12px">
  <form class="panel form" data-api="/api/pools/find" novalidate style="gap:8px"><label class="ta-label" for="f-code" style="margin:0">Join with a pool code</label><div class="row" style="gap:8px"><input class="ta-input" id="f-code" name="code" placeholder="TAPX7K2M" autocapitalize="characters" maxlength="12" style="text-transform:uppercase"><button class="btn btn--sm" type="submit">Go</button></div><p class="ta-error" data-err="code"></p></form>
  ${nepo ? '<a class="tcard card tcard--orange" href="/pools/new" style="text-decoration:none"><h3>Create a pool</h3><p>Set the prize, the rules and who fit join.</p></a>'
    : '<a class="tcard card tcard--gold" href="/nepo" style="text-decoration:none"><h3>Go Nepo</h3><p>Play 10 pools at once, create pools, more skins and boosters.</p></a>'}
</div>
<h2 class="h2">Live and coming up <a href="/pools">See all</a></h2>
${live.length ? `<div class="pgrid">${live.map(poolCard).join('')}</div>` : '<div class="empty">No pool dey open now. Check back soon or <a href="/pools">see past results</a>.</div>'}
${mine.length ? `<h2 class="h2">Your pools</h2><div class="pgrid">${mine.map(poolCard).join('')}</div>` : ''}
${mine.filter(p => p.state === 'live').length > 1 && nepo ? `<div class="actions"><a class="btn btn--shine" href="/play?pools=${mine.filter(p => p.state === 'live').map(p => p.id).slice(0, 10).join(',')}">Tap in all ${Math.min(10, mine.filter(p => p.state === 'live').length)} live pools</a></div>` : ''}
<h2 class="h2">Invite your people</h2>
<div class="panel"><p class="muted" style="margin:0 0 10px">Every 10 friends wey join with your link = 1 free booster. You don bring <b style="color:#fff">${user.referral_count || 0}</b>.</p>
<div class="row" style="gap:8px"><input class="ta-input" readonly value="${esc(ctx.origin)}/signup?ref=${esc(user.referral_code || '')}" id="reflink" aria-label="Your invite link"><button type="button" class="btn btn--sm" data-share="#reflink">Share</button></div></div>
${notes.length ? `<h2 class="h2">Latest <a href="/notifications">All</a></h2><div class="list">${notes.map(n => `<a class="item" href="${esc(n.link || '/notifications')}"><div class="grow"><div style="font-size:15px">${esc(n.text)}</div><div class="s">${lagos(n.created_at)}</div></div></a>`).join('')}</div>` : ''}`;
  return appPage({ user, title: 'Home', active: '/dashboard', body, wallet, unread, script: SHARE_JS });
}

const SHARE_JS = `document.querySelectorAll('[data-share]').forEach(function(b){b.addEventListener('click',function(){var i=document.querySelector(b.getAttribute('data-share'));var url=i.value;if(navigator.share){navigator.share({title:'Tap Am',text:'Come tap with me for Tap Am!',url:url}).catch(function(){});}else{i.select();try{navigator.clipboard.writeText(url);TA.toast('Link copied');}catch(e){document.execCommand('copy');TA.toast('Link copied');}}})});`;

// ── Pools list ──────────────────────────────────────────────────────────────
export function poolsPage(ctx) {
  const { user, scope, pools, wallet, unread, canCreate } = ctx;
  const tabs = [['open', 'Open'], ['mine', 'Joined'], ...(canCreate ? [['created', 'Created by me']] : []), ['recent', 'Results']];
  const body = `<h1 class="h1">Pools</h1>
<nav class="tabs" aria-label="Pool lists">${tabs.map(([k, l]) => `<a href="/pools?scope=${k}" ${k === scope ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
${canCreate ? '<div class="actions" style="margin:0 0 14px"><a class="btn btn--sm" href="/pools/new">+ Create pool</a></div>' : ''}
${pools.length ? `<div class="pgrid">${pools.map(poolCard).join('')}</div>` : `<div class="empty">${scope === 'mine' ? 'You never join any pool yet. <a href="/pools">See open pools</a>.' : scope === 'recent' ? 'No results this week yet.' : 'Nothing here right now.'}</div>`}`;
  return appPage({ user, title: 'Pools', active: user.role === 'SPONSOR' ? '/sponsor/pools' : '/pools', body, wallet, unread });
}

// ── Pool detail: join, lobby, results ───────────────────────────────────────
export function poolPage(ctx) {
  const { user, pool: p, board, results, wallet, unread, isCreator, canJoin, joinWhy, nepo, myBoosters, entries } = ctx;
  const color = p.kind === 'SPONSORED' ? 'tcard--orange' : p.kind === 'PAID' ? 'tcard--gold' : '';
  const splitText = p.split.length === 1 ? 'Winner takes all' : `Top ${p.split.length} share: ${p.split.map(x => x + '%').join(' / ')}`;
  const tieText = p.tie === 'SPLIT' ? 'Ties: tied players split the prize' : 'Ties: whoever reached the score first wins';
  const head = `<section class="tcard card ${color}" style="${p.theme ? `--c:${esc(p.theme)}` : ''};margin-top:4px">
  <div class="row wrap">${stateBadge(p.state)}<span class="row" style="gap:6px">${p.kind === 'SPONSORED' ? '<span class="badge sponsor">Sponsored</span>' : p.kind === 'PAID' ? '<span class="badge nepo">Paid pool</span>' : '<span class="badge">Free pool</span>'}${p.private ? '<span class="badge">Private</span>' : ''}</span></div>
  ${p.gameType === 'MATCH' ? `<div class="vsrow" style="margin-top:12px"><span class="code">${esc(p.sideA)}</span><span class="vs">VS</span><span class="code">${esc(p.sideB)}</span></div>` : ''}
  <h1 style="margin:10px 0 4px;font:800 clamp(32px,8vw,48px)/.95 var(--display);text-transform:uppercase">${esc(p.name)}</h1>
  ${p.sponsor ? `<p style="margin:0 0 6px">Sponsored by <b>${esc(p.sponsor)}</b></p>` : ''}
  ${p.description ? `<p>${esc(p.description)}</p>` : ''}
  <div class="grid g2" style="margin-top:10px"><div class="stat"><span class="k">Prize</span><span class="v">${p.prize ? naira(p.prize) : 'Glory'}</span></div><div class="stat"><span class="k">Entry</span><span class="v">${p.entryFee ? naira(p.entryFee) : 'Free'}</span></div></div>
  <div class="row wrap" style="margin-top:12px"><div><div class="small">${p.state === 'soon' ? 'Starts in' : p.state === 'live' ? 'Ends in' : 'Ended'}</div>${p.state === 'ended' || p.state === 'cancelled' ? `<b>${lagos(p.endsAt)}</b>` : `<span class="segbox" style="margin-top:4px"><span class="seg" data-countdown="${esc(p.state === 'soon' ? p.startsAt : p.endsAt)}" data-reload-at-zero style="font-size:26px"></span></span>`}</div><div style="text-align:right"><div class="small">Players</div><b style="font:800 26px var(--display)">${Number(p.players).toLocaleString('en-NG')}</b></div></div>
  <p class="small" style="margin:12px 0 0">${splitText}. ${tieText}. ${p.audience === 'NEPO' ? 'Nepo babies only.' : p.audience === 'LAPO' ? 'Lapo babies only.' : 'Everybody fit join.'} Code: <b>${esc(p.code)}</b></p>
</section>`;

  let action = '';
  if (p.state === 'ended' || p.state === 'cancelled') action = '';
  else if (!p.joined && user?.role === 'USER') {
    if (!canJoin) action = `<div class="panel" style="margin-top:12px"><p style="margin:0">${esc(joinWhy)}</p>${joinWhy.includes('Nepo') ? '<div class="actions"><a class="btn" href="/nepo">Go Nepo</a></div>' : ''}</div>`;
    else action = `<div class="panel" style="margin-top:12px">${form(`/api/pools/${p.id}/join`, `
      ${p.private ? field({ label: 'Pool password', name: 'password', placeholder: 'XXXX-XXXX', attrs: 'autocapitalize="characters" maxlength="9" required' }) : ''}
      ${p.gameType === 'MATCH' ? choice({ label: 'Pick your side', name: 'side', options: [[p.sideA, p.sideA], [p.sideB, p.sideB]], value: '' }) : ''}
      ${p.entryFee ? `<div class="note">Entry fee <b>${naira(p.entryFee)}</b> comes from your wallet (you have ${naira(wallet.balance_kobo)}). It joins the prize and is <b>not refunded</b> once the pool starts.</div>${wallet.balance_kobo < p.entryFee && wallet.winnings_kobo >= p.entryFee ? check({ name: 'use_winnings', label: `Pay from my winnings (${naira(wallet.winnings_kobo)})` }) : ''}` : ''}
    `, { submit: p.entryFee ? `Pay ${naira(p.entryFee)} and join` : 'Join this pool', shine: true })}</div>`;
  } else if (p.joined) {
    action = `<div class="panel" style="margin-top:12px">
      <div class="row wrap"><div><div class="small muted">Your score</div><b style="font:800 30px var(--display)">${Number(board?.me?.score || 0).toLocaleString('en-NG')}</b></div><div style="text-align:right"><div class="small muted">Your position</div><b style="font:800 30px var(--display)">${board?.me?.rank ? '#' + board.me.rank : '—'}</b></div></div>
      <div class="actions"><a class="btn btn--shine" href="/play?pools=${p.id}" ${p.state === 'soon' ? '' : ''}>${p.state === 'live' ? 'Tap now' : 'Enter the lobby'}</a></div>
      <p class="small muted" style="margin:10px 0 0">${p.boosters ? (p.boosterUsed ? 'You don use your booster for this pool.' : `You fit use one booster in this pool. You have ${myBoosters} booster${myBoosters === 1 ? '' : 's'}.`) : 'Boosters are off for this pool.'}</p>
    </div>`;
  }

  const creator = isCreator ? `<h2 class="h2">You created this pool</h2><div class="panel">
    ${p.private ? `<p style="margin:0 0 8px">Password to share: <b style="font:800 22px var(--display);letter-spacing:1px">${esc(p.password)}</b></p>` : ''}
    <p class="muted" style="margin:0 0 8px">Pools can’t be deleted until they end.</p>
    <div class="row" style="gap:8px"><input class="ta-input" readonly id="plink" value="${esc(ctx.origin)}/pool/${p.id}" aria-label="Pool link"><button class="btn btn--sm" type="button" data-share="#plink">Share</button></div>
    ${entries ? `<p style="margin:12px 0 6px"><b>${entries.length}</b> player${entries.length === 1 ? '' : 's'} joined</p><div class="list">${entries.slice(0, 50).map(e => `<div class="item"><div class="grow"><div class="t" style="font-size:16px">${esc(e.username)}</div><div class="s">Joined ${lagos(e.joined_at)}${e.paid_kobo ? ' · paid ' + naira(e.paid_kobo) : ''}</div></div></div>`).join('')}</div>` : ''}
  </div>` : '';

  const leader = board && board.top?.length ? `<h2 class="h2">${p.state === 'ended' ? 'Final board' : 'Leaderboard'}</h2>
    ${board.teams && Object.keys(board.teams).length ? `<div class="grid g2" style="margin-bottom:10px">${Object.entries(board.teams).map(([k, v]) => `<div class="panel stat"><span class="k">${esc(k)}</span><span class="v">${Number(v).toLocaleString('en-NG')}</span></div>`).join('')}</div>` : ''}
    <div class="list">${(results || board.top).map(r => `<div class="item" style="${r.me ? 'box-shadow:inset 0 0 0 2px var(--neon)' : ''}"><b style="font:800 22px var(--display);width:42px">#${r.r}</b><div class="grow"><div class="t" style="font-size:17px">${esc(r.n)}${r.t === 'NEPO' ? ' <span class="badge nepo" style="font-size:10px">Nepo</span>' : ''}</div>${r.side ? `<div class="s">${esc(r.side)}</div>` : ''}</div><div style="text-align:right"><div class="amt">${Number(r.s).toLocaleString('en-NG')}</div>${r.prize ? `<div class="small pos">${naira(r.prize)}</div>` : ''}</div></div>`).join('')}</div>` : (p.state === 'ended' ? '<div class="empty" style="margin-top:14px">Nobody tap for this pool.</div>' : '');

  const body = head + action + creator + leader + `<div class="actions" style="margin-top:16px"><a class="btn btn--ghost btn--sm" href="/pools">All pools</a></div>`;
  return appPage({ user, title: p.name, active: '/pools', body, wallet, unread, script: SHARE_JS });
}

// ── Store ───────────────────────────────────────────────────────────────────
export function storePage(ctx) {
  const { user, items, tab, wallet, unread } = ctx;
  const tabs = [['BOOSTER', 'Boosters'], ['SKIN', 'Tap skins'], ['SHAPE', 'Tap shapes']];
  const shown = items.filter(i => i.kind === tab);
  const card = i => {
    const cfg = JSON.parse(i.config || '{}');
    const visual = i.kind === 'BOOSTER' ? `<div class="segbox" style="align-self:flex-start"><span class="seg" data-seg="${String(i.multiplier).replace(/\.0$/, '')}" style="font-size:30px"></span><span class="seglabel">× for ${i.duration_seconds}s</span></div>`
      : i.kind === 'SKIN' ? skinPreview(cfg) : `<div class="tcard skin-prev shape-${esc(cfg.shape)}" style="border-radius:${cfg.shape === 'circle' ? '50%' : cfg.shape === 'rounded' ? '40px' : '18px'}"><span>TAP</span></div>`;
    const btn = i.blocked ? `<span class="badge">${esc(i.blocked)}</span>`
      : i.kind !== 'BOOSTER' && (i.owned || i.price_kobo === 0) ? (i.equipped ? '<span class="badge live">Equipped</span>' : postBtn('/api/equip', 'Use this', { body: { item: i.id }, cls: 'btn--sm' }))
      : postBtn('/api/store/buy', i.price_kobo ? `Buy ${naira(i.price_kobo)}` : 'Get free', { body: { item: i.id, qty: 1 }, cls: 'btn--sm', confirm: i.price_kobo ? `Buy ${i.name} for ${naira(i.price_kobo)} from your wallet?` : '' });
    return `<div class="panel store-item">${visual}<div style="font:800 22px/1 var(--display);text-transform:uppercase;margin-top:10px">${esc(i.name)}</div><p class="muted small" style="margin:4px 0 10px">${esc(i.description)}</p>
      <div class="row wrap"><span class="row" style="gap:6px">${i.audience === 'NEPO' ? '<span class="badge nepo">Nepo</span>' : ''}${i.min_rank > 1 ? `<span class="badge">Rank ${i.min_rank}+</span>` : ''}${i.kind === 'BOOSTER' && i.owned ? `<span class="badge live">You have ${i.owned}</span>` : ''}</span>${btn}</div></div>`;
  };
  const body = `<h1 class="h1">Store</h1><p class="sub">Pay from your wallet. Lapo babies get the boy and girl pads plus Turbo boosters; Nepo babies unlock everything else as they rank up.</p>
<nav class="tabs">${tabs.map(([k, l]) => `<a href="/store?tab=${k}" ${k === tab ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
<div class="grid g3">${shown.map(card).join('') || '<div class="empty">Nothing here yet.</div>'}</div>
<div class="actions"><a class="btn btn--ghost btn--sm" href="/bag">My bag</a><a class="btn btn--ghost btn--sm" href="/wallet">Fund wallet</a></div>`;
  return appPage({ user, title: 'Store', active: '/store', body, wallet, unread, css: SKIN_CSS });
}

export const SKIN_CSS = `.skin-prev{height:120px;display:grid;place-items:center;overflow:hidden;box-shadow:0 8px 20px rgba(0,0,0,.4)}
.skin-prev::before{inset:6px;border-width:2px;border-radius:inherit}
.skin-prev span{position:relative;font:800 italic 34px var(--display);color:#fff;text-shadow:0 3px 0 rgba(0,0,0,.3)}
.skin-prev .pad-art{position:absolute;inset:0;display:grid;place-items:center;opacity:.55}.skin-prev .pad-art svg{height:86%}
.skin-prev.shape-circle{width:120px;margin:0 auto}
.skin-prev.shape-hex{clip-path:polygon(25% 3%,75% 3%,100% 50%,75% 97%,25% 97%,0 50%)}
.skin-prev.glow{box-shadow:0 0 0 3px #5dff4a,0 0 26px rgba(93,255,74,.6)}
.store-item{display:flex;flex-direction:column}`;

// ── Bag (inventory, gifting, Nepo colours) ──────────────────────────────────
export function bagPage(ctx) {
  const { user, inv, nepo, prefs, wallet, unread } = ctx;
  const boosters = inv.filter(i => i.kind === 'BOOSTER' && i.quantity > 0);
  const body = `<h1 class="h1">My bag</h1>
<h2 class="h2">Boosters</h2>${boosters.length ? `<div class="list">${boosters.map(b => `<div class="item"><span class="segbox"><span class="seg" data-seg="${String(b.multiplier).replace(/\.0$/, '')}" style="font-size:20px"></span></span><div class="grow"><div class="t">${esc(b.name)}</div><div class="s">${b.multiplier}× for ${b.duration_seconds}s · ${b.audience === 'NEPO' ? 'Nepo booster' : 'Everyone'}</div></div><b class="amt">×${b.quantity}</b></div>`).join('')}</div>` : '<div class="empty">No boosters. <a href="/store">Get some</a>.</div>'}
${nepo ? `<h2 class="h2">Gift a booster</h2><div class="panel">${form('/api/gift', `
  ${field({ label: 'Player nickname', name: 'to', placeholder: 'Their nickname', attrs: 'autocapitalize="none" maxlength="24" required' })}
  <div class="two">${select({ label: 'Booster', name: 'item', options: boosters.map(b => [b.item_id, `${b.name} (you have ${b.quantity})`]) })}${field({ label: 'How many', name: 'qty', type: 'number', value: '1', attrs: 'min="1" max="20" inputmode="numeric"' })}</div>
  <p class="small muted" style="margin:0">Nepo boosters can only go to other Nepo babies.</p>`, { submit: 'Send gift', ok: 'reload' })}</div>` : ''}
<h2 class="h2">Tap skins & shapes <a href="/store?tab=SKIN">Store</a></h2>
<div class="grid g3">${inv.filter(i => i.kind !== 'BOOSTER').map(i => `<div class="panel">${i.kind === 'SKIN' ? skinPreview(JSON.parse(i.config || '{}')) : ''}<div class="row" style="margin-top:10px"><b style="font:800 20px var(--display);text-transform:uppercase">${esc(i.name)}</b>${i.equipped ? '<span class="badge live">In use</span>' : postBtn('/api/equip', 'Use', { body: { item: i.item_id }, cls: 'btn--sm' })}</div></div>`).join('')}</div>
${nepo ? `<h2 class="h2">Your colours</h2><div class="panel">${form('/api/prefs', `
  <div class="two"><div class="ta-field"><label class="ta-label" for="pc">Tap box colour</label><input class="color-in" id="pc" type="color" name="padColor" value="${esc(prefs.padColor || '#1c5a33')}"></div>
  <div class="ta-field"><label class="ta-label" for="pb">Page background</label><input class="color-in" id="pb" type="color" name="pageBg" value="${esc(prefs.pageBg || '#01240c')}"></div></div>
  <p class="small muted" style="margin:0">Your colours show when you play. Pools with their own colours use the pool’s.</p>`, { submit: 'Save colours', ok: 'reload' })}
  <div class="actions">${postBtn('/api/prefs', 'Reset colours', { body: { padColor: '', pageBg: '' } })}${postBtn('/api/equip', 'Square box', { body: { item: 'shape-rect' } })}</div></div>` : ''}`;
  return appPage({ user, title: 'My bag', active: '/me', body, wallet, unread, css: SKIN_CSS });
}

// ── Wallet ──────────────────────────────────────────────────────────────────
export function walletPage(ctx) {
  const { user, wallet, tx, withdrawals, minWithdraw, banks, payMode, unread, flash } = ctx;
  const sponsor = user.role === 'SPONSOR';
  const body = `<h1 class="h1">Wallet</h1>
${flash ? `<div class="panel" style="margin-bottom:12px;box-shadow:inset 0 0 0 2px var(--neon)">${esc(flash)}</div>` : ''}
${payMode === 'test' ? '<div class="note" style="margin-bottom:12px;padding:12px 14px;border-radius:12px;background:rgba(239,192,50,.14);color:#ffe9a6">Test mode: payments are simulated. No real money moves until Paystack is connected.</div>' : ''}
<div class="grid ${sponsor ? '' : 'g2'}">
  <div class="tcard card"><div class="stat"><span class="k">Wallet${sponsor ? ' (for prizes)' : ''}</span><span class="v">${naira(wallet.balance_kobo)}</span><span class="small">Money you add. Spend only — e no dey withdraw.</span></div></div>
  ${sponsor ? '' : `<div class="tcard card tcard--gold"><div class="stat"><span class="k">Winnings</span><span class="v">${naira(wallet.winnings_kobo)}</span><span class="small">Money you win. Withdraw from ${naira(minWithdraw)}.</span></div></div>`}
</div>
<h2 class="h2">Add money</h2><div class="panel">${form('/api/wallet/fund', `
  ${field({ label: 'Amount (₦)', name: 'amount', type: 'number', placeholder: '2000', attrs: 'min="100" step="50" inputmode="numeric" required' })}
  <div class="note"><b>Important:</b> money you add to your wallet <b>can’t be withdrawn</b>. You spend it inside Tap Am — on pool entries, boosters, skins${sponsor ? ' and sponsored prizes' : ' and Nepo'}. Only winnings can be withdrawn.</div>
  ${check({ name: 'ack', label: 'I understand money I add can’t be withdrawn.' })}`, { submit: payMode === 'off' ? 'Payments open soon' : 'Add money', shine: true, ok: 'reload' })}</div>
${sponsor ? '' : `<h2 class="h2">Withdraw winnings</h2><div class="panel">${form('/api/withdraw', `
  ${field({ label: 'Amount (₦)', name: 'amount', type: 'number', placeholder: String(minWithdraw / 100), attrs: `min="${minWithdraw / 100}" inputmode="numeric" required`, hint: `Minimum ${naira(minWithdraw)} for ${user.isNepo ? 'Nepo' : 'Lapo'} babies.` })}
  ${select({ label: 'Bank', name: 'bank_code', options: [['', 'Pick your bank'], ...banks] })}
  <div class="two">${field({ label: 'Account number', name: 'account_number', attrs: 'inputmode="numeric" maxlength="10" pattern="[0-9]{10}" required' })}${field({ label: 'Account name', name: 'account_name', attrs: 'maxlength="80" required' })}</div>
  <p class="small muted" style="margin:0">We check every withdrawal before paying, to keep everyone safe.</p>`, { submit: 'Request withdrawal', ok: 'reload' })}</div>
${withdrawals.length ? `<h2 class="h2">Withdrawals</h2><div class="list">${withdrawals.map(w => `<div class="item"><div class="grow"><div class="t" style="font-size:17px">${naira(w.amount_kobo)} → ${esc(w.bank_name || w.bank_code)} ••${esc(String(w.account_number).slice(-4))}</div><div class="s">${lagos(w.created_at)}${w.admin_note ? ' · ' + esc(w.admin_note) : ''}</div></div><span class="badge ${w.status === 'PAID' ? 'live' : w.status === 'REJECTED' || w.status === 'FAILED' ? 'red' : 'soon'}">${w.status.toLowerCase()}</span></div>`).join('')}</div>` : ''}`}
<h2 class="h2">History</h2>${tx.length ? `<div class="list">${tx.map(t => `<div class="item"><div class="grow"><div style="font-weight:700">${esc(TX[t.type] || t.type)}</div><div class="s">${esc(t.note || '')}${t.note ? ' · ' : ''}${t.balance === 'WINNINGS' ? 'Winnings' : t.balance === 'CARD' ? 'Card' : 'Wallet'} · ${lagos(t.created_at)}</div></div><b class="amt ${t.amount_kobo >= 0 ? 'pos' : 'neg'}">${t.amount_kobo >= 0 ? '+' : '−'}${naira(Math.abs(t.amount_kobo))}</b></div>`).join('')}</div>` : '<div class="empty">No money movement yet.</div>'}`;
  return appPage({ user, title: 'Wallet', active: '/wallet', body, wallet, unread });
}
const TX = { FUND: 'Added money', ENTRY_FEE: 'Pool entry', PRIZE: 'Prize won', STORE: 'Store', NEPO: 'Nepo subscription', WITHDRAW: 'Withdrawal', WITHDRAW_REFUND: 'Withdrawal refund', REFUND: 'Refund', POOL_PRIZE: 'Pool prize funding', ADMIN_ADJUST: 'Adjustment' };

// ── Nepo ────────────────────────────────────────────────────────────────────
export function nepoPage(ctx) {
  const { user, nepo, until, monthly, yearly, wallet, unread, payMode } = ctx;
  const perks = ['Play up to 10 pools at once — one tap counts in all', 'Create your own pools (free or paid)', 'Gift boosters to friends', 'Nepo boosters (3× and 5×) and the booster calculator', 'More tap skins, shapes and your own colours', 'Talk live in games once you reach Para Para Boy', `Withdraw from ${'₦5,000'} (Lapo: ₦10,000)`, 'Bonus boosters every time you subscribe'];
  const body = `<h1 class="h1">Go Nepo</h1><p class="sub">${nepo ? `You are a Nepo baby till <b>${lagos(until, { hour: undefined, minute: undefined, year: 'numeric' })}</b>. Renewing adds more time.` : 'Lapo babies play free. Nepo babies play big.'}</p>
<section class="tcard card tcard--gold"><h3>What Nepo babies get</h3><ul style="margin:6px 0 0;padding-left:20px;line-height:1.7">${perks.map(x => `<li>${x}</li>`).join('')}</ul></section>
<div class="grid g2m" style="margin-top:14px">
  ${[['month', 'Monthly', monthly, 'Billed every month'], ['year', 'Yearly', yearly, `That’s ${naira(Math.round(yearly / 12))} a month — save ${Math.round((1 - yearly / (monthly * 12)) * 100)}%`]].map(([plan, label, price, sub]) => `
  <div class="panel"><div style="font:800 24px var(--display);text-transform:uppercase">${label}</div><div style="font:800 40px/1 var(--display);margin:6px 0">${naira(price)}</div><p class="muted small" style="margin:0 0 10px">${sub}</p>
    <div class="actions">${postBtn('/api/nepo/subscribe', 'Pay from wallet', { body: { plan, method: 'wallet' }, cls: 'btn--sm', confirm: `Pay ${naira(price)} from your wallet for Nepo ${label.toLowerCase()}?` })}${payMode !== 'off' ? postBtn('/api/nepo/subscribe', 'Pay with card', { body: { plan, method: 'card' }, cls: 'btn--ghost btn--sm' }) : ''}</div></div>`).join('')}
</div>
<p class="small muted" style="margin-top:12px">Your wallet has ${naira(wallet.balance_kobo)}. Nepo doesn’t renew by itself — we remind you before it ends.</p>`;
  return appPage({ user, title: 'Go Nepo', active: '/me', body, wallet, unread });
}

// ── Me ──────────────────────────────────────────────────────────────────────
export function mePage(ctx) {
  const { user, tier, rank, wallet, unread, prefs, nepo, until, voiceRank } = ctx;
  const next = rank.next;
  const req = next ? [
    next.min_taps ? `<li>${Number(user.lifetime_taps).toLocaleString('en-NG')} / ${Number(next.min_taps).toLocaleString('en-NG')} lifetime taps</li>` : '',
    next.min_games ? `<li>${user.games_played} / ${next.min_games} games played</li>` : '',
    next.min_wins ? `<li>${user.wins} / ${next.min_wins} wins</li>` : ''].join('') : '';
  const body = `<h1 class="h1">${esc(user.username)}</h1>
<div class="row wrap" style="margin:-4px 2px 14px">${tierBadge(tier)}${nepo ? `<span class="small muted">Nepo till ${lagos(until, { hour: undefined, minute: undefined })}</span>` : '<a class="btn btn--sm btn--gold" href="/nepo">Go Nepo</a>'}</div>
<section class="tcard card" style="--c:${esc(rank.current.color)}"><div class="small">Rank ${rank.current.level} of 100</div><h3 style="font-size:34px">${esc(rank.current.name)}</h3>
<div class="bar-progress" style="margin-top:8px"><i style="width:${pct(rank.progress)}%"></i></div>
${next ? `<p class="small" style="margin:10px 0 4px">Next: <b>${esc(next.name)}</b></p><ul class="small" style="margin:0;padding-left:18px">${req}</ul>${next.unlocks ? `<p class="small" style="margin:6px 0 0">Unlocks: ${esc(next.unlocks.replace(/,/g, ', '))}</p>` : ''}` : ''}
${rank.current.level < voiceRank ? `<p class="small" style="margin:8px 0 0">Live voice unlocks at rank ${voiceRank} (Para Para Boy I) for Nepo babies.</p>` : ''}</section>
<div class="grid g3" style="margin-top:12px"><div class="panel stat"><span class="k">Lifetime taps</span><span class="v">${Number(user.lifetime_taps).toLocaleString('en-NG')}</span></div><div class="panel stat"><span class="k">Games</span><span class="v">${user.games_played}</span></div><div class="panel stat"><span class="k">Wins</span><span class="v">${user.wins}</span></div></div>
<div class="grid g2" style="margin-top:12px"><a class="tcard card tcard--orange" href="/bag" style="text-decoration:none"><h3>My bag</h3><p>Boosters, skins, gifts</p></a><a class="tcard card tcard--mustard" href="/leaderboard" style="text-decoration:none"><h3>Top players</h3><p>See who dey lead</p></a>
${nepo ? '<a class="tcard card" href="/calc" style="text-decoration:none"><h3>Booster calculator</h3><p>Where to use your booster</p></a><a class="tcard card tcard--ink" href="/pools/new" style="text-decoration:none"><h3>Create pool</h3><p>Your rules, your prize</p></a>' : ''}</div>
<h2 class="h2">Settings</h2><div class="panel">${form('/api/prefs', check({ name: 'vibrate', label: 'Vibrate on combos and milestones', checked: prefs.vibrate !== false }), { submit: 'Save' })}
<div class="actions"><button type="button" class="btn btn--ghost btn--sm" data-logout>Log out</button><a class="btn btn--ghost btn--sm" href="/rules">Rules</a></div></div>`;
  return appPage({ user, title: 'Me', active: '/me', body, wallet, unread });
}

// ── Create pool ─────────────────────────────────────────────────────────────
export function createPoolPage(ctx) {
  const { user, wallet, unread, role } = ctx;
  const admin = role === 'ADMIN', sponsor = role === 'SPONSOR';
  const now = new Date(Date.now() + 10 * 60000), later = new Date(Date.now() + 70 * 60000);
  const local = d => new Date(d.getTime() + 60 * 60000).toISOString().slice(0, 16);   // Lagos (UTC+1) default
  const body = `<h1 class="h1">Create a pool</h1><p class="sub">${sponsor ? 'You fund the prize from your wallet; players compete for free.' : admin ? 'As super admin you can create any type of pool.' : 'Free pool for fun, or paid pool where every entry fee joins the prize.'}</p>
<div class="panel">${form('/api/pools', `
  ${field({ label: 'Pool name', name: 'name', placeholder: 'Friday Night Tap', attrs: 'maxlength="60" required' })}
  <div class="ta-field"><label class="ta-label" for="f-description">Description <small>(optional)</small></label><textarea class="ta-input" id="f-description" name="description" maxlength="300" placeholder="Anything players should know"></textarea><p class="ta-error" data-err="description"></p></div>
  ${sponsor ? '<input type="hidden" name="kind" value="SPONSORED">' : choice({ label: 'Type', name: 'kind', options: admin ? [['FREE', 'Free'], ['PAID', 'Paid'], ['SPONSORED', 'Sponsored']] : [['FREE', 'Free'], ['PAID', 'Paid']], value: 'FREE' })}
  <div class="two">${field({ label: 'Entry fee (₦)', name: 'entry_fee', type: 'number', placeholder: '500', attrs: 'min="0" inputmode="numeric"', hint: 'Paid pools only.' })}${field({ label: sponsor ? 'Prize (₦)' : 'Starting prize (₦)', name: 'prize', type: 'number', placeholder: sponsor ? '50000' : '0', attrs: 'min="0" inputmode="numeric"', hint: admin ? 'Funded by Tap Am.' : 'Comes from your wallet.' })}</div>
  <div class="two">${field({ label: 'Starts (Lagos time)', name: 'starts_at', type: 'datetime-local', value: local(now), attrs: 'required' })}${field({ label: 'Ends', name: 'ends_at', type: 'datetime-local', value: local(later), attrs: 'required' })}</div>
  ${choice({ label: 'Who fit join', name: 'audience', options: [['ALL', 'Everybody'], ['LAPO', 'Lapo only'], ['NEPO', 'Nepo only']], value: 'ALL' })}
  ${choice({ label: 'Prize split', name: 'split', options: [['winner', 'Winner takes all'], ['top3', 'Top 3'], ['top5', 'Top 5'], ['top10', 'Top 10']], value: 'winner' })}
  ${choice({ label: 'If players tie', name: 'tie_rule', options: [['FIRST', 'First to reach wins'], ['SPLIT', 'Split the prize']], value: 'FIRST' })}
  ${choice({ label: 'Game type', name: 'game_type', options: [['STANDARD', 'Normal'], ['MATCH', 'VS (two sides)']], value: 'STANDARD' })}
  <div class="two">${field({ label: 'Side A (VS only)', name: 'side_a', placeholder: 'Jollof', attrs: 'maxlength="24"' })}${field({ label: 'Side B', name: 'side_b', placeholder: 'Fried rice', attrs: 'maxlength="24"' })}</div>
  <div class="two"><div class="ta-field"><label class="ta-label" for="tc">Pool colour</label><input class="color-in" id="tc" type="color" name="theme_color" value="#1c5a33"></div>${field({ label: 'Max players', name: 'max_players', type: 'number', value: '1000', attrs: 'min="2" inputmode="numeric"' })}</div>
  ${upload({ label: 'Tap area picture (optional)', name: 'skin_url' })}
  ${check({ name: 'is_private', label: 'Private pool — Tap Am generates a password you share' })}
  ${check({ name: 'boosters_allowed', label: 'Allow boosters (one per player)', checked: true })}
  ${admin ? '' : `<div class="note">Once you create a pool, <b>you can’t delete it</b> until it ends. Prize money you put in is locked into the pool.</div>${check({ name: 'ack', label: 'I understand the pool can’t be deleted until it ends.' })}`}
`, { submit: 'Create pool', shine: true })}</div>`;
  return appPage({ user, title: 'Create a pool', active: role === 'SPONSOR' ? '/sponsor/pools' : role === 'ADMIN' ? '/admin/pools' : '/pools', body, wallet, unread, narrow: true });
}

// ── Booster calculator ──────────────────────────────────────────────────────
export function calcPage(ctx) {
  const { user, wallet, unread } = ctx;
  const body = `<h1 class="h1">Booster calculator</h1><p class="sub">We look at your live pools, the scores around you and your tapping speed, then tell you where one booster moves you the most.</p>
<div class="panel"><label class="ta-label" for="rate">Your speed (taps per second)</label><div class="row" style="gap:8px"><input class="ta-input" id="rate" type="number" min="1" max="20" value="6" inputmode="numeric"><button class="btn btn--sm" id="go" type="button">Calculate</button></div><p class="small muted" style="margin:8px 0 0">Not sure? Most people do 5–8. Try the 10-second game on the home page to check.</p></div>
<div id="out" style="margin-top:14px"></div>`;
  const script = `
(function(){var out=document.getElementById('out'),r=document.getElementById('rate');try{var b=localStorage.getItem('ta-best');if(b)r.value=Math.max(1,Math.round(+b/10));}catch(e){}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function run(){out.innerHTML='<div class="empty">Calculating…</div>';TA.api('/api/calc?rate='+encodeURIComponent(r.value),undefined,'GET').then(function(j){
 if(!j._ok){out.innerHTML='<div class="empty">'+esc(j.error||'Error')+'</div>';return;}
 if(!j.pools.length){out.innerHTML='<div class="empty">Join some pools first, then come back.</div>';return;}
 var h='';if(j.best)h+='<div class="tcard card tcard--gold" style="margin-bottom:14px"><h3>Best move</h3><p>Use <b>'+esc(j.best.itemName)+'</b> in <b>'+esc(j.best.poolName)+'</b> — one booster fit carry you to the <b>top '+j.best.reach+'</b>.</p><a class="btn btn--sm" href="/play?pools='+j.best.pool+'">Go there</a></div>';
 else h+='<div class="panel" style="margin-bottom:14px">No single booster go change your position much right now. Keep tapping and check again.</div>';
 j.pools.forEach(function(p){h+='<div class="panel" style="margin-bottom:12px"><div class="row"><b style="font:800 21px var(--display);text-transform:uppercase">'+esc(p.name)+'</b><span class="badge">#'+(p.rank||'—')+' of '+p.total+'</span></div>';
  if(p.usedBooster)h+='<p class="small muted" style="margin:6px 0 0">You don use your booster here.</p>';else if(!p.boostersAllowed)h+='<p class="small muted" style="margin:6px 0 0">Boosters are off here.</p>';
  else if(!p.options.length)h+='<p class="small muted" style="margin:6px 0 0">You have no boosters. <a href="/store">Get some</a>.</p>';
  else{h+='<div class="tbl-wrap" style="margin-top:10px"><table class="tbl" style="min-width:0"><tr><th>Booster</th><th>+taps</th><th>To #1</th><th>To top 3</th></tr>';p.options.forEach(function(o){h+='<tr><td>'+esc(o.name)+' ×'+o.owned+'</td><td>+'+o.extraPerUse+'</td><td>'+(o.toTop1===0?'You lead':o.toTop1+' use'+(o.toTop1>1?'s':''))+'</td><td>'+(o.toTop3===0?'In':o.toTop3+' use'+(o.toTop3>1?'s':''))+'</td></tr>'});h+='</table></div><p class="small muted" style="margin:6px 0 0">Remember: one booster per pool.</p>';}
  h+='</div>';});out.innerHTML=h;});}
document.getElementById('go').addEventListener('click',run);run();})();`;
  return appPage({ user, title: 'Booster calculator', active: '/me', body, wallet, unread, script, narrow: true });
}

// ── Notifications & leaderboard ─────────────────────────────────────────────
export function notificationsPage(ctx) {
  const { user, notes, wallet } = ctx;
  const body = `<h1 class="h1">Notifications</h1>${notes.length ? `<div class="list">${notes.map(n => `<a class="item" href="${esc(n.link || '#')}" style="${n.read ? '' : 'box-shadow:inset 0 0 0 2px var(--neon)'}"><div class="grow"><div>${esc(n.text)}</div><div class="s">${lagos(n.created_at)}</div></div></a>`).join('')}</div>` : '<div class="empty">Nothing yet.</div>'}`;
  return appPage({ user, title: 'Notifications', body, wallet, script: `TA.api('/api/notifications/read',{});` });
}
export function leaderboardPage(ctx) {
  const { user, rows, wallet, unread } = ctx;
  const body = `<h1 class="h1">Top players</h1><p class="sub">Ranked by rank, then lifetime taps.</p><div class="list">${rows.map((r, i) => `<div class="item" style="${r.id === user?.id ? 'box-shadow:inset 0 0 0 2px var(--neon)' : ''}"><b style="font:800 22px var(--display);width:44px">#${i + 1}</b><div class="grow"><div class="t" style="font-size:17px">${esc(r.username)} ${r.nepo ? '<span class="badge nepo" style="font-size:10px">Nepo</span>' : ''}</div><div class="s">${esc(r.rank_name)} · ${r.games_played} games · ${r.wins} wins</div></div><div class="amt">${Number(r.lifetime_taps).toLocaleString('en-NG')}</div></div>`).join('')}</div>`;
  return appPage({ user, title: 'Top players', active: '/me', body, wallet, unread });
}
