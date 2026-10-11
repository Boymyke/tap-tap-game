// Super admin pages.
import { appPage, esc, naira, nairaShort, short, lagos, field, moneyField, select, choice, check, form, postBtn, upload, stateBadge, tierBadge, pager, nameTag } from './kit.js';
import { PATTERNS } from './patterns.js';
import { themeShell, LOGO_IMG } from './theme.js';
import { skinPreview } from './skins.js';
import { adForm, adList, AD_CSS, AD_JS } from './sponsor.js';
import { backgroundCss, tierName, tierOf } from '../tiers.js';

const TABS = [['/admin', 'Overview'], ['/admin/health', 'Health'], ['/admin/users', 'Users'], ['/admin/gifts', 'Gifts'], ['/admin/pools', 'Pools'], ['/admin/store', 'Store'], ['/admin/ranks', 'Ranks'], ['/admin/ads', 'Ads'], ['/admin/slides', 'Home slides'], ['/admin/badges', 'Badges'], ['/admin/codes', 'Promo codes'], ['/admin/merch', 'Merch'], ['/admin/backgrounds', 'Backgrounds'], ['/admin/withdrawals', 'Payouts'], ['/admin/suggestions', 'Suggestions']];
const tabs = cur => `<nav class="tabs" aria-label="Admin sections">${TABS.map(([h, l]) => `<a href="${h}" ${h === cur ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;
const page = (ctx, title, active, body, extra = {}) => appPage({ user: ctx.user, title, active: TABS.some(t => t[0] === active) && ['/admin', '/admin/users', '/admin/pools', '/admin/ads', '/admin/health'].includes(active) ? active : '', body: tabs(extra.tab || active) + body, ...extra });
const ADMIN_CSS = `.danger-form .btn{background:var(--danger);box-shadow:0 4px 0 var(--danger-d);color:#fff}
.sgrp{display:grid;gap:14px;padding:14px;border-radius:var(--r-sm);background:var(--cloud)}
.rejform{display:flex;gap:6px;flex-wrap:wrap;align-items:flex-start;margin-top:6px}
.rejform .ta-field{flex:1;min-width:160px;margin:0}.rejform .ta-input{height:40px}
.sgrp h3{margin:0;font:900 17px var(--display)}
.sgrp .ta-input{background:#fff}
.hl{display:grid;gap:10px}
.hl .item{align-items:flex-start}
.lvl{flex:none;width:12px;height:12px;margin-top:5px;border-radius:50%}
.lvl.ok{background:#0A9B4A}.lvl.warn{background:#E0A800}.lvl.crit{background:var(--danger)}
.meter{height:12px;border-radius:999px;background:var(--cloud);overflow:hidden}.meter i{display:block;height:100%;border-radius:999px;background:var(--purple)}`;

// ── overview + settings ─────────────────────────────────────────────────────
export function adminHome(ctx) {
  const { stats: s, settings: st, audit } = ctx;
  const k = key => (Number(st[key] || 0) / 100);
  const v = (key, d) => st[key] ?? d;
  const body = `<h1 class="h1">Super admin</h1>
<div class="grid g2 g4">
  ${[['Players', s.players, 'c-sky'], ['Mapo babies', s.mapo, 'c-teal'], ['Nepo babies', s.nepo, 'c-pink'], ['Sponsors', s.sponsors, 'c-orange'], ['Live pools', s.live, 'c-purple'], ['Wallet money held', nairaShort(s.wallets), 'c-sky'], ['Winnings owed', nairaShort(s.winnings), 'c-green'], ['Payouts waiting', s.pendingW, 'c-sunny'], ['Ads waiting', s.pendingAds, 'c-pink'], ['Home slot requests', s.pendingSlides, 'c-orange'], ['Pool suggestions', s.poolIdeas, 'c-teal'], ['Taps today', short(s.tapsToday), 'c-purple']]
    .map(([a, b, c]) => `<div class="tcard card ${c}" style="padding:14px"><div class="stat"><span class="k">${a}</span><span class="v">${typeof b === 'number' ? short(b) : esc(b)}</span></div></div>`).join('')}
</div>
<div class="grid g2 g4" style="margin-top:12px">
  <a class="btn btn--green btn--block" href="/pools/new">+ Create pool</a><a class="btn btn--white btn--block" href="/admin/gifts">Bulk gift</a><a class="btn btn--white btn--block" href="/admin/ads">Ads</a><a class="btn btn--white btn--block" href="/admin/health">System health</a>
</div>
<h2 class="h2">Server overload</h2><div class="panel" style="${st.overload === '1' ? 'box-shadow:0 0 0 3px var(--danger),var(--sh)' : ''}">
  <p class="muted" style="margin:0 0 10px">${st.overload === '1' ? '<b style="color:var(--danger)">Games are paused.</b> Players see a notice on their home page. Restart when the servers are fine.' : 'If the servers are struggling, pause every live and upcoming pool. Players get back the money and boosters they put into those pools, and a message. Restart them when things are fine.'}</p>
  ${st.overload === '1' ? form('/api/admin/overload/restart-all', `${field({ label: 'Start the pools again in (minutes)', name: 'minutes', type: 'number', value: '10', attrs: 'min="1" max="1440"' })}`, { submit: 'Restart all paused pools' })
    : form('/api/admin/overload/pause-all', `${check({ name: 'confirm', label: 'Yes, pause every live and upcoming pool and refund the players' })}`, { submit: 'Pause all games', btn: 'btn--danger' })}
</div>
<h2 class="h2">Settings</h2><div class="panel">${form('/api/admin/settings', `
  <div class="sgrp"><h3>Plans (₦)</h3>
    <div class="two">${moneyField({ label: 'Mapo monthly', name: 'mapo_monthly_kobo', value: k('mapo_monthly_kobo') })}${moneyField({ label: 'Mapo yearly', name: 'mapo_yearly_kobo', value: k('mapo_yearly_kobo') })}</div>
    <div class="two">${moneyField({ label: 'Nepo monthly', name: 'nepo_monthly_kobo', value: k('nepo_monthly_kobo') })}${moneyField({ label: 'Nepo yearly', name: 'nepo_yearly_kobo', value: k('nepo_yearly_kobo') })}</div>
    <div class="two">${field({ label: 'Mapo bonus boosters', name: 'mapo_bonus_boosters', type: 'number', value: v('mapo_bonus_boosters', 3), attrs: 'min="0"' })}${field({ label: 'Nepo bonus boosters', name: 'nepo_bonus_boosters', type: 'number', value: v('nepo_bonus_boosters', 5), attrs: 'min="0"' })}</div></div>
  <div class="sgrp"><h3>Tapping</h3>
    <div class="two">${field({ label: 'Lapo max taps/sec', name: 'tap_rate_lapo', type: 'number', value: v('tap_rate_lapo', 15), attrs: 'min="5" max="60"' })}${field({ label: 'Mapo max taps/sec', name: 'tap_rate_mapo', type: 'number', value: v('tap_rate_mapo', 25), attrs: 'min="5" max="60"' })}</div>
    <div class="two">${field({ label: 'Nepo max taps/sec', name: 'tap_rate_nepo', type: 'number', value: v('tap_rate_nepo', 40), attrs: 'min="5" max="60"' })}${field({ label: 'Pools at once (Mapo)', name: 'max_multi_pools_mapo', type: 'number', value: v('max_multi_pools_mapo', 3), attrs: 'min="1" max="20"' })}</div>
    ${field({ label: 'Pools at once (Nepo)', name: 'max_multi_pools', type: 'number', value: v('max_multi_pools', 10), attrs: 'min="1" max="20"' })}
    ${check({ name: 'tap_limits_on', label: '<b>Daily / monthly tap limits</b> (off = no limits)', checked: st.tap_limits_on === '1' })}
    <div class="two">${moneyField({ label: 'Taps per day', name: 'tap_limit_daily', value: v('tap_limit_daily', 20000) })}${moneyField({ label: 'Taps per month', name: 'tap_limit_monthly', value: v('tap_limit_monthly', 400000) })}</div></div>
  <div class="sgrp"><h3>Money</h3>
    <div class="two">${moneyField({ label: 'Lapo min withdrawal', name: 'min_withdraw_lapo_kobo', value: k('min_withdraw_lapo_kobo') })}${moneyField({ label: 'Mapo min withdrawal', name: 'min_withdraw_mapo_kobo', value: k('min_withdraw_mapo_kobo') })}</div>
    <div class="two">${moneyField({ label: 'Nepo min withdrawal', name: 'min_withdraw_nepo_kobo', value: k('min_withdraw_nepo_kobo') })}${field({ label: 'Withdrawals per day', name: 'withdrawals_per_day', type: 'number', value: v('withdrawals_per_day', 1), attrs: 'min="1" max="5"' })}</div>
    <div class="two">${moneyField({ label: 'Sponsor email blast price', name: 'email_blast_kobo', value: k('email_blast_kobo') })}${moneyField({ label: 'Daily money a player can send', name: 'transfer_daily_max_kobo', value: k('transfer_daily_max_kobo') })}</div>
    <div class="two">${field({ label: 'Pools a Lapo baby can create a day', name: 'lapo_pools_per_day', type: 'number', value: v('lapo_pools_per_day', 3), attrs: 'min="0" max="50"' })}${field({ label: 'Free mystery box every (days, about)', name: 'free_box_days', type: 'number', value: v('free_box_days', 3), attrs: 'min="0" max="60"', hint: '0 = no free boxes.' })}</div>
    ${field({ label: 'House cut on paid pools (%)', name: 'house_cut_pct', type: 'number', value: v('house_cut_pct', 0), attrs: 'min="0" max="50"', hint: 'Taken from paid-pool prizes before payout. 0 = all entry fees go to winners.' })}
    ${check({ name: 'auto_payouts', label: '<b>Automatic payouts</b> through Paystack (small amounts, older accounts, no cheating flags)', checked: st.auto_payouts === '1' })}
    <div class="two">${moneyField({ label: 'Auto-pay up to (₦)', name: 'auto_payout_max_kobo', value: k('auto_payout_max_kobo') })}${field({ label: 'Account at least (days old)', name: 'auto_payout_min_age_days', type: 'number', value: v('auto_payout_min_age_days', 7), attrs: 'min="0"' })}</div></div>
  <div class="sgrp"><h3>Players and site</h3>
    <div class="two">${field({ label: 'Starter boosters', name: 'starter_boosters', type: 'number', value: v('starter_boosters', 3), attrs: 'min="0"' })}${field({ label: 'Sign-ups per referral booster', name: 'referral_batch', type: 'number', value: v('referral_batch', 10), attrs: 'min="1"' })}</div>
    <div class="two">${field({ label: 'Voice: minimum rank', name: 'voice_min_rank', type: 'number', value: v('voice_min_rank', 56), attrs: 'min="1"' })}${field({ label: 'Voice: top N', name: 'voice_top_n', type: 'number', value: v('voice_top_n', 5), attrs: 'min="1"' })}</div>
    ${field({ label: 'Alert emails (comma separated)', name: 'alert_email', type: 'email', value: st.alert_email || '', placeholder: 'you@yourcompany.com', hint: 'System health alerts go here.' })}
    ${check({ name: 'landing_demo_pools', label: 'Show sample sponsored pools on the landing page (turn off once real sponsors are live)', checked: st.landing_demo_pools === '1' })}</div>`, { submit: 'Save settings' })}</div>
<h2 class="h2">Recent admin actions</h2>${audit.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>When</th><th>Action</th><th>Detail</th></tr></thead><tbody>${audit.map(a => `<tr><td>${esc(lagos(a.created_at))}</td><td>${esc(a.action)}</td><td class="small" style="max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.detail || '')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Nothing yet.</div>'}`;
  return page(ctx, 'Admin', '/admin', body, { css: ADMIN_CSS });
}

// ── system health ───────────────────────────────────────────────────────────
export function adminHealth(ctx) {
  const { checks, metrics, alerts, dbBytes, usage, settings: st } = ctx;
  const gb = n => (n / 1e9).toFixed(n > 1e9 ? 2 : 3) + ' GB';
  const body = `<h1 class="h1">System health</h1><p class="sub">Checked every 15 minutes. Problems are emailed to ${st.alert_email ? `<b style="color:#fff">${esc(st.alert_email)}</b>` : 'nobody yet — add an alert email in settings'}.</p>
<div class="panel"><div class="hl">${checks.map(c => `<div class="item" style="box-shadow:none;padding:8px 2px"><span class="lvl ${c.level}"></span><div class="grow"><div class="t" style="white-space:normal">${esc(c.title)}</div><div class="s" style="white-space:normal">${esc(c.detail)}</div>${c.action ? `<div class="small" style="margin-top:4px;font-weight:700;color:var(--ink)">Do this: ${esc(c.action)}</div>` : ''}</div></div>`).join('')}</div>
<div class="actions">${postBtn('/api/admin/health/test-email', 'Send a test alert email')}</div></div>
<h2 class="h2">Database</h2><div class="panel"><div class="row"><b>${gb(dbBytes)}</b><span class="small muted">of 10 GB (D1 limit per database)</span></div><div class="meter" style="margin-top:8px"><i style="width:${Math.min(100, dbBytes / 1e10 * 100).toFixed(1)}%"></i></div>
<p class="small muted" style="margin:10px 0 0">${usage.map(u => `${esc(u[0])}: <b>${short(u[1])}</b>`).join(' · ')}</p></div>
<h2 class="h2">Last 7 days</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Day</th><th>Taps</th><th>Games</th><th>Players in games</th><th>Prizes paid</th><th>Payments</th><th>Server errors</th></tr></thead><tbody>
${metrics.map(m => `<tr><td>${esc(m.day)}</td><td>${short(m.taps || 0)}</td><td>${short(m.games || 0)}</td><td>${short(m.players || 0)}</td><td>${esc(naira(m.prizes_kobo || 0))}</td><td>${esc(naira(m.payments_kobo || 0))}</td><td>${m.errors ? `<b style="color:var(--danger)">${m.errors}</b>` : 0}</td></tr>`).join('') || '<tr><td colspan="7">No data yet.</td></tr>'}</tbody></table></div>
<h2 class="h2">Alert history</h2>${alerts.length ? `<div class="list">${alerts.map(a => `<div class="item"><span class="lvl ${a.resolved_at ? 'ok' : a.level}"></span><div class="grow"><div class="t" style="white-space:normal;font-size:15px">${esc(a.message)}</div><div class="s">First ${esc(lagos(a.first_at))} · last ${esc(lagos(a.last_at))}${a.emailed_at ? ' · emailed' : ''}${a.resolved_at ? ' · resolved ' + esc(lagos(a.resolved_at)) : ''}</div></div></div>`).join('')}</div>` : '<div class="empty">No alerts. All good.</div>'}`;
  return page(ctx, 'System health', '/admin/health', body, { css: ADMIN_CSS });
}

// ── users ───────────────────────────────────────────────────────────────────
const roleLabel = u => (u.role === 'ADMIN' ? 'Super admin' : u.role === 'SPONSOR' ? 'Sponsor' : tierName(tierOf(u)));
export function adminUsers(ctx) {
  const { users, q, page: pg, hasNext } = ctx;
  const body = `<h1 class="h1">Users</h1>
<form class="row" method="get" action="/admin/users" style="gap:8px;margin-bottom:12px"><input class="ta-input" name="q" value="${esc(q)}" placeholder="Search nickname or email" aria-label="Search users"><button class="btn btn--green" type="submit">Search</button></form>
<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nickname</th><th>Type</th><th>Status</th><th>Taps</th><th>Games</th><th>Wins</th><th>Rank</th><th>Wallet</th><th>Winnings</th><th>Country</th><th>Joined</th></tr></thead><tbody>
${users.map(u => `<tr><td><a href="/admin/users/${esc(u.id)}">${esc(u.username)}</a><div class="small muted">${esc(u.email || '')}</div></td><td>${tierBadge(roleLabel(u))}</td><td>${u.status === 'ACTIVE' ? 'Active' : `<span class="badge red">${esc(u.status.toLowerCase())}</span>`}</td><td>${short(u.lifetime_taps)}</td><td>${u.games_played}</td><td>${u.wins}</td><td>${u.rank_level}</td><td>${esc(naira(u.balance_kobo))}</td><td>${esc(naira(u.winnings_kobo))}</td><td>${esc(u.country || '—')}</td><td>${esc(lagos(u.created_at, { hour: undefined, minute: undefined }))}</td></tr>`).join('') || '<tr><td colspan="11">No users found.</td></tr>'}
</tbody></table></div>${pager(`/admin/users${q ? '?q=' + encodeURIComponent(q) : ''}`, pg, hasNext)}`;
  return page(ctx, 'Users', '/admin/users', body);
}

export function adminUser(ctx) {
  const { target: u, wallet, inv, items, entries, rankName, profile, flags } = ctx;
  const self = u.id === ctx.user.id;
  const body = `<h1 class="h1">${nameTag(u.username, u.emoji)}</h1>
<div class="row wrap" style="margin:-4px 2px 14px;justify-content:flex-start;gap:8px">${tierBadge(roleLabel(u))}<span class="small" style="color:var(--muted)">${esc(u.email || '')} · ${esc(u.gender || '')} ${esc(u.country || '')} · joined ${esc(lagos(u.created_at))}${u.adult_confirmed_at ? ' · 18+ confirmed' : ''}</span></div>
<div class="grid g2 g4"><div class="panel stat"><span class="k">Lifetime taps</span><span class="v">${short(u.lifetime_taps)}</span></div><div class="panel stat"><span class="k">Games / wins</span><span class="v">${u.games_played} / ${u.wins}</span></div><div class="panel stat"><span class="k">Wallet</span><span class="v">${esc(naira(wallet.balance_kobo))}</span></div><div class="panel stat"><span class="k">Winnings</span><span class="v">${esc(naira(wallet.winnings_kobo))}</span></div></div>
<p class="small" style="color:var(--muted)">Rank ${u.rank_level}: ${esc(rankName)}${u.tier_until ? ` · ${esc(tierName(u.tier))} till ${esc(lagos(u.tier_until))}` : ''}${u.referral_count ? ` · ${u.referral_count} referrals` : ''}${u.status !== 'ACTIVE' ? ` · <b style="color:#fff">${esc(u.status)}</b>` : ''}</p>
${flags ? `<div class="panel" style="box-shadow:0 0 0 3px var(--sunny),var(--sh)"><b>${flags} anti-cheat flag${flags === 1 ? '' : 's'}</b> — taps faster than their tier allows were dropped in some games. Check before paying out.</div>` : ''}
${self ? '' : `<div class="actions">${u.status === 'ACTIVE' ? postBtn(`/api/admin/users/${u.id}/status`, 'Suspend', { body: { status: 'SUSPENDED' }, confirm: `Suspend ${u.username}? They will be logged out.`, cls: 'btn--danger btn--sm' }) : postBtn(`/api/admin/users/${u.id}/status`, 'Re-activate', { body: { status: 'ACTIVE' }, cls: 'btn--green btn--sm' })}
${u.role === 'USER' ? postBtn(`/api/admin/users/${u.id}/tier`, 'Give Mapo (1 month)', { body: { tier: 'MAPO', plan: 'month' } }) + postBtn(`/api/admin/users/${u.id}/tier`, 'Give Nepo (1 month)', { body: { tier: 'NEPO', plan: 'month' } }) + postBtn(`/api/admin/users/${u.id}/tier`, 'Give Nepo (1 year)', { body: { tier: 'NEPO', plan: 'year' } }) + postBtn(`/api/admin/users/${u.id}/tier`, 'Make Lapo', { body: { tier: 'LAPO' }, confirm: 'Remove the paid tier from this player?' }) : ''}
${u.role === 'SPONSOR' && profile ? postBtn(`/api/admin/sponsors/${u.id}/leads`, profile.lead_capture ? 'Turn lead capture OFF' : 'Turn lead capture ON', { body: { on: !profile.lead_capture }, cls: 'btn--gold btn--sm', confirm: profile.lead_capture ? 'Stop collecting leads for this sponsor?' : 'Let this sponsor collect player details (with consent) from their ads?' }) : ''}</div>`}
<div class="grid g2m" style="margin-top:14px">
  <div class="panel"><h2 class="h2" style="margin-top:0;color:var(--ink);text-shadow:none">Gift</h2>${form(`/api/admin/users/${u.id}/gift`, `
    ${select({ label: 'Booster or skin', name: 'item', options: items.map(i => [i.id, `${i.name} (${i.kind.toLowerCase()}${i.audience !== 'ALL' ? ', ' + i.audience.toLowerCase() : ''})`]) })}
    ${field({ label: 'How many', name: 'qty', type: 'number', value: '1', attrs: 'min="1" max="1000"' })}`, { submit: 'Send gift' })}</div>
  <div class="panel"><h2 class="h2" style="margin-top:0;color:var(--ink);text-shadow:none">Adjust money</h2>${form(`/api/admin/users/${u.id}/wallet`, `
    <div class="two">${field({ label: 'Amount (₦, minus to take)', name: 'amount', attrs: 'inputmode="decimal"' })}${select({ label: 'Balance', name: 'balance', options: [['WALLET', 'Wallet'], ['WINNINGS', 'Winnings']] })}</div>
    ${field({ label: 'Reason', name: 'note', attrs: 'maxlength="120" required' })}`, { submit: 'Adjust' })}</div>
</div>
${u.role === 'USER' ? `<h2 class="h2">Name emoji</h2><div class="panel">${form(`/api/admin/users/${u.id}/emoji`, `
  <p class="small muted" style="margin:0">One emoji shown next to ${esc(u.username)}’s name in games and boards. Only ${esc(u.username)} can tap it to see what it means.${u.emoji ? ` Now: <b style="font-size:20px">${esc(u.emoji)}</b> — ${esc(u.emoji_meaning || '')}` : ''}</p>
  <div class="two">${field({ label: 'Emoji (leave empty to remove)', name: 'emoji', value: u.emoji || '', placeholder: 'Paste one emoji', attrs: 'maxlength="16" autocomplete="off"' })}${field({ label: 'What it means', name: 'meaning', value: u.emoji_meaning || '', placeholder: 'Fastest finger of October', attrs: 'maxlength="140"' })}</div>`, { submit: 'Save emoji' })}</div>` : ''}
<h2 class="h2">Bag</h2>${inv.length ? `<div class="list">${inv.map(i => `<div class="item"><div class="grow"><div class="t" style="font-size:16px">${esc(i.name)}</div><div class="s">${esc(i.kind.toLowerCase())}</div></div><b class="amt">×${short(i.quantity)}</b></div>`).join('')}</div>` : '<div class="empty">Empty bag.</div>'}
<h2 class="h2">Recent games</h2>${entries.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pool</th><th>Taps</th><th>Score</th><th>Boosters</th><th>Position</th><th>Paid</th><th>Won</th></tr></thead><tbody>${entries.map(e => `<tr><td><a href="/pool/${esc(e.pool_id)}">${esc(e.name)}</a></td><td>${short(e.raw_taps)}</td><td>${short(e.taps)}</td><td>${e.boosters_used || 0}</td><td>${e.final_rank ? '#' + e.final_rank : '—'}</td><td>${e.paid_kobo ? esc(naira(e.paid_kobo)) : '—'}</td><td>${e.prize_kobo ? esc(naira(e.prize_kobo)) : '—'}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No games yet.</div>'}
${self ? '' : `<h2 class="h2">Remove account</h2><div class="panel" style="box-shadow:0 0 0 3px var(--danger)">${form(`/api/admin/users/${u.id}/delete`, `<p class="muted" style="margin:0">This deletes the account, wallet, bag and game history. It can’t be undone.</p>${field({ label: `Type ${esc(u.username)} to confirm`, name: 'confirm', attrs: 'autocomplete="off" autocapitalize="none"' })}`, { submit: 'Delete account', cls: 'danger-form' })}</div>`}`;
  return page(ctx, u.username, '/admin/users', body, { css: ADMIN_CSS });
}

// ── bulk gifting ────────────────────────────────────────────────────────────
export function adminGifts(ctx) {
  const { items, recent } = ctx;
  const body = `<h1 class="h1">Bulk gifting</h1><p class="sub">Send boosters or skins to everybody, a tier, or a list of nicknames. Players get a notification.</p>
<div class="panel">${form('/api/admin/gift-bulk', `
  ${select({ label: 'What to send', name: 'item', options: items.map(i => [i.id, `${i.name} (${i.kind.toLowerCase()}${i.audience !== 'ALL' ? ', ' + i.audience.toLowerCase() : ''})`]) })}
  ${field({ label: 'How many each', name: 'qty', type: 'number', value: '1', attrs: 'min="1" max="100"' })}
  ${choice({ label: 'Send to', name: 'to', options: [['ALL', 'Everybody'], ['LAPO', 'Lapo'], ['MAPO', 'Mapo'], ['NEPO', 'Nepo'], ['LIST', 'A list']], value: 'ALL' })}
  <div data-show="to=LIST"><div class="ta-field"><label class="ta-label" for="f-names">Nicknames (comma or new line)</label><textarea class="ta-input" id="f-names" name="names" placeholder="chioma, tunde, ada"></textarea><p class="ta-error" data-err="names"></p></div></div>
  ${field({ label: 'Message (optional)', name: 'note', placeholder: 'Happy Independence Day!', attrs: 'maxlength="120"' })}
  ${check({ name: 'confirm', label: 'Yes, send it now' })}`, { submit: 'Send gifts', shine: true })}</div>
<h2 class="h2">Recent bulk gifts</h2>${recent.length ? `<div class="list">${recent.map(a => { const d = JSON.parse(a.detail || '{}'); return `<div class="item"><div class="grow"><div class="t" style="font-size:15px">${esc(d.qty)}× ${esc(d.item)} to ${esc(d.to)} (${short(d.count)} players)</div><div class="s">${esc(lagos(a.created_at))}</div></div></div>`; }).join('')}</div>` : '<div class="empty">None yet.</div>'}`;
  return page(ctx, 'Bulk gifting', '/admin/gifts', body, { css: ADMIN_CSS });
}

// ── pools ───────────────────────────────────────────────────────────────────
export function adminPools(ctx) {
  const { pools, scope } = ctx;
  const body = `<div class="headrow"><h1 class="h1">Pools</h1><a class="btn btn--green btn--sm" href="/pools/new">+ Create pool</a></div>
<nav class="tabs">${[['live', 'Live & upcoming'], ['ended', 'Ended'], ['all', 'All']].map(([k, l]) => `<a href="/admin/pools?scope=${k}" ${k === scope ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pool</th><th>Type</th><th>State</th><th>Players</th><th>Prize</th><th>Entry</th><th>Ends</th><th></th></tr></thead><tbody>
${pools.map(p => `<tr><td><a href="/pool/${esc(p.id)}">${esc(p.name)}</a><div class="small muted">${esc(p.code)}${p.creator ? ' · by ' + esc(p.creator) : ''}</div></td><td>${esc(p.kind.toLowerCase())}${p.audience !== 'ALL' ? ' · ' + esc(p.audience.toLowerCase()) : ''}${p.private ? ' · private' : ''}${p.gameType === 'MATCH' ? ' · VS' : ''}${p.promoId ? ' · ad' : ''}</td><td>${p.paused ? '<span class="badge red">Paused</span>' : stateBadge(p.state)}${p.settled ? ' <span class="small muted">paid</span>' : ''}${p.lapoRules ? ' <span class="small muted">Lapo rules</span>' : ''}</td><td>${short(p.players)}</td><td>${esc(naira(p.prize))}</td><td>${p.entryFee ? esc(naira(p.entryFee)) : 'Free'}</td><td>${esc(lagos(p.endsAt))}</td>
<td style="white-space:nowrap">${p.paused ? postBtn(`/api/admin/pools/${p.id}/restart`, 'Restart in 10 min', { cls: 'btn--green btn--sm', body: { minutes: 10 } }) : (p.state === 'live' || p.state === 'soon') ? postBtn(`/api/admin/pools/${p.id}/pause`, 'Pause + refund', { cls: 'btn--gold btn--sm', confirm: `Pause “${p.name}”? Everybody gets back the money and boosters they put into it, and they join again when you restart it.` }) : ''}${p.state === 'ended' && !p.settled ? postBtn(`/api/admin/pools/${p.id}/settle`, 'Pay out', { cls: 'btn--green btn--sm' }) : ''}${!p.settled && p.state !== 'cancelled' ? postBtn(`/api/admin/pools/${p.id}/cancel`, 'Cancel', { confirm: `Cancel “${p.name}” and refund every entry fee?`, cls: 'btn--danger btn--sm' }) : ''}</td></tr>`).join('') || '<tr><td colspan="8">No pools.</td></tr>'}
</tbody></table></div>`;
  return page(ctx, 'Pools', '/admin/pools', body);
}

// ── store items (skins + boosters) ──────────────────────────────────────────
export function adminStore(ctx) {
  const { items, edit } = ctx;
  const e = edit || {}, cfg = edit ? JSON.parse(edit.config || '{}') : {};
  const kind = e.kind === 'SKIN' ? 'SKIN' : 'BOOSTER';
  const body = `<h1 class="h1">Store</h1><p class="sub">Create boosters and tap skins. Choose who can buy them, the rank needed, and for boosters how many uses per game.</p>
<div class="panel">${form('/api/admin/items', `
  ${edit ? `<input type="hidden" name="id" value="${esc(e.id)}"><p class="small muted" style="margin:0">Editing <b>${esc(e.name)}</b> · <a href="/admin/store">new item instead</a></p>` : ''}
  ${choice({ label: 'Kind', name: 'kind', options: [['BOOSTER', 'Booster'], ['SKIN', 'Tap skin']], value: kind })}
  <div class="two">${field({ label: 'Name', name: 'name', value: e.name || '', attrs: 'maxlength="40" required' })}${moneyField({ label: 'Price (₦, 0 = free)', name: 'price', value: e.price_kobo !== undefined ? e.price_kobo / 100 : 0 })}</div>
  ${field({ label: 'Description', name: 'description', value: e.description || '', attrs: 'maxlength="140"' })}
  ${choice({ label: 'Who fit buy am', name: 'audience', options: [['ALL', 'Everybody'], ['MAPO', 'Mapo + Nepo'], ['NEPO', 'Nepo only'], ['LAPO', 'Lapo only']], value: e.audience || 'ALL', cls: 'wrap4' })}
  <div class="two">${field({ label: 'Minimum rank', name: 'min_rank', type: 'number', value: e.min_rank || 1, attrs: 'min="1"' })}<div class="ta-field"><label class="ta-label" for="ic">Colour</label><input class="color-in" id="ic" type="color" name="bg" value="${esc(cfg.bg || cfg.color || '#2E8BFF')}"></div></div>
  <div class="sgrp" data-show="kind=BOOSTER"><div class="two">${field({ label: 'Multiplier', name: 'multiplier', type: 'number', value: e.multiplier || 2, attrs: 'min="1.1" max="10" step="0.1"' })}${field({ label: 'Seconds', name: 'duration', type: 'number', value: e.duration_seconds || 20, attrs: 'min="5" max="120"' })}</div>
    ${field({ label: 'Uses per game (0 = no limit)', name: 'per_game_limit', type: 'number', value: e.per_game_limit || 0, attrs: 'min="0" max="100"' })}</div>
  <div class="sgrp" data-show="kind=SKIN">
    ${select({ label: 'Pattern', name: 'pattern', options: [['none', 'Plain colour'], ...Object.entries(PATTERNS).map(([k, p]) => [k, p.name])], value: cfg.pattern || 'none' })}
    ${upload({ label: 'Or a picture', name: 'image', value: cfg.image || '' })}
    ${check({ name: 'glow', label: 'Neon glow', checked: !!cfg.glow })}</div>
  ${check({ name: 'giftable', label: 'Can be gifted', checked: e.giftable !== 0 })}${check({ name: 'active', label: 'On sale', checked: e.active !== 0 })}`, { submit: edit ? 'Save changes' : 'Create item' })}</div>
<h2 class="h2">All items</h2><div class="grid g3">${items.map(i => { const c = JSON.parse(i.config || '{}'); return `<div class="panel">${i.kind === 'SKIN' ? skinPreview(c) : i.kind === 'BOOSTER' ? `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:var(--r-sm);background:${esc(c.color || '#2E8BFF')};color:#fff;text-shadow:var(--ts)"><b style="font:900 italic 34px var(--display)">${esc(String(i.multiplier).replace(/\.0$/, ''))}×</b><span>${i.duration_seconds}s</span></div>` : `<div class="empty" style="color:var(--ink)">Shape (retired)</div>`}
  <div class="row" style="margin-top:10px"><b style="font:900 18px var(--display)">${esc(i.name)}</b><a class="btn btn--soft btn--sm" href="/admin/store?edit=${encodeURIComponent(i.id)}">Edit</a></div>
  <p class="small muted" style="margin:4px 0 0">${i.price_kobo ? esc(naira(i.price_kobo)) : 'Free'} · ${{ ALL: 'Everybody', MAPO: 'Mapo + Nepo', NEPO: 'Nepo only', LAPO: 'Lapo only' }[i.audience] || i.audience}${i.min_rank > 1 ? ` · rank ${i.min_rank}+` : ''}${i.per_game_limit ? ` · ${i.per_game_limit}/game` : ''}${i.active ? '' : ' · <b>off sale</b>'} · ${Number(i.owners || 0)} own</p></div>`; }).join('')}</div>`;
  return page(ctx, 'Store', '/admin/store', body, { css: ADMIN_CSS + '.skin-prev{position:relative;height:110px;display:grid;place-items:center;overflow:hidden;border-radius:var(--r-sm);border:3px solid #fff}.skin-prev span{position:relative;font:900 italic 30px var(--display);color:#fff;text-shadow:var(--ts)}.skin-prev.glow{box-shadow:0 0 0 3px #5dff4a,0 0 20px rgba(93,255,74,.6)}' });
}

// ── ranks ───────────────────────────────────────────────────────────────────
export function adminRanks(ctx) {
  const { ranks, edit } = ctx;
  const e = edit || { level: (ranks[ranks.length - 1]?.level || 0) + 1 };
  const body = `<h1 class="h1">Ranks</h1><p class="sub">${ranks.length} ranks. Names use Nigerian slang only. Players move up when they meet every requirement. Unlock keys: a store item id (e.g. booster-8x), sound-&lt;name&gt; or <b style="color:#fff">voice</b>.</p>
<div class="panel">${form('/api/admin/ranks', `
  <div class="two">${field({ label: 'Level', name: 'level', type: 'number', value: e.level, attrs: 'min="1"' })}${field({ label: 'Name', name: 'name', value: e.name || '', attrs: 'maxlength="40" required' })}</div>
  <div class="two">${moneyField({ label: 'Lifetime taps needed', name: 'min_taps', value: e.min_taps || 0 })}${field({ label: 'Games needed', name: 'min_games', type: 'number', value: e.min_games || 0, attrs: 'min="0"' })}</div>
  <div class="two">${field({ label: 'Wins needed', name: 'min_wins', type: 'number', value: e.min_wins || 0, attrs: 'min="0"' })}<div class="ta-field"><label class="ta-label" for="rc">Colour</label><input class="color-in" id="rc" type="color" name="color" value="${esc(e.color || '#2E8BFF')}"></div></div>
  ${field({ label: 'Unlocks (comma separated)', name: 'unlocks', value: e.unlocks || '', placeholder: 'booster-8x,sound-laser,voice' })}`, { submit: edit ? `Save rank ${e.level}` : 'Add rank' })}
<div class="actions">${postBtn('/api/admin/ranks/recalc', 'Recalculate all players')}</div></div>
<div class="tbl-wrap" style="margin-top:14px"><table class="tbl"><thead><tr><th>Lvl</th><th>Name</th><th>Taps</th><th>Games</th><th>Wins</th><th>Unlocks</th><th>Players</th><th></th></tr></thead><tbody>
${ranks.map(r => `<tr><td><b>${r.level}</b></td><td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${esc(r.color)};margin-right:6px"></span>${esc(r.name)}</td><td>${short(r.min_taps)}</td><td>${r.min_games}</td><td>${r.min_wins}</td><td class="small">${esc(r.unlocks)}</td><td>${r.players || 0}</td><td><a href="/admin/ranks?edit=${r.level}">Edit</a></td></tr>`).join('')}
</tbody></table></div>
<h2 class="h2">Reset</h2><div class="panel">${form('/api/admin/ranks/reset', `<p class="muted" style="margin:0">Puts back the default 100 ranks. Your edits will be lost.</p>${field({ label: 'Type RESET to confirm', name: 'confirm', attrs: 'autocomplete="off"' })}`, { submit: 'Reset ranks', cls: 'danger-form' })}</div>`;
  return page(ctx, 'Ranks', '/admin/ranks', body, { css: ADMIN_CSS });
}

// ── ads + sponsors' lead capture ────────────────────────────────────────────
export function adminAds(ctx) {
  const { ads, pools, sponsors } = ctx;
  const waiting = ads.filter(a => !a.approved && !a.reject_reason), rejected = ads.filter(a => !a.approved && a.reject_reason);
  const body = `<h1 class="h1">Ads</h1><p class="sub">Check every sponsor ad against the ad guidelines. Approve it, or reject it with a reason (the sponsor sees it). You can delete any ad.</p>
<h2 class="h2" style="margin-top:0">Waiting approval (${waiting.length})</h2>${waiting.length ? adList(waiting, { admin: true }) : '<div class="empty" style="margin-bottom:6px">No ads waiting for approval.</div>'}
<h2 class="h2">Live ads</h2>${adList(ads.filter(a => a.approved), { admin: true })}
${rejected.length ? `<h2 class="h2">Rejected (${rejected.length})</h2>${adList(rejected, { admin: true })}` : ''}
<h2 class="h2">Create a Tap Am ad</h2><div class="panel">${adForm(pools)}</div>
<h2 class="h2">Sponsors · lead capture</h2><p class="sub">When on, that sponsor’s ads show a “send my details” form. Players must tick consent. Leads go only to that sponsor.</p>
${sponsors.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Sponsor</th><th>Ads</th><th>Leads</th><th>Lead capture</th></tr></thead><tbody>${sponsors.map(s => `<tr><td><a href="/admin/users/${esc(s.user_id)}">${esc(s.company)}</a></td><td>${s.ads}</td><td>${s.leads}</td><td>${postBtn(`/api/admin/sponsors/${s.user_id}/leads`, s.lead_capture ? 'ON — turn off' : 'OFF — turn on', { body: { on: !s.lead_capture }, cls: s.lead_capture ? 'btn--green btn--sm' : 'btn--soft btn--sm' })}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No sponsors yet.</div>'}`;
  return page(ctx, 'Ads', '/admin/ads', body, { css: AD_CSS, script: AD_JS });
}

// ── home slideshow ──────────────────────────────────────────────────────────
export function adminSlides(ctx) {
  const { slides, edit } = ctx;
  const e = edit || {};
  const req = slides.filter(s => s.status === 'REQUESTED');
  const row = s => `<div class="item" style="align-items:center"><span style="flex:none;width:56px;height:56px;border-radius:var(--r-in);background:${esc(s.color)};${s.image_url ? `background-image:url('${esc(s.image_url)}');background-size:cover` : ''}"></span><div class="grow"><div class="t">${esc(s.title)}</div><div class="s">${s.image_url ? 'Picture' : 'Colour + words'}${s.cta ? ' · button “' + esc(s.cta) + '”' : ''}${s.company ? ' · from ' + esc(s.company) : ''} · ${short(s.views)} views · ${short(s.clicks)} taps</div></div>
  <span class="row" style="gap:6px;flex-wrap:wrap;justify-content:flex-end"><span class="badge ${s.status === 'LIVE' ? 'live' : s.status === 'REQUESTED' ? 'soon' : ''}">${esc(s.status.toLowerCase())}</span>${s.status !== 'LIVE' ? postBtn(`/api/admin/slides/${s.id}/approve`, 'Make live', { cls: 'btn--green btn--sm' }) : postBtn(`/api/admin/slides/${s.id}/pause`, 'Pause')}${s.status === 'REQUESTED' ? postBtn(`/api/admin/slides/${s.id}/reject`, 'Reject', { cls: 'btn--danger btn--sm', confirm: 'Reject this request?' }) : ''}<a class="btn btn--soft btn--sm" href="/admin/slides?edit=${esc(s.id)}">Edit</a>${postBtn(`/api/admin/slides/${s.id}/delete`, 'Delete', { cls: 'btn--danger btn--sm', confirm: 'Delete this slide?' })}</span></div>`;
  const body = `<h1 class="h1">Home slides</h1><p class="sub">The slideshow at the top of every player’s home. Sponsors ask for a slot from their ads page; you approve it — or make your own here.</p>
${req.length ? `<h2 class="h2" style="margin-top:0">Requests (${req.length})</h2><div class="list">${req.map(row).join('')}</div>` : ''}
<h2 class="h2">${edit ? 'Edit slide' : 'Make a slide'}</h2><div class="panel">${form('/api/admin/slides', `
  ${edit ? `<input type="hidden" name="id" value="${esc(e.id)}">` : ''}
  ${choice({ label: 'Slide type', name: 'mode', options: [['IMAGE', 'Picture'], ['COLOR', 'Colour + words']], value: e.id ? (e.image_url ? 'IMAGE' : 'COLOR') : 'COLOR', tip: 'Picture: your uploaded picture fills the slide, with just the button on it. Colour + words: a colour with a title and a line of text.' })}
  ${field({ label: 'Title', name: 'title', value: e.title || '', placeholder: 'Independence Day Mega Pool', attrs: 'maxlength="60" required', hint: 'For a picture slide this is only read out to screen readers.' })}
  <div class="sgrp" data-show="mode=IMAGE">${upload({ label: 'Slide picture (wide, about 1600×700)', name: 'image_url', value: e.image_url || '' })}</div>
  <div class="sgrp" data-show="mode=COLOR">
    ${field({ label: 'Text under the title', name: 'subtitle', value: e.subtitle || '', placeholder: '₦500,000 prize · Friday 8pm', attrs: 'maxlength="120"' })}
    <div class="ta-field"><label class="ta-label" for="slc">Colour</label><input class="color-in" id="slc" type="color" name="color" value="${esc(e.color || '#FF8A2A')}"></div></div>
  <div class="two">${field({ label: 'Button text', name: 'cta', value: e.cta || '', placeholder: 'Check am', attrs: 'maxlength="24"' })}${field({ label: 'Button link', name: 'link', value: e.link || '', placeholder: '/pools or https://…', hint: 'A Tap Am page like /pools, or a full https:// link.' })}</div>
  <div class="two">${field({ label: 'Order (0 first)', name: 'sort', type: 'number', value: e.sort || 0, attrs: 'min="0"' })}${select({ label: 'Status', name: 'status', options: [['LIVE', 'Live'], ['PAUSED', 'Paused']], value: e.status === 'PAUSED' ? 'PAUSED' : 'LIVE' })}</div>`, { submit: edit ? 'Save slide' : 'Add slide' })}</div>
<h2 class="h2">All slides</h2>${slides.filter(s => s.status !== 'REQUESTED').length ? `<div class="list">${slides.filter(s => s.status !== 'REQUESTED').map(row).join('')}</div>` : '<div class="empty">No slides yet. The home page shows no slideshow until you add one.</div>'}`;
  return page(ctx, 'Home slides', '/admin/slides', body);
}

// ── backgrounds for Nepo babies ─────────────────────────────────────────────
export function adminBackgrounds(ctx) {
  const { backgrounds } = ctx;
  const body = `<h1 class="h1">Backgrounds</h1><p class="sub">Nepo babies pick their app background from these. Made from two colours (and an optional picture), so they always load fast.</p>
<div class="panel">${form('/api/admin/backgrounds', `
  ${field({ label: 'Name', name: 'name', placeholder: 'Lekki sunset', attrs: 'maxlength="40" required' })}
  <div class="two"><div class="ta-field"><label class="ta-label" for="ca">Colour 1</label><input class="color-in" id="ca" type="color" name="color_a" value="#FF8A2A"></div><div class="ta-field"><label class="ta-label" for="cb">Colour 2</label><input class="color-in" id="cb" type="color" name="color_b" value="#4B1FD8"></div></div>
  ${choice({ label: 'Style', name: 'style', options: [['LINEAR', 'Smooth'], ['RADIAL', 'Glow'], ['DOTS', 'Dots']], value: 'LINEAR' })}
  ${upload({ label: 'Picture (optional)', name: 'image_url' })}
  ${field({ label: 'Order', name: 'sort', type: 'number', value: '0', attrs: 'min="0"' })}`, { submit: 'Add background' })}</div>
<h2 class="h2">All backgrounds</h2><div class="grid g3">${backgrounds.map(b => `<div class="panel" style="padding:10px"><div style="height:110px;border-radius:var(--r-sm);background:${esc(backgroundCss(b))}"></div><div class="row" style="margin-top:8px"><b>${esc(b.name)}</b>${postBtn(`/api/admin/backgrounds/${b.id}/delete`, 'Delete', { cls: 'btn--danger btn--sm', confirm: `Delete ${b.name}? Players using it go back to the default.` })}</div></div>`).join('') || '<div class="empty">None yet.</div>'}</div>`;
  return page(ctx, 'Backgrounds', '/admin/backgrounds', body);
}

// ── merch (shown on /merch) ─────────────────────────────────────────────────
export function adminMerch(ctx) {
  const { items, edit } = ctx;
  const e = edit || {};
  const status = { SOON: 'Coming soon (notify me)', BUY: 'On sale (Buy button)', SOLD_OUT: 'Sold out' };
  const body = `<h1 class="h1">Merch</h1><p class="sub">Items on the public Merch page. Upload a photo, set the price, and add a link where people buy it (your online shop or WhatsApp link).</p>
<div class="panel">${form('/api/admin/merch', `
  ${edit ? `<input type="hidden" name="id" value="${esc(e.id)}"><p class="small muted" style="margin:0">Editing <b>${esc(e.name)}</b> · <a href="/admin/merch">add a new item instead</a></p>` : ''}
  <div class="two">${field({ label: 'Name', name: 'name', value: e.name || '', placeholder: 'Tap Am tee', attrs: 'maxlength="60" required' })}${moneyField({ label: 'Price (₦, 0 = hide price)', name: 'price', value: e.price_kobo ? e.price_kobo / 100 : '' })}</div>
  ${field({ label: 'Description', name: 'description', value: e.description || '', placeholder: 'Heavy cotton, green AM print', attrs: 'maxlength="200"' })}
  ${upload({ label: 'Photo', name: 'image_url', value: e.image_url || '' })}
  <div class="two">${select({ label: 'Status', name: 'status', options: Object.entries(status), value: e.status || 'SOON' })}<div class="ta-field"><label class="ta-label" for="mc">Card colour (when there is no photo)</label><input class="color-in" id="mc" type="color" name="color" value="${esc(e.color || '#2E8BFF')}"></div></div>
  <div class="two">${field({ label: 'Buy link (https://)', name: 'link', value: e.link || '', placeholder: 'https://wa.me/234…', attrs: 'inputmode="url"' })}${field({ label: 'Order (0 first)', name: 'sort', type: 'number', value: e.sort || 0, attrs: 'min="0"' })}</div>
  ${check({ name: 'active', label: 'Show on the Merch page', checked: e.active !== 0 })}`, { submit: edit ? 'Save item' : 'Add item' })}</div>
<h2 class="h2">All merch</h2>${items.length ? `<div class="grid g3">${items.map(m => `<div class="panel" style="padding:10px">${m.image_url ? `<img src="${esc(m.image_url)}" alt="" style="display:block;width:100%;height:150px;object-fit:cover;border-radius:var(--r-sm)">` : `<div style="height:150px;border-radius:var(--r-sm);background:${esc(m.color)}"></div>`}
  <div class="row" style="margin-top:8px"><b style="font:900 18px var(--display)">${esc(m.name)}</b><span class="badge ${m.active ? (m.status === 'BUY' ? 'live' : 'soon') : ''}">${m.active ? esc(status[m.status] || m.status).split(' (')[0] : 'Hidden'}</span></div>
  <p class="small muted" style="margin:4px 0 8px">${m.price_kobo ? esc(naira(m.price_kobo)) : 'No price'} · ${short(m.interested || 0)} want it</p>
  <div class="actions" style="margin-top:0"><a class="btn btn--soft btn--sm" href="/admin/merch?edit=${encodeURIComponent(m.id)}">Edit</a>${postBtn(`/api/admin/merch/${m.id}/toggle`, m.active ? 'Hide' : 'Show')}${postBtn(`/api/admin/merch/${m.id}/delete`, 'Delete', { cls: 'btn--danger btn--sm', confirm: `Delete ${m.name}?` })}</div></div>`).join('')}</div>` : '<div class="empty">No merch yet. The Merch page shows starter ideas until you add items.</div>'}`;
  return page(ctx, 'Merch', '/admin/merch', body, { css: ADMIN_CSS });
}

// ── promo codes: free Mapo / Nepo for some days ─────────────────────────────
export function adminCodes(ctx) {
  const { codes } = ctx;
  const body = `<h1 class="h1">Promo codes</h1><p class="sub">Make a code that gives a free Mapo or Nepo plan. Players type it on the Plans page. Each player can use a code once.</p>
<div class="panel">${form('/api/admin/codes', `
  <div class="two">${field({ label: 'Code (leave empty to make one)', name: 'code', placeholder: 'NEPOFRIDAY', attrs: 'autocapitalize="characters" maxlength="20" autocomplete="off"' })}${select({ label: 'Plan', name: 'tier', options: [['MAPO', 'Mapo'], ['NEPO', 'Nepo']] })}</div>
  <div class="two">${select({ label: 'How long', name: 'days', options: [['30', '1 month'], ['60', '2 months'], ['90', '3 months'], ['180', '6 months'], ['365', '1 year'], ['7', '1 week']] })}${moneyField({ label: 'How many people can use it', name: 'max_uses', value: '100' })}</div>
  <div class="two">${field({ label: 'Stops working on (optional)', name: 'expires', type: 'date' })}${field({ label: 'Note for you (optional)', name: 'note', placeholder: 'Instagram giveaway', attrs: 'maxlength="80"' })}</div>`, { submit: 'Make code' })}</div>
<h2 class="h2">All codes</h2>${codes.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Code</th><th>Gives</th><th>Used</th><th>Ends</th><th>Note</th><th></th></tr></thead><tbody>${codes.map(c => `<tr><td><b style="font:900 17px var(--display);letter-spacing:.5px">${esc(c.code)}</b></td><td>${c.tier === 'NEPO' ? 'Nepo' : 'Mapo'} · ${c.days} days</td><td>${short(c.used)} / ${short(c.max_uses)}</td><td>${c.expires_at ? esc(lagos(c.expires_at, { hour: undefined, minute: undefined })) : '—'}</td><td class="small">${esc(c.note || '')}</td><td>${postBtn(`/api/admin/codes/${c.code}/toggle`, c.active ? 'Turn off' : 'Turn on', { cls: c.active ? 'btn--soft btn--sm' : 'btn--green btn--sm' })}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No codes yet.</div>'}`;
  return page(ctx, 'Promo codes', '/admin/codes', body, { css: ADMIN_CSS });
}

// ── special badges ──────────────────────────────────────────────────────────
export function adminBadges(ctx) {
  const { badges, given } = ctx;
  const byId = Object.fromEntries(badges.map(b => [b.id, b]));
  const chip = b => `<span style="display:inline-grid;place-items:center;flex:none;width:48px;height:48px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px var(--ink);background:${esc(b.color)};color:#fff;font:900 14px var(--display);text-shadow:var(--ts)">${esc(b.label)}</span>`;
  const body = `<h1 class="h1">Special badges</h1><p class="sub">Make your own badges (e.g. “Founding tapper”, “Ambassador”) and give them to players. They show on the player’s profile with their meaning.</p>
<div class="panel">${form('/api/admin/badges', `
  <div class="two">${field({ label: 'Badge name', name: 'name', placeholder: 'Founding tapper', attrs: 'maxlength="40" required' })}${field({ label: 'Short label (1–3 letters)', name: 'label', placeholder: 'FT', attrs: 'maxlength="3"' })}</div>
  ${field({ label: 'Meaning', name: 'meaning', placeholder: 'Joined Tap Am in the first month', attrs: 'maxlength="140"' })}
  <div class="ta-field"><label class="ta-label" for="bc">Colour</label><input class="color-in" id="bc" type="color" name="color" value="#9161FF"></div>`, { submit: 'Create badge' })}</div>
<h2 class="h2">Your badges</h2>${badges.length ? `<div class="list">${badges.map(b => `<div class="item" style="align-items:flex-start;flex-wrap:wrap">${chip(b)}<div class="grow"><div class="t">${esc(b.name)}</div><div class="s">${esc(b.meaning || '')} · ${short(b.holders)} player${b.holders == 1 ? '' : 's'}</div>
  <form class="rejform" data-api="/api/admin/badges/${esc(b.id)}/give" novalidate><div class="ta-field"><input class="ta-input" name="username" maxlength="24" placeholder="Player nickname" aria-label="Player nickname" autocapitalize="none"><p class="ta-error" data-err="username"></p></div><button class="btn btn--green btn--sm" type="submit">Give</button></form>
  <form class="rejform" data-api="/api/admin/badges/${esc(b.id)}/take" novalidate><div class="ta-field"><input class="ta-input" name="username" maxlength="24" placeholder="Take from (nickname)" aria-label="Take badge from nickname" autocapitalize="none"></div><button class="btn btn--soft btn--sm" type="submit">Take back</button></form></div>
  ${postBtn(`/api/admin/badges/${b.id}/delete`, 'Delete', { cls: 'btn--danger btn--sm', confirm: `Delete “${b.name}” and take it from everybody?` })}</div>`).join('')}</div>` : '<div class="empty">No special badges yet.</div>'}
${given.length ? `<h2 class="h2">Recently given</h2><div class="list">${given.map(g => { const b = byId[g.kind.slice(2)]; return `<div class="item"><div class="grow"><div class="t" style="font-size:15px">${esc(g.username)}</div><div class="s">${esc(b?.name || 'Deleted badge')} · ${esc(lagos(g.created_at))}</div></div></div>`; }).join('')}</div>` : ''}`;
  return page(ctx, 'Badges', '/admin/badges', body, { css: ADMIN_CSS });
}

// ── withdrawals ─────────────────────────────────────────────────────────────
export function adminWithdrawals(ctx) {
  const { rows, paystack, auto } = ctx;
  const pending = rows.filter(w => w.status === 'PENDING' || w.status === 'PROCESSING');
  const done = rows.filter(w => !pending.includes(w));
  const row = w => `<tr><td><a href="/admin/users/${esc(w.user_id)}">${esc(w.username)}</a>${w.flags ? ' <span class="badge red">flags</span>' : ''}</td><td><b>${esc(naira(w.amount_kobo))}</b></td><td>${esc(w.bank_name || w.bank_code)}<div class="small muted">${esc(w.account_number)} · ${esc(w.account_name || '')}</div></td><td>${esc(lagos(w.created_at))}</td><td><span class="badge ${w.status === 'PAID' ? 'live' : w.status === 'REJECTED' || w.status === 'FAILED' ? 'red' : 'soon'}">${esc(w.status.toLowerCase())}</span>${w.admin_note ? `<div class="small muted">${w.status === 'REJECTED' ? 'Reason: ' : ''}${esc(w.admin_note)}</div>` : ''}</td>
  <td style="white-space:nowrap">${w.status === 'PENDING' ? `${paystack ? postBtn(`/api/admin/withdrawals/${w.id}/transfer`, 'Send via Paystack', { cls: 'btn--green btn--sm', confirm: `Send ${naira(w.amount_kobo)} to ${w.account_name || w.account_number} now?` }) : ''}${postBtn(`/api/admin/withdrawals/${w.id}/paid`, 'Mark paid', { confirm: 'Only mark paid if you sent the money yourself. Continue?' })}<form class="rejform" data-api="/api/admin/withdrawals/${esc(w.id)}/reject" novalidate><div class="ta-field"><input class="ta-input" name="note" maxlength="200" placeholder="Reason (the player sees it)" aria-label="Reason for rejecting"><p class="ta-error" data-err="note"></p></div><button class="btn btn--danger btn--sm" type="submit">Reject + refund</button></form>` : ''}</td></tr>`;
  const table = list => `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Player</th><th>Amount</th><th>Bank</th><th>Asked</th><th>Status</th><th></th></tr></thead><tbody>${list.map(row).join('') || '<tr><td colspan="6">Nothing here.</td></tr>'}</tbody></table></div>`;
  const body = `<div class="headrow"><h1 class="h1">Payouts</h1><a class="btn btn--white btn--sm" href="/admin/withdrawals.csv" data-no-swap download>CSV for bank upload</a></div>
<p class="sub">${paystack ? (auto ? 'Automatic payouts are <b style="color:#fff">ON</b>: small requests from older accounts with no cheating flags are paid every 5 minutes. Everything else waits here.' : 'Automatic payouts are off (turn on in Overview, Settings).') : 'Paystack is not connected, so pay manually (download the CSV for your bank) and then press “Mark paid”.'}</p>
<h2 class="h2" style="margin-top:0">Waiting (${pending.length})</h2>${table(pending)}<h2 class="h2">Done</h2>${table(done)}`;
  return page(ctx, 'Payouts', '/admin/withdrawals', body, { css: ADMIN_CSS });
}

export function adminSuggestions(ctx) {
  const { rows } = ctx;
  const pools = rows.filter(s => s.kind === 'POOL'), general = rows.filter(s => s.kind !== 'POOL');
  const item = s => { const d = JSON.parse(s.data || '{}'); return `<div class="item" style="align-items:flex-start"><div class="grow"><div style="white-space:pre-wrap;font-weight:600">${esc(s.message)}</div><div class="s">${s.kind === 'POOL' ? `${esc(d.type || '')}${d.sides ? ' · ' + esc(d.sides) : ''}${d.when ? ' · ' + esc(d.when) : ''} · ` : ''}${esc(s.name || 'Anonymous')}${s.email ? ' · ' + esc(s.email) : ''} · ${esc(lagos(s.created_at))}</div></div><span class="row" style="gap:6px;flex-direction:column;align-items:flex-end">${s.status === 'DONE' ? '<span class="badge live">Done</span>' : (s.kind === 'POOL' ? '<a class="btn btn--green btn--sm" href="/pools/new">Create it</a>' : '') + postBtn(`/api/admin/suggestions/${s.id}/done`, 'Mark done')}${postBtn(`/api/admin/suggestions/${s.id}/delete`, 'Delete', { cls: 'btn--danger btn--sm', confirm: 'Delete this suggestion?' })}</span></div>`; };
  const body = `<h1 class="h1">Suggestions</h1><h2 class="h2" style="margin-top:0">Pools players want (${pools.length})</h2>${pools.length ? `<div class="list">${pools.map(item).join('')}</div>` : '<div class="empty">No pool suggestions yet.</div>'}
<h2 class="h2">General</h2>${general.length ? `<div class="list">${general.map(item).join('')}</div>` : '<div class="empty">No suggestions yet.</div>'}`;
  return page(ctx, 'Suggestions', '/admin/suggestions', body);
}

// ── first-time setup (needs ADMIN_SETUP_KEY) ────────────────────────────────
export function setupPage() {
  const body = `<main class="ta-page"><div class="ta-card">
<h1 style="margin:0 0 6px;font:900 30px/1 var(--display)">Set up super admin</h1><p class="ta-note" style="margin:0 0 16px">One time only. You need the setup key from the server settings.</p>
<form class="form" data-api="/api/setup-admin" novalidate style="display:grid;gap:12px">
${['setupKey:Setup key:password', 'username:Nickname:text', 'email:Email:email', 'password:Password (10+ characters):password'].map(x => { const [n, l, t] = x.split(':'); return `<div class="ta-field"><label class="ta-label" for="s-${n}">${l}</label><input class="ta-input" id="s-${n}" name="${n}" type="${t}" required autocomplete="${n === 'password' ? 'new-password' : 'off'}"><p class="ta-error" data-err="${n}"></p></div>`; }).join('')}
<div class="ta-msg" role="alert"></div><button class="btn btn--green btn--block" type="submit">Create admin</button></form></div></main>`;
  return themeShell({ title: 'Admin setup', body });
}

// ── suggest (public) ────────────────────────────────────────────────────────
export function suggestPage(user) {
  const body = `<main class="ta-page"><a class="ta-logo" href="/" style="width:120px">${LOGO_IMG()}</a><div class="ta-card">
<a href="${user ? '/dashboard' : '/'}" data-back style="color:var(--ink);font-weight:700">Back</a>
<h1 style="margin:10px 0 6px;font:900 32px/1 var(--display)">Suggest something</h1><p class="ta-note" style="margin:0 0 16px">Wetin we fit add or fix? We dey read everything.${user ? ' Want a special pool? <a href="/suggest-pool">Suggest a pool</a>.' : ''}</p>
<form class="form" data-api="/api/suggestions" data-reset novalidate style="display:grid;gap:12px">
<div class="ta-field"><label class="ta-label" for="g-name">Name (optional)</label><input class="ta-input" id="g-name" name="name" maxlength="60" value="${esc(user?.username || '')}"></div>
<div class="ta-field"><label class="ta-label" for="g-msg">Your suggestion</label><textarea class="ta-input" id="g-msg" name="message" maxlength="2000" required></textarea><p class="ta-error" data-err="message"></p></div>
<div class="ta-msg" role="alert"></div><button class="btn btn--green btn--block" type="submit">Send</button></form></div></main>`;
  return themeShell({ title: 'Suggest', body });
}

// ── separate admin login (/admin/login) ─────────────────────────────────────
export function adminLoginPage() {
  const body = `<main class="ta-page" style="justify-content:center">
  <a class="ta-logo" href="/" style="width:140px">${LOGO_IMG()}</a>
  <div class="ta-card">
    <span class="badge red">Super admin</span>
    <h1 style="margin:12px 0 6px;font:900 32px/1 var(--display)">Admin login</h1>
    <p class="ta-note" style="margin:0 0 16px">For the Tap Am super admin only. Players and sponsors log in <a href="/login">here</a>.</p>
    <form class="form" data-api="/api/admin/login" novalidate style="display:grid;gap:12px">
      <div class="ta-field"><label class="ta-label" for="a-id">Nickname or email</label><input class="ta-input" id="a-id" name="identifier" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="254" required><p class="ta-error" data-err="identifier"></p></div>
      <div class="ta-field"><label class="ta-label" for="a-pw">Password</label><input class="ta-input" id="a-pw" name="password" type="password" autocomplete="current-password" maxlength="128" required><p class="ta-error" data-err="password"></p></div>
      <div class="ta-msg" role="alert"></div>
      <button class="btn btn--block" type="submit">Enter admin</button>
    </form>
  </div>
  <p style="text-align:center;margin-top:14px"><a href="/" style="color:#fff">Back to Tap Am</a></p>
</main>`;
  return themeShell({ title: 'Admin login', body, bodyClass: 'bg-anim', css: '.badge{display:inline-flex;padding:5px 10px;border-radius:999px;font:800 12px var(--body)}.badge.red{background:var(--danger);color:#fff}' });
}
