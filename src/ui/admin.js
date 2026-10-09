// Super admin pages.
import { appPage, esc, naira, lagos, field, select, choice, check, form, postBtn, upload, stateBadge, tierBadge } from './kit.js';
import { themeShell } from './theme.js';
import { skinPreview } from './skins.js';
import { adForm, adList, AD_CSS, AD_JS } from './sponsor.js';
import { SKIN_CSS } from './player.js';

const tabs = (cur) => `<nav class="tabs" aria-label="Admin sections">${[['/admin', 'Overview'], ['/admin/users', 'Users'], ['/admin/pools', 'Pools'], ['/admin/store', 'Store'], ['/admin/ranks', 'Ranks'], ['/admin/ads', 'Ads'], ['/admin/withdrawals', 'Payouts'], ['/admin/suggestions', 'Suggestions']].map(([h, l]) => `<a href="${h}" ${h === cur ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;
const page = (ctx, title, active, body, extra = {}) => appPage({ user: ctx.user, title, active, body: tabs(extra.tab || active) + body, unread: ctx.unread, ...extra });

// ── overview + settings ─────────────────────────────────────────────────────
export function adminHome(ctx) {
  const { stats: s, settings: st, audit } = ctx;
  const k = key => (Number(st[key] || 0) / 100);
  const body = `<h1 class="h1">Super admin</h1>
<div class="grid g2 g4">
  ${[['Players', s.players], ['Nepo babies', s.nepo], ['Sponsors', s.sponsors], ['Live pools', s.live], ['Wallet money held', naira(s.wallets)], ['Winnings owed', naira(s.winnings)], ['Payouts waiting', s.pendingW], ['Ads waiting', s.pendingAds]].map(([a, b]) => `<div class="panel stat"><span class="k">${a}</span><span class="v">${typeof b === 'number' ? b.toLocaleString('en-NG') : b}</span></div>`).join('')}
</div>
<div class="grid g2 g4" style="margin-top:12px">
  <a class="tcard card" href="/pools/new" style="text-decoration:none"><h3>Create pool</h3><p>Free, paid or sponsored</p></a>
  <a class="tcard card tcard--orange" href="/admin/ads" style="text-decoration:none"><h3>Ads</h3><p>Create and approve</p></a>
  <a class="tcard card tcard--gold" href="/admin/store" style="text-decoration:none"><h3>Skins & boosters</h3><p>Lapo/Nepo availability</p></a>
  <a class="tcard card tcard--mustard" href="/admin/ranks" style="text-decoration:none"><h3>Ranks</h3><p>Names and unlocks</p></a>
</div>
<h2 class="h2">Settings</h2><div class="panel">${form('/api/admin/settings', `
  ${check({ name: 'landing_demo_pools', label: 'Show demo sponsored pools on the home page (turn off once real pools exist)', checked: st.landing_demo_pools !== '0' })}
  <div class="two">${field({ label: 'Nepo monthly (₦)', name: 'nepo_monthly_kobo', type: 'number', value: k('nepo_monthly_kobo'), attrs: 'min="0"' })}${field({ label: 'Nepo yearly (₦)', name: 'nepo_yearly_kobo', type: 'number', value: k('nepo_yearly_kobo'), attrs: 'min="0"' })}</div>
  <div class="two">${field({ label: 'Lapo min withdrawal (₦)', name: 'min_withdraw_lapo_kobo', type: 'number', value: k('min_withdraw_lapo_kobo'), attrs: 'min="0"' })}${field({ label: 'Nepo min withdrawal (₦)', name: 'min_withdraw_nepo_kobo', type: 'number', value: k('min_withdraw_nepo_kobo'), attrs: 'min="0"' })}</div>
  <div class="two">${field({ label: 'Starter boosters (new players)', name: 'starter_boosters', type: 'number', value: st.starter_boosters || 0, attrs: 'min="0"' })}${field({ label: 'Bonus boosters on Nepo upgrade', name: 'nepo_bonus_boosters', type: 'number', value: st.nepo_bonus_boosters || 0, attrs: 'min="0"' })}</div>
  <div class="two">${field({ label: 'Sign-ups per referral booster', name: 'referral_batch', type: 'number', value: st.referral_batch || 10, attrs: 'min="1"' })}${field({ label: 'Max pools at once (Nepo)', name: 'max_multi_pools', type: 'number', value: st.max_multi_pools || 10, attrs: 'min="1" max="20"' })}</div>
  <div class="two">${field({ label: 'Voice: minimum rank', name: 'voice_min_rank', type: 'number', value: st.voice_min_rank || 56, attrs: 'min="1"' })}${field({ label: 'Voice: top N in a game', name: 'voice_top_n', type: 'number', value: st.voice_top_n || 5, attrs: 'min="1"' })}</div>
  ${field({ label: 'House cut on paid pools (%)', name: 'house_cut_pct', type: 'number', value: st.house_cut_pct || 0, attrs: 'min="0" max="50"', hint: 'Taken from paid-pool prizes before payout. 0 = all entry fees go to winners.' })}`, { submit: 'Save settings' })}</div>
<h2 class="h2">Recent admin actions</h2>${audit.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>When</th><th>Action</th><th>Detail</th></tr></thead><tbody>${audit.map(a => `<tr><td>${lagos(a.created_at)}</td><td>${esc(a.action)}</td><td class="small" style="max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.detail || '')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Nothing yet.</div>'}`;
  return page(ctx, 'Admin', '/admin', body);
}

// ── users ───────────────────────────────────────────────────────────────────
const tierOf = u => (u.role === 'ADMIN' ? 'Super admin' : u.role === 'SPONSOR' ? 'Sponsor' : (u.tier === 'NEPO' && (!u.nepo_until || Date.parse(u.nepo_until) > Date.now())) ? 'Nepo baby' : 'Lapo baby');
export function adminUsers(ctx) {
  const { users, q } = ctx;
  const body = `<h1 class="h1">Users</h1>
<form class="row" method="get" action="/admin/users" style="gap:8px;margin-bottom:12px"><input class="ta-input" name="q" value="${esc(q)}" placeholder="Search nickname or email" aria-label="Search users"><button class="btn btn--sm" type="submit">Search</button></form>
<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nickname</th><th>Type</th><th>Status</th><th>Taps</th><th>Games</th><th>Wins</th><th>Rank</th><th>Wallet</th><th>Winnings</th><th>Joined</th></tr></thead><tbody>
${users.map(u => `<tr><td><a href="/admin/users/${esc(u.id)}">${esc(u.username)}</a><div class="small muted">${esc(u.email || '')}</div></td><td>${tierBadge(tierOf(u))}</td><td>${u.status === 'ACTIVE' ? 'Active' : '<span class="badge red">Suspended</span>'}</td><td>${Number(u.lifetime_taps).toLocaleString('en-NG')}</td><td>${u.games_played}</td><td>${u.wins}</td><td>${u.rank_level}</td><td>${naira(u.balance_kobo)}</td><td>${naira(u.winnings_kobo)}</td><td>${lagos(u.created_at, { hour: undefined, minute: undefined })}</td></tr>`).join('') || '<tr><td colspan="10">No users found.</td></tr>'}
</tbody></table></div>`;
  return page(ctx, 'Users', '/admin/users', body);
}

export function adminUser(ctx) {
  const { target: u, wallet, inv, items, entries, rankName } = ctx;
  const self = u.id === ctx.user.id;
  const body = `<h1 class="h1">${esc(u.username)}</h1>
<div class="row wrap" style="margin:-4px 2px 14px">${tierBadge(tierOf(u))}<span class="small muted">${esc(u.email || '')} · joined ${lagos(u.created_at)}</span></div>
<div class="grid g2 g4"><div class="panel stat"><span class="k">Lifetime taps</span><span class="v">${Number(u.lifetime_taps).toLocaleString('en-NG')}</span></div><div class="panel stat"><span class="k">Games / wins</span><span class="v">${u.games_played} / ${u.wins}</span></div><div class="panel stat"><span class="k">Wallet</span><span class="v">${naira(wallet.balance_kobo)}</span></div><div class="panel stat"><span class="k">Winnings</span><span class="v">${naira(wallet.winnings_kobo)}</span></div></div>
<p class="small muted">Rank ${u.rank_level}: ${esc(rankName)}${u.nepo_until ? ` · Nepo till ${lagos(u.nepo_until)}` : ''}${u.referral_count ? ` · ${u.referral_count} referrals` : ''}</p>
${self ? '' : `<div class="actions">${u.status === 'ACTIVE' ? postBtn(`/api/admin/users/${u.id}/status`, 'Suspend', { body: { status: 'SUSPENDED' }, confirm: `Suspend ${u.username}? They will be logged out.`, cls: 'btn--danger btn--sm' }) : postBtn(`/api/admin/users/${u.id}/status`, 'Re-activate', { body: { status: 'ACTIVE' }, cls: 'btn--sm' })}
${u.role === 'USER' ? postBtn(`/api/admin/users/${u.id}/tier`, 'Give Nepo (1 month)', { body: { tier: 'NEPO', plan: 'month' } }) + postBtn(`/api/admin/users/${u.id}/tier`, 'Give Nepo (1 year)', { body: { tier: 'NEPO', plan: 'year' } }) + postBtn(`/api/admin/users/${u.id}/tier`, 'Make Lapo', { body: { tier: 'LAPO' }, confirm: 'Remove Nepo from this player?' }) : ''}</div>`}
<div class="grid g2m" style="margin-top:14px">
  <div class="panel"><h2 class="h2" style="margin-top:0">Gift</h2>${form(`/api/admin/users/${u.id}/gift`, `
    ${select({ label: 'Booster or skin', name: 'item', options: items.map(i => [i.id, `${i.name} (${i.kind.toLowerCase()}${i.audience !== 'ALL' ? ', ' + i.audience.toLowerCase() : ''})`]) })}
    ${field({ label: 'How many', name: 'qty', type: 'number', value: '1', attrs: 'min="1" max="1000"' })}`, { submit: 'Send gift', ok: 'reload' })}</div>
  <div class="panel"><h2 class="h2" style="margin-top:0">Adjust money</h2>${form(`/api/admin/users/${u.id}/wallet`, `
    <div class="two">${field({ label: 'Amount (₦, minus to take)', name: 'amount', type: 'number', attrs: 'step="0.01"' })}${select({ label: 'Balance', name: 'balance', options: [['WALLET', 'Wallet'], ['WINNINGS', 'Winnings']] })}</div>
    ${field({ label: 'Reason', name: 'note', attrs: 'maxlength="120" required' })}`, { submit: 'Adjust', ok: 'reload' })}</div>
</div>
<h2 class="h2">Bag</h2>${inv.length ? `<div class="list">${inv.map(i => `<div class="item"><div class="grow"><div class="t" style="font-size:16px">${esc(i.name)}</div><div class="s">${esc(i.kind.toLowerCase())}</div></div><b class="amt">×${i.quantity}</b></div>`).join('')}</div>` : '<div class="empty">Empty bag.</div>'}
<h2 class="h2">Recent games</h2>${entries.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pool</th><th>Taps</th><th>Score</th><th>Position</th><th>Paid</th><th>Won</th></tr></thead><tbody>${entries.map(e => `<tr><td><a href="/pool/${esc(e.pool_id)}">${esc(e.name)}</a></td><td>${Number(e.raw_taps).toLocaleString('en-NG')}</td><td>${Number(e.taps).toLocaleString('en-NG')}</td><td>${e.final_rank ? '#' + e.final_rank : '—'}</td><td>${e.paid_kobo ? naira(e.paid_kobo) : '—'}</td><td>${e.prize_kobo ? naira(e.prize_kobo) : '—'}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No games yet.</div>'}
${self ? '' : `<h2 class="h2">Remove account</h2><div class="panel" style="box-shadow:inset 0 0 0 2px var(--danger)">${form(`/api/admin/users/${u.id}/delete`, `<p class="muted" style="margin:0">This deletes the account, wallet, bag and game history. It can’t be undone.</p>${field({ label: `Type ${esc(u.username)} to confirm`, name: 'confirm', attrs: 'autocomplete="off" autocapitalize="none"' })}`, { submit: 'Delete account', cls: 'danger-form' })}</div>`}`;
  return page(ctx, u.username, '/admin/users', body, { css: '.danger-form .btn{background:var(--danger);box-shadow:0 4px 0 #a33b2b;color:#1a0400}' });
}

// ── pools ───────────────────────────────────────────────────────────────────
export function adminPools(ctx) {
  const { pools, scope } = ctx;
  const body = `<h1 class="h1">Pools</h1>
<div class="row wrap" style="margin-bottom:12px"><nav class="tabs" style="padding:0">${[['live', 'Live & upcoming'], ['ended', 'Ended'], ['all', 'All']].map(([k, l]) => `<a href="/admin/pools?scope=${k}" ${k === scope ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav><a class="btn btn--sm" href="/pools/new">+ Create pool</a></div>
<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pool</th><th>Type</th><th>State</th><th>Players</th><th>Prize</th><th>Entry</th><th>Ends</th><th></th></tr></thead><tbody>
${pools.map(p => `<tr><td><a href="/pool/${esc(p.id)}">${esc(p.name)}</a><div class="small muted">${esc(p.code)}${p.creator ? ' · by ' + esc(p.creator) : ''}</div></td><td>${p.kind.toLowerCase()}${p.audience !== 'ALL' ? ' · ' + p.audience.toLowerCase() : ''}${p.private ? ' · private' : ''}</td><td>${stateBadge(p.state)}${p.settled ? ' <span class="small muted">paid</span>' : ''}</td><td>${Number(p.players).toLocaleString('en-NG')}</td><td>${naira(p.prize)}</td><td>${p.entryFee ? naira(p.entryFee) : 'Free'}</td><td>${lagos(p.endsAt)}</td>
<td style="white-space:nowrap">${p.state === 'ended' && !p.settled ? postBtn(`/api/admin/pools/${p.id}/settle`, 'Pay out', { cls: 'btn--sm' }) : ''}${!p.settled && p.state !== 'cancelled' ? postBtn(`/api/admin/pools/${p.id}/cancel`, 'Cancel', { confirm: `Cancel “${p.name}” and refund every entry fee?`, cls: 'btn--danger btn--sm' }) : ''}</td></tr>`).join('') || '<tr><td colspan="8">No pools.</td></tr>'}
</tbody></table></div>`;
  return page(ctx, 'Pools', '/admin/pools', body, { script: 'document.querySelectorAll("[data-post]").forEach(function(b){b.setAttribute("data-ok","reload")})' });
}

// ── store items (skins, shapes, boosters) ───────────────────────────────────
export function adminStore(ctx) {
  const { items, edit } = ctx;
  const e = edit || {}, cfg = edit ? JSON.parse(edit.config || '{}') : {};
  const kind = e.kind || 'SKIN';
  const body = `<h1 class="h1">Store</h1><p class="sub">Create skins, shapes and boosters. Choose who fits buy them and the rank needed.</p>
<div class="panel">${form('/api/admin/items', `
  ${edit ? `<input type="hidden" name="id" value="${esc(e.id)}"><p class="small muted" style="margin:0">Editing <b>${esc(e.name)}</b> · <a href="/admin/store" style="color:var(--neon)">new item instead</a></p>` : ''}
  ${choice({ label: 'Kind', name: 'kind', options: [['SKIN', 'Skin'], ['SHAPE', 'Shape'], ['BOOSTER', 'Booster']], value: kind })}
  <div class="two">${field({ label: 'Name', name: 'name', value: e.name || '', attrs: 'maxlength="40" required' })}${field({ label: 'Price (₦, 0 = free)', name: 'price', type: 'number', value: e.price_kobo !== undefined ? e.price_kobo / 100 : 0, attrs: 'min="0"' })}</div>
  ${field({ label: 'Description', name: 'description', value: e.description || '', attrs: 'maxlength="140"' })}
  ${choice({ label: 'Who fit get am', name: 'audience', options: [['ALL', 'Everybody'], ['LAPO', 'Lapo only'], ['NEPO', 'Nepo only']], value: e.audience || 'ALL' })}
  <div class="two">${field({ label: 'Minimum rank', name: 'min_rank', type: 'number', value: e.min_rank || 1, attrs: 'min="1"' })}<div class="ta-field"><label class="ta-label" for="ic">Colour</label><input class="color-in" id="ic" type="color" name="bg" value="${esc(cfg.bg || cfg.color || '#1c5a33')}"></div></div>
  <fieldset class="panel" style="margin:0;border:0;display:grid;gap:12px"><legend class="ta-label">Skin options</legend>
    ${select({ label: 'Art', name: 'art', options: [['none', 'No art'], ['boy', 'Boy'], ['girl', 'Girl'], ['star', 'Star'], ['bolt', 'Lightning']], value: cfg.art || 'none' })}
    ${upload({ label: 'Or a picture', name: 'image', value: cfg.image || '' })}
    ${check({ name: 'kente', label: 'Kente pattern', checked: cfg.pattern === 'kente' })}${check({ name: 'glow', label: 'Neon glow', checked: !!cfg.glow })}</fieldset>
  ${select({ label: 'Shape (shape items)', name: 'shape', options: [['rounded', 'Rounded'], ['circle', 'Circle'], ['hex', 'Hexagon'], ['blob', 'Blob'], ['rect', 'Square']], value: cfg.shape || 'rounded' })}
  <div class="two">${field({ label: 'Booster multiplier', name: 'multiplier', type: 'number', value: e.multiplier || 2, attrs: 'min="1.1" max="10" step="0.1"' })}${field({ label: 'Booster seconds', name: 'duration', type: 'number', value: e.duration_seconds || 20, attrs: 'min="5" max="120"' })}</div>
  ${check({ name: 'giftable', label: 'Can be gifted', checked: e.giftable !== 0 })}${check({ name: 'active', label: 'On sale', checked: e.active !== 0 })}`, { submit: edit ? 'Save changes' : 'Create item' })}</div>
<h2 class="h2">All items</h2><div class="grid g3">${items.map(i => { const c = JSON.parse(i.config || '{}'); return `<div class="panel">${i.kind === 'SKIN' ? skinPreview(c) : i.kind === 'BOOSTER' ? `<div class="segbox"><span class="seg" data-seg="${String(i.multiplier).replace(/\.0$/, '')}" style="font-size:28px"></span><span class="seglabel">× ${i.duration_seconds}s</span></div>` : `<div class="tcard skin-prev" style="border-radius:${c.shape === 'circle' ? '50%' : c.shape === 'rect' ? '18px' : '40px'}"><span>${esc(c.shape || '')}</span></div>`}
  <div class="row" style="margin-top:10px"><b style="font:800 20px var(--display);text-transform:uppercase">${esc(i.name)}</b><a class="btn btn--ghost btn--sm" href="/admin/store?edit=${encodeURIComponent(i.id)}">Edit</a></div>
  <p class="small muted" style="margin:4px 0 0">${i.price_kobo ? naira(i.price_kobo) : 'Free'} · ${i.audience === 'ALL' ? 'Everybody' : i.audience === 'NEPO' ? 'Nepo only' : 'Lapo only'}${i.min_rank > 1 ? ` · rank ${i.min_rank}+` : ''}${i.active ? '' : ' · <b>off sale</b>'} · ${Number(i.owners || 0)} own</p></div>`; }).join('')}</div>`;
  return page(ctx, 'Store', '/admin/store', body, { css: SKIN_CSS });
}

// ── ranks ───────────────────────────────────────────────────────────────────
export function adminRanks(ctx) {
  const { ranks, edit } = ctx;
  const e = edit || { level: (ranks[ranks.length - 1]?.level || 0) + 1 };
  const body = `<h1 class="h1">Ranks</h1><p class="sub">${ranks.length} ranks. Players move up when they meet every requirement. Unlock keys: a store item id (e.g. skin-neon) or <b>voice</b>.</p>
<div class="panel">${form('/api/admin/ranks', `
  <div class="two">${field({ label: 'Level', name: 'level', type: 'number', value: e.level, attrs: 'min="1"' })}${field({ label: 'Name', name: 'name', value: e.name || '', attrs: 'maxlength="40" required' })}</div>
  <div class="two">${field({ label: 'Lifetime taps needed', name: 'min_taps', type: 'number', value: e.min_taps || 0, attrs: 'min="0"' })}${field({ label: 'Games needed', name: 'min_games', type: 'number', value: e.min_games || 0, attrs: 'min="0"' })}</div>
  <div class="two">${field({ label: 'Wins needed', name: 'min_wins', type: 'number', value: e.min_wins || 0, attrs: 'min="0"' })}<div class="ta-field"><label class="ta-label" for="rc">Colour</label><input class="color-in" id="rc" type="color" name="color" value="${esc(e.color || '#00ff6e')}"></div></div>
  ${field({ label: 'Unlocks (comma separated)', name: 'unlocks', value: e.unlocks || '', placeholder: 'skin-neon,voice' })}`, { submit: edit ? `Save rank ${e.level}` : 'Add rank' })}
<div class="actions">${postBtn('/api/admin/ranks/recalc', 'Recalculate all players')}</div></div>
<div class="tbl-wrap" style="margin-top:14px"><table class="tbl"><thead><tr><th>Lvl</th><th>Name</th><th>Taps</th><th>Games</th><th>Wins</th><th>Unlocks</th><th>Players</th><th></th></tr></thead><tbody>
${ranks.map(r => `<tr><td><b>${r.level}</b></td><td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${esc(r.color)};margin-right:6px"></span>${esc(r.name)}</td><td>${Number(r.min_taps).toLocaleString('en-NG')}</td><td>${r.min_games}</td><td>${r.min_wins}</td><td class="small">${esc(r.unlocks)}</td><td>${r.players || 0}</td><td><a href="/admin/ranks?edit=${r.level}">Edit</a></td></tr>`).join('')}
</tbody></table></div>
<h2 class="h2">Reset</h2><div class="panel">${form('/api/admin/ranks/reset', `<p class="muted" style="margin:0">Puts back the default 100 ranks. Your edits will be lost.</p>${field({ label: 'Type RESET to confirm', name: 'confirm', attrs: 'autocomplete="off"' })}`, { submit: 'Reset ranks', cls: 'danger-form' })}</div>`;
  return page(ctx, 'Ranks', '/admin/ranks', body, { tab: '/admin/ranks', css: '.danger-form .btn{background:var(--danger);box-shadow:0 4px 0 #a33b2b;color:#1a0400}' });
}

// ── ads ─────────────────────────────────────────────────────────────────────
export function adminAds(ctx) {
  const { ads, pools } = ctx;
  const waiting = ads.filter(a => !a.approved);
  const body = `<h1 class="h1">Ads</h1>
${waiting.length ? `<h2 class="h2" style="margin-top:0">Waiting approval (${waiting.length})</h2>${adList(waiting, { admin: true })}` : ''}
<h2 class="h2">Create a Tap Am ad</h2><div class="panel">${adForm(pools)}</div>
<h2 class="h2">All ads</h2>${adList(ads.filter(a => a.approved), { admin: true })}`;
  return page(ctx, 'Ads', '/admin/ads', body, { tab: '/admin/ads', css: AD_CSS, script: AD_JS });
}

// ── withdrawals ─────────────────────────────────────────────────────────────
export function adminWithdrawals(ctx) {
  const { rows, paystack } = ctx;
  const pending = rows.filter(w => w.status === 'PENDING' || w.status === 'PROCESSING');
  const done = rows.filter(w => !pending.includes(w));
  const row = w => `<tr><td><a href="/admin/users/${esc(w.user_id)}">${esc(w.username)}</a></td><td><b>${naira(w.amount_kobo)}</b></td><td>${esc(w.bank_name || w.bank_code)}<div class="small muted">${esc(w.account_number)} · ${esc(w.account_name || '')}</div></td><td>${lagos(w.created_at)}</td><td><span class="badge ${w.status === 'PAID' ? 'live' : w.status === 'REJECTED' || w.status === 'FAILED' ? 'red' : 'soon'}">${w.status.toLowerCase()}</span>${w.admin_note ? `<div class="small muted">${esc(w.admin_note)}</div>` : ''}</td>
  <td style="white-space:nowrap">${w.status === 'PENDING' ? `${paystack ? postBtn(`/api/admin/withdrawals/${w.id}/transfer`, 'Send via Paystack', { cls: 'btn--sm', confirm: `Send ${naira(w.amount_kobo)} to ${w.account_name || w.account_number} now?` }) : ''}${postBtn(`/api/admin/withdrawals/${w.id}/paid`, 'Mark paid', { confirm: 'Only mark paid if you sent the money yourself. Continue?' })}${postBtn(`/api/admin/withdrawals/${w.id}/reject`, 'Reject + refund', { cls: 'btn--danger btn--sm', confirm: 'Reject and put the money back in their winnings?' })}` : ''}</td></tr>`;
  const table = list => `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Player</th><th>Amount</th><th>Bank</th><th>Asked</th><th>Status</th><th></th></tr></thead><tbody>${list.map(row).join('') || '<tr><td colspan="6">Nothing here.</td></tr>'}</tbody></table></div>`;
  const body = `<h1 class="h1">Payouts</h1>${paystack ? '' : '<p class="sub">Paystack is not connected, so pay manually and then press “Mark paid”.</p>'}
<h2 class="h2" style="margin-top:0">Waiting (${pending.length})</h2>${table(pending)}<h2 class="h2">Done</h2>${table(done)}`;
  return page(ctx, 'Payouts', '/admin/withdrawals', body, { script: 'document.querySelectorAll("[data-post]").forEach(function(b){b.setAttribute("data-ok","reload")})' });
}

export function adminSuggestions(ctx) {
  const { rows } = ctx;
  const body = `<h1 class="h1">Suggestions</h1>${rows.length ? `<div class="list">${rows.map(s => `<div class="item"><div class="grow"><div style="white-space:pre-wrap">${esc(s.message)}</div><div class="s">${esc(s.name || 'Anonymous')}${s.email ? ' · ' + esc(s.email) : ''} · ${lagos(s.created_at)}</div></div></div>`).join('')}</div>` : '<div class="empty">No suggestions yet.</div>'}`;
  return page(ctx, 'Suggestions', '/admin', body, { tab: '/admin/suggestions' });
}

// ── first-time setup (needs ADMIN_SETUP_KEY) ────────────────────────────────
export function setupPage() {
  const body = `<main class="ta-auth" style="min-height:100vh;display:grid;place-items:center;padding:20px"><div class="tcard tcard--ink" style="width:100%;max-width:440px;padding:26px 22px">
<h1 style="margin:0 0 6px;font:800 34px/1 var(--display);text-transform:uppercase">Set up super admin</h1><p style="margin:0 0 16px;color:var(--muted)">One time only. You need the setup key from the server settings.</p>
<form class="form" data-api="/api/setup-admin" novalidate style="display:grid;gap:12px">
${['setupKey:Setup key:password', 'username:Nickname:text', 'email:Email:email', 'password:Password (10+ characters):password'].map(x => { const [n, l, t] = x.split(':'); return `<div class="ta-field"><label class="ta-label" for="s-${n}">${l}</label><input class="ta-input" id="s-${n}" name="${n}" type="${t}" required autocomplete="${n === 'password' ? 'new-password' : 'off'}"><p class="ta-error" data-err="${n}"></p></div>`; }).join('')}
<div class="ta-msg" role="alert"></div><button class="btn btn--block" type="submit">Create admin</button></form></div></main>`;
  return themeShell({ title: 'Admin setup', body, css: '.form{display:grid;gap:12px}' });
}

// ── suggest (public) ────────────────────────────────────────────────────────
export function suggestPage(user) {
  const body = `<main style="min-height:100vh;display:grid;place-items:center;padding:20px"><div class="tcard" style="width:100%;max-width:520px;padding:26px 22px">
<a href="/" style="color:#fff">← Home</a>
<h1 style="margin:10px 0 6px;font:800 36px/1 var(--display);text-transform:uppercase">Suggest something</h1><p style="margin:0 0 16px">Wetin we fit add or fix? We dey read everything.</p>
<form class="form" data-api="/api/suggestions" data-reset novalidate style="display:grid;gap:12px">
<div class="ta-field"><label class="ta-label" for="g-name">Name (optional)</label><input class="ta-input" id="g-name" name="name" maxlength="60" value="${esc(user?.username || '')}"></div>
<div class="ta-field"><label class="ta-label" for="g-msg">Your suggestion</label><textarea class="ta-input" id="g-msg" name="message" maxlength="2000" required style="height:auto;min-height:130px;padding:10px 13px"></textarea><p class="ta-error" data-err="message"></p></div>
<div class="ta-msg" role="alert"></div><button class="btn btn--block" type="submit">Send</button></form></div></main>`;
  return themeShell({ title: 'Suggest', body });
}

// ── separate admin login (/admin/login) ─────────────────────────────────────
export function adminLoginPage() {
  const body = `<main style="min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:20px">
<div style="width:100%;max-width:420px">
  <div style="text-align:center;margin-bottom:18px"><img src="/assets/logo-tapam.svg" width="150" height="40" alt="tap am"></div>
  <div class="tcard tcard--ink" style="padding:26px 22px 22px">
    <span style="display:inline-block;padding:4px 9px;border-radius:7px;background:var(--danger);color:#1a0400;font:800 13px/1 var(--display);text-transform:uppercase;letter-spacing:.3px">Super admin</span>
    <h1 style="margin:12px 0 6px;font:800 34px/1 var(--display);text-transform:uppercase">Admin login</h1>
    <p style="margin:0 0 16px;color:var(--muted)">For the Tap Am super admin only. Players and sponsors log in <a href="/login" style="color:var(--neon)">here</a>.</p>
    <form class="form" data-api="/api/admin/login" novalidate>
      <div class="ta-field"><label class="ta-label" for="a-id">Nickname or email</label><input class="ta-input" id="a-id" name="identifier" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="254" required><p class="ta-error" data-err="identifier"></p></div>
      <div class="ta-field"><label class="ta-label" for="a-pw">Password</label><input class="ta-input" id="a-pw" name="password" type="password" autocomplete="current-password" maxlength="128" required><p class="ta-error" data-err="password"></p></div>
      <div class="ta-msg" role="alert"></div>
      <button class="btn btn--block" type="submit">Enter admin</button>
    </form>
  </div>
  <p style="text-align:center;margin-top:14px"><a href="/" style="color:var(--muted)">← Back to Tap Am</a></p>
</div></main>`;
  return themeShell({ title: 'Admin login', body, css: '.form{display:grid;gap:12px}' });
}
