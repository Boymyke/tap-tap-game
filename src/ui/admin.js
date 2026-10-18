// Super admin pages.
import { appPage, esc, naira, nairaShort, short, lagos, field, moneyField, select, choice, check, form, postBtn, copyBtn, upload, stateBadge, tierBadge, pager, nameTag, fmtDur } from './kit.js';
import { PATTERNS } from './patterns.js';
import { themeShell, LOGO_IMG } from './theme.js';
import { skinPreview } from './skins.js';
import { adForm, adList, AD_CSS, AD_JS } from './sponsor.js';
import { backgroundCss, tierName, tierOf } from '../tiers.js';

const TABS = [['/admin', 'Overview'], ['/admin/health', 'Health'], ['/admin/errors', 'Errors'], ['/admin/messages', 'Announce'], ['/admin/users', 'Users'], ['/admin/gifts', 'Gifts'], ['/admin/pools', 'Pools'], ['/admin/store', 'Store'], ['/admin/ranks', 'Ranks'], ['/admin/ads', 'Ads'], ['/admin/slides', 'Home slides'], ['/admin/badges', 'Badges'], ['/admin/codes', 'Promo codes'], ['/admin/merch', 'Merch'], ['/admin/backgrounds', 'Backgrounds'], ['/admin/withdrawals', 'Payouts'], ['/admin/money', 'Money'], ['/admin/inner-circle', 'Inner circle'], ['/admin/ad-requests', 'Ad requests'], ['/admin/suggestions', 'Suggestions']];
const tabs = cur => `<nav class="tabs" aria-label="Admin sections">${TABS.map(([h, l]) => `<a href="${h}" ${h === cur ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;
const page = (ctx, title, active, body, extra = {}) => appPage({ user: ctx.user, title, active: TABS.some(t => t[0] === active) && ['/admin', '/admin/users', '/admin/pools', '/admin/ads', '/admin/health'].includes(active) ? active : '', body: tabs(extra.tab || active) + body, ...extra });
const ADMIN_CSS = `.loadbars{display:flex;align-items:flex-end;gap:3px;height:90px;padding:6px;border-radius:var(--r-in);background:var(--cloud)}.loadbars i{flex:1;min-width:3px;border-radius:3px 3px 0 0}
.danger-form .btn{background:var(--danger);box-shadow:0 4px 0 var(--danger-d);color:#fff}
.sgrp{display:grid;gap:14px;padding:14px;border-radius:var(--r-sm);background:var(--cloud)}
.rejform{display:flex;gap:6px;flex-wrap:wrap;align-items:flex-start;margin-top:6px}
.rejform .ta-field{flex:1;min-width:160px;margin:0}.rejform .ta-input{height:40px}
.sgrp h3{margin:0;font:900 17px var(--display)}
.three{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.sgrp .two>*,.sgrp .three>*{min-width:0}
@media (max-width:640px){.three{grid-template-columns:1fr}}
.errs .tbl td{vertical-align:top}.errs details summary{cursor:pointer;font-weight:700}.errs pre{white-space:pre-wrap;font-size:12px;margin:6px 0 0;max-height:220px;overflow:auto;background:var(--cloud);padding:8px;border-radius:8px}
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
  ${[['Players', s.players, 'c-sky'], ['Mapo babies', s.mapo, 'c-teal'], ['Nepo babies', s.nepo, 'c-pink'], ['Sponsors', s.sponsors, 'c-orange'], ['Live pools', s.live, 'c-purple'], ['Wallet money held', nairaShort(s.wallets), 'c-sky'], ['Winnings owed', nairaShort(s.winnings), 'c-green'], ['Paystack in today', nairaShort(s.paidToday || 0), 'c-green'], ['Paystack in (all)', nairaShort(s.paidAll || 0), 'c-teal'], ['Time sold today', nairaShort(s.timeBoughtToday || 0), 'c-teal'], ['Time sold (all)', nairaShort(s.timeBought || 0), 'c-purple'], ['Payouts waiting', s.pendingW, 'c-sunny'], ['Ads waiting', s.pendingAds, 'c-pink'], ['Home slot requests', s.pendingSlides, 'c-orange'], ['Pool suggestions', s.poolIdeas, 'c-teal'], ['Taps today', short(s.tapsToday), 'c-purple']]
    .map(([a, b, c]) => `<div class="tcard card ${c}" style="padding:14px"><div class="stat"><span class="k">${a}</span><span class="v">${typeof b === 'number' ? short(b) : esc(b)}</span></div></div>`).join('')}
</div>
<div class="grid g2 g4" style="margin-top:12px">
  <a class="btn btn--green btn--block" href="/pools/new">+ Create pool</a><a class="btn btn--white btn--block" href="/admin/money">Money in (Paystack)</a><a class="btn btn--white btn--block" href="/admin/messages">Announce / email</a><a class="btn btn--white btn--block" href="/admin/errors">Errors${ctx.errors24 ? ` <span class="badge red">${ctx.errors24}</span>` : ''}</a><a class="btn btn--white btn--block" href="/admin/health">System health</a>
</div>
<h2 class="h2">Server problem</h2><div class="panel" style="${st.overload === '1' ? 'box-shadow:0 0 0 3px var(--danger),var(--sh)' : ''}">
  <p class="muted" style="margin:0 0 10px">${st.overload === '1' ? '<b style="color:var(--danger)">Games are paused. Sign-ups and new pools are off.</b> Every score and every naira is kept. When the servers are fine, open the vote: players choose to continue each match or restart it (boosters back).' : 'If the servers are down or struggling, pause every live and upcoming pool. Scores, entry fees and prizes are kept, players get a message, and nobody can sign up or create pools until you say the servers are back.'}</p>
  ${st.overload === '1' ? form('/api/admin/overload/restart-all', `${field({ label: 'Pools paused one by one (with refunds) start again in (minutes)', name: 'minutes', type: 'number', value: '10', attrs: 'min="1" max="1440"' })}`, { submit: `Servers are fine: open the vote (${esc(v('vote_hours', 1))} h)` })
    : form('/api/admin/overload/pause-all', `${check({ name: 'confirm', label: 'Yes, pause every live and upcoming pool now' })}`, { submit: 'Pause all games (server problem)', btn: 'btn--danger' })}
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
    <div class="two">${moneyField({ label: 'Most a player can withdraw a day', name: 'withdraw_daily_max_kobo', value: k('withdraw_daily_max_kobo') || 1000000 })}${field({ label: 'Free mystery box every (days, about)', name: 'free_box_days', type: 'number', value: v('free_box_days', 3), attrs: 'min="0" max="60"', hint: '0 = no free boxes.' })}</div>
    ${check({ name: 'tapoffs_on', label: '<b>Tap-offs open</b> (players can challenge each other 1-on-1). While off, the Tap-off buttons show “Coming soon”.', checked: st.tapoffs_on === '1' })}
    ${check({ name: 'stakes_on', label: '<b>Money stakes on tap-offs</b> (players put money on 1-on-1 challenges; Tap Am holds it). Check with your lawyer before switching on.', checked: st.stakes_on === '1' })}</div>
  <div class="sgrp"><h3>Pools</h3>
    <div class="three">${field({ label: 'Pools a Lapo baby can create a day', name: 'lapo_pools_per_day', type: 'number', value: v('lapo_pools_per_day', 3), attrs: 'min="0" max="500"' })}${field({ label: 'Pools a Mapo baby can create a day', name: 'mapo_pools_per_day', type: 'number', value: v('mapo_pools_per_day', 20), attrs: 'min="0" max="500"' })}${field({ label: 'Pools a Nepo baby can create a day', name: 'nepo_pools_per_day', type: 'number', value: v('nepo_pools_per_day', 50), attrs: 'min="0" max="500"' })}</div>
    <div class="two">${field({ label: 'Seconds added per ₦10,000 in a game', name: 'topup_seconds_per_step', type: 'number', value: v('topup_seconds_per_step', 10), attrs: 'min="1" max="600"' })}${field({ label: 'Instant match: cancel if not full after (hours)', name: 'instant_wait_hours', type: 'number', value: v('instant_wait_hours', 24), attrs: 'min="1" max="168"' })}</div>
    <div class="two">${field({ label: 'Server-problem vote lasts (hours)', name: 'vote_hours', type: 'number', value: v('vote_hours', 1), attrs: 'min="1" max="24"' })}${field({ label: 'Votes needed to continue (%)', name: 'vote_continue_pct', type: 'number', value: v('vote_continue_pct', 50), attrs: 'min="1" max="100"', hint: 'Below this share of “continue” votes, the match restarts.' })}</div>
    ${check({ name: 'opt_lapo_rules', label: '<b>“Use Lapo baby rules” option</b> for players and sponsors (pools and tap-offs). Off = the option is hidden and nobody but you can switch it on. Lapo-only pools always use Lapo rules.', checked: st.opt_lapo_rules !== '0' })}
    ${check({ name: 'opt_boosters', label: '<b>“Allow boosters” option</b> for players and sponsors (pools and tap-offs). Off = the option is hidden and boosters stay allowed in their pools.', checked: st.opt_boosters !== '0' })}
    ${check({ name: 'marketing_emails', label: '<b>Marketing emails</b> (pool news, sponsor email blasts, news announcements, the daily top games). <b>Leave off while email goes through ZeptoMail</b>: ZeptoMail allows account emails only and can suspend accounts that send marketing. Switch on only after a marketing email service is connected.', checked: st.marketing_emails === '1' })}
    ${check({ name: 'top_games_email', label: '<b>Daily “top games” email</b> to Mapo and Nepo babies who said yes to game emails (live and open pools).', checked: st.top_games_email !== '0' })}
    ${field({ label: 'House cut on paid pools (%)', name: 'house_cut_pct', type: 'number', value: v('house_cut_pct', 0), attrs: 'min="0" max="50"', hint: 'Taken from paid-pool prizes before payout. 0 = all entry fees go to winners.' })}
    ${check({ name: 'auto_payouts', label: '<b>Automatic payouts</b> through the payment gateway (small amounts, older accounts, no cheating flags)', checked: st.auto_payouts === '1' })}
    <div class="two">${moneyField({ label: 'Auto-pay up to (₦)', name: 'auto_payout_max_kobo', value: k('auto_payout_max_kobo') })}${field({ label: 'Account at least (days old)', name: 'auto_payout_min_age_days', type: 'number', value: v('auto_payout_min_age_days', 7), attrs: 'min="0"' })}</div></div>
  <div class="sgrp"><h3>Players and site</h3>
    <div class="two">${field({ label: 'Starter boosters', name: 'starter_boosters', type: 'number', value: v('starter_boosters', 3), attrs: 'min="0"' })}${field({ label: 'Sign-ups per referral booster', name: 'referral_batch', type: 'number', value: v('referral_batch', 10), attrs: 'min="1"' })}</div>
    ${check({ name: 'voice_on', label: '<b>Live voice in games</b> (only Nepo babies in the top of a pool can talk)', checked: st.voice_on !== '0' })}
    ${field({ label: 'Voice: how many top Nepo babies can talk', name: 'voice_top_n', type: 'number', value: v('voice_top_n', 3), attrs: 'min="1" max="10"' })}
    ${check({ name: 'signups_paused', label: '<b>Pause sign-ups</b> (new accounts can’t be made until you switch this off)', checked: st.signups_paused === '1' })}
    ${field({ label: 'Alert emails (comma separated)', name: 'alert_email', type: 'email', value: st.alert_email || '', placeholder: 'you@yourcompany.com', hint: 'System health alerts go here.' })}
    ${check({ name: 'landing_demo_pools', label: 'Show sample sponsored pools on the landing page (turn off once real sponsors are live)', checked: st.landing_demo_pools === '1' })}</div>
  <div class="sgrp"><h3>Community and socials</h3>
    ${field({ label: 'WhatsApp community link', name: 'whatsapp_community', value: st.whatsapp_community || '', placeholder: 'https://chat.whatsapp.com/…', attrs: 'inputmode="url" autocomplete="off"', hint: 'Shows as “Join our WhatsApp community” on players’ profiles and the menu. Empty = hidden.' })}
    <div class="three">${field({ label: 'X (Twitter)', name: 'social_twitter', value: st.social_twitter || '', placeholder: 'https://x.com/tapammm', attrs: 'inputmode="url" autocomplete="off"' })}${field({ label: 'Instagram', name: 'social_instagram', value: st.social_instagram || '', placeholder: 'https://instagram.com/tapammm', attrs: 'inputmode="url" autocomplete="off"' })}${field({ label: 'TikTok', name: 'social_tiktok', value: st.social_tiktok || '', placeholder: 'https://tiktok.com/@tapammm', attrs: 'inputmode="url" autocomplete="off"' })}</div>
    <p class="ta-hint" style="margin:0">These show in the menu and on the home page. Leave a box empty to hide that link.</p></div>`, { submit: 'Save settings' })}</div>
<h2 class="h2">Recent admin actions</h2>${audit.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>When</th><th>Action</th><th>Detail</th></tr></thead><tbody>${audit.map(a => `<tr><td>${esc(lagos(a.created_at))}</td><td>${esc(a.action)}</td><td class="small" style="max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.detail || '')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Nothing yet.</div>'}`;
  return page(ctx, 'Admin', '/admin', body, { css: ADMIN_CSS });
}

// ── system health ───────────────────────────────────────────────────────────
// Server load: how busy and how fast the worker is (sampled), with what to do as Tap Am grows.
function loadPanel(load) {
  if (!load) return '';
  const hs = load.hours || [], last = hs[hs.length - 1] || {}, prev = hs.slice(-2)[0] || {};
  const cur = (last.req_n || 0) >= (prev.req_n || 0) * 0.3 ? last : prev;   // the current hour may have just begun
  const n = cur.req_n || 0, avg = n ? Math.round((cur.req_ms || 0) / n) : 0, slow = n ? (cur.req_slow || 0) / n : 0, err = n ? (cur.req_5xx || 0) / n : 0, perMin = Math.round(n / 60);
  const level = err > 0.05 || avg > 1500 || slow > 0.2 || load.dbMs > 400 ? 'crit' : err > 0.01 || avg > 600 || slow > 0.05 || load.dbMs > 150 || perMin > 3000 ? 'warn' : 'ok';
  const word = { ok: 'Calm — the server is coping well', warn: 'Busy — keep an eye on it', crit: 'Overloaded — act now' }[level];
  const max = Math.max(1, ...hs.map(h => h.req_n || 0));
  const bars = hs.map(h => { const a = h.req_n ? Math.round(h.req_ms / h.req_n) : 0; return `<i title="${esc(h.hour.slice(5).replace('T', ' '))}:00 · about ${short(h.req_n || 0)} requests · ${a} ms" style="height:${Math.max(3, Math.round((h.req_n || 0) / max * 100))}%;background:${a > 1500 ? 'var(--danger)' : a > 600 ? 'var(--sunny)' : 'var(--green)'}"></i>`; }).join('');
  const todo = level === 'crit' ? ['Pause new pools for a short while: Admin → Overview → “Server problem” (players keep their money and scores).', 'Open Cloudflare → Workers & Pages → tapammm-live → Metrics and Logs to see which pages are slow or failing.', 'If the database is the slow part (database round trip above 400 ms), turn on D1 read replication and move hot reads (top lists, home page) to Workers KV.', 'If the worker hits its CPU limit, raise it in the worker settings (Workers Paid allows up to 5 minutes per request) and check Durable Object usage.']
    : level === 'warn' ? ['Check Cloudflare → Workers & Pages → tapammm-live → Metrics for errors and CPU time.', 'Big pools are coming? Schedule them, so players join over time instead of all at once.', 'Keep the Workers Paid plan on (the free plan stops at 100,000 requests a day).'] : [];
  return `<h2 class="h2">Server load</h2><div class="panel">
  <div class="row wrap" style="justify-content:flex-start;gap:10px"><span class="lvl ${level}"></span><b style="font:900 20px var(--display);color:var(--ink)">${word}</b></div>
  <div class="grid g2 g4" style="margin-top:12px">
    <div class="panel stat" style="box-shadow:none;background:var(--cloud)"><span class="k">Requests / minute</span><span class="v">${short(perMin)}</span></div>
    <div class="panel stat" style="box-shadow:none;background:var(--cloud)"><span class="k">Average response</span><span class="v">${avg} ms</span></div>
    <div class="panel stat" style="box-shadow:none;background:var(--cloud)"><span class="k">Database round trip</span><span class="v">${load.dbMs} ms</span></div>
    <div class="panel stat" style="box-shadow:none;background:var(--cloud)"><span class="k">Online now</span><span class="v">${short(load.online)}</span></div></div>
  <p class="small" style="margin:10px 0 4px;color:#000">Slow requests (over 1.5 s): <b>${Math.round(slow * 100)}%</b> · server errors: <b>${(err * 100).toFixed(1)}%</b> · last 24 hours, by hour (estimated from 1 in 20 requests):</p>
  <div class="loadbars" aria-hidden="true">${bars || '<span class="small muted">No data yet — it fills in as people use the site.</span>'}</div>
  ${todo.length ? `<div class="note" style="margin-top:12px"><b>What to do now</b><ul style="margin:6px 0 0;padding-left:18px">${todo.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
  <details style="margin-top:12px"><summary style="cursor:pointer;font-weight:800">How to grow Tap Am’s servers (add or move services)</summary><ol class="small" style="margin:8px 0 0;padding-left:20px;display:grid;gap:6px;color:#000">
    <li><b>Workers Paid</b> (already needed): 10 million requests a month included; more is billed per million. Nothing to move.</li>
    <li><b>Picture storage — R2:</b> switch on R2 in the Cloudflare dashboard (free up to 10 GB). Then pictures move out of the database: create the bucket “tapammm-media” and add the MEDIA binding to the worker.</li>
    <li><b>Faster reads — D1 read replication:</b> in Cloudflare → D1 → tapammm-live → Settings, turn on read replication. Home, top lists and pool lists then read from a copy near each player.</li>
    <li><b>Caching — Workers KV:</b> top tappers, top winners and site counters are already cached for 10–60 seconds per server. For millions of players, move these caches to KV so every server shares them.</li>
    <li><b>Emails — Queues:</b> email jobs run every 5 minutes in batches of 150. For bigger sends, move them to Cloudflare Queues, and finish ZeptoMail’s customer validation to lift the daily limit.</li>
    <li><b>Database bigger than 10 GB:</b> archive finished pools and old notifications, split tap stats into a second D1 database, or move to Postgres through Hyperdrive.</li>
    <li><b>Live games:</b> each pool runs in its own Durable Object, so many games at once already scale out. Very big single pools (100,000+ players) need the tap batching to stay on.</li>
  </ol></details>
</div>`;
}
export function adminHealth(ctx) {
  const { checks, metrics, alerts, dbBytes, usage, settings: st } = ctx;
  const gb = n => (n / 1e9).toFixed(n > 1e9 ? 2 : 3) + ' GB';
  const body = `<h1 class="h1">System health</h1><p class="sub">Checked every 15 minutes. Problems are emailed to ${st.alert_email ? `<b style="color:#fff">${esc(st.alert_email)}</b>` : 'nobody yet — add an alert email in settings'}.</p>
<div class="panel"><div class="hl">${checks.map(c => `<div class="item" style="box-shadow:none;padding:8px 2px"><span class="lvl ${c.level}"></span><div class="grow"><div class="t" style="white-space:normal">${esc(c.title)}</div><div class="s" style="white-space:normal">${esc(c.detail)}</div>${c.action ? `<div class="small" style="margin-top:4px;font-weight:700;color:var(--ink)">Do this: ${esc(c.action)}</div>` : ''}</div></div>`).join('')}</div>
<div class="actions">${postBtn('/api/admin/health/test-email', 'Send a test alert email')}</div></div>
${loadPanel(ctx.load)}
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
<details class="panel" style="margin-bottom:12px"><summary style="cursor:pointer;font:900 18px var(--display)">Recovery phrases backup (CSV)</summary>
  <p class="small muted" style="margin:10px 0">Every player’s 12-word recovery phrase. <b>Anybody with this file can take over any account</b>: download it only on your own device, store it offline (encrypted drive or printed in a safe), and delete it from Downloads. Each download is logged.</p>
  <form method="post" class="row" id="phr" style="gap:8px;flex-wrap:wrap" novalidate><input class="ta-input" style="flex:1;min-width:180px" type="password" name="password" autocomplete="current-password" placeholder="Your admin password" aria-label="Your admin password"><button class="btn btn--danger btn--sm" type="submit">Download CSV</button></form>
</details>
<form class="row" method="get" action="/admin/users" style="gap:8px;margin-bottom:12px"><input class="ta-input" name="q" value="${esc(q)}" placeholder="Search nickname or email" aria-label="Search users"><button class="btn btn--green" type="submit">Search</button></form>
<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nickname</th><th>Type</th><th>Status</th><th>Taps</th><th>Games</th><th>Wins</th><th>Rank</th><th>Wallet</th><th>Winnings</th><th>Country</th><th>Joined</th></tr></thead><tbody>
${users.map(u => `<tr><td><a href="/admin/users/${esc(u.id)}" style="color:#000;font-weight:800">${esc(u.username)}</a>${u.inner_circle ? ' <span class="badge nepo">Inner circle</span>' : ''}<div class="small" style="color:#000">${esc(u.email || '')}${u.whatsapp ? ' · ' + esc(u.whatsapp) : ''}</div></td><td>${tierBadge(roleLabel(u))}</td><td>${u.status === 'ACTIVE' ? 'Active' : `<span class="badge red">${esc(u.status.toLowerCase())}</span>`}</td><td>${short(u.lifetime_taps)}</td><td>${u.games_played}</td><td>${u.wins}</td><td>${u.rank_level}</td><td>${esc(naira(u.balance_kobo))}</td><td>${esc(naira(u.winnings_kobo))}</td><td>${esc(u.country || '—')}</td><td>${esc(lagos(u.created_at, { hour: undefined, minute: undefined }))}</td></tr>`).join('') || '<tr><td colspan="11">No users found.</td></tr>'}
</tbody></table></div>${pager(`/admin/users${q ? '?q=' + encodeURIComponent(q) : ''}`, pg, hasNext)}`;
  const script = `var f=document.getElementById('phr');if(f)f.addEventListener('submit',function(e){e.preventDefault();var b=f.querySelector('button');b.classList.add('is-loading');
fetch('/api/admin/phrases/export',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({password:f.password.value})}).then(function(r){b.classList.remove('is-loading');f.password.value='';
 if(!r.ok)return r.json().then(function(j){TA.toast(j.error||'Download failed','err');});return r.blob().then(function(bl){var a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download='tap-am-recovery-phrases.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},2000);});});});`;
  return page(ctx, 'Users', '/admin/users', body, { script });
}

export function adminUser(ctx) {
  const { target: u, wallet, inv, items, entries, rankName, profile, flags } = ctx;
  const self = u.id === ctx.user.id;
  const body = `<h1 class="h1">${nameTag(u.username, u.emoji)}</h1>
<div class="row wrap" style="margin:-4px 2px 14px;justify-content:flex-start;gap:8px">${tierBadge(roleLabel(u))}<span class="small" style="color:var(--muted)">${esc(u.email || '')}${u.whatsapp ? ` · WhatsApp <a href="https://wa.me/${esc(u.whatsapp.replace('+', ''))}" target="_blank" rel="noopener" style="color:var(--green);font-weight:800">${esc(u.whatsapp)}</a>` : ''} · ${esc(u.gender || '')} ${esc(u.country || '')} · joined ${esc(lagos(u.created_at))}${u.adult_confirmed_at ? ' · 18+ confirmed' : ''}</span></div>
<div class="grid g2 g4"><div class="panel stat"><span class="k">Lifetime taps</span><span class="v">${short(u.lifetime_taps)}</span></div><div class="panel stat"><span class="k">Games / wins</span><span class="v">${u.games_played} / ${u.wins}</span></div><div class="panel stat"><span class="k">Wallet</span><span class="v">${esc(naira(wallet.balance_kobo))}</span></div><div class="panel stat"><span class="k">Winnings</span><span class="v">${esc(naira(wallet.winnings_kobo))}</span></div></div>
<p class="small" style="color:var(--muted)">Rank ${u.rank_level}: ${esc(rankName)}${u.tier_until ? ` · ${esc(tierName(u.tier))} till ${esc(lagos(u.tier_until))}` : ''}${u.referral_count ? ` · ${u.referral_count} referrals` : ''}${u.status !== 'ACTIVE' ? ` · <b style="color:#fff">${esc(u.status)}</b>` : ''}</p>
${flags ? `<div class="panel" style="box-shadow:0 0 0 3px var(--sunny),var(--sh)"><b>${flags} anti-cheat flag${flags === 1 ? '' : 's'}</b> — taps faster than their tier allows were dropped in some games. Check before paying out.</div>` : ''}
${self ? '' : `<div class="actions">${u.status === 'ACTIVE' ? postBtn(`/api/admin/users/${u.id}/status`, 'Suspend', { body: { status: 'SUSPENDED' }, confirm: `Suspend ${u.username}? They will be logged out.`, cls: 'btn--danger btn--sm' }) : postBtn(`/api/admin/users/${u.id}/status`, 'Re-activate', { body: { status: 'ACTIVE' }, cls: 'btn--green btn--sm' })}
${u.role === 'USER' ? postBtn(`/api/admin/users/${u.id}/tier`, 'Give Mapo (1 month)', { body: { tier: 'MAPO', plan: 'month' } }) + postBtn(`/api/admin/users/${u.id}/tier`, 'Give Nepo (1 month)', { body: { tier: 'NEPO', plan: 'month' } }) + postBtn(`/api/admin/users/${u.id}/tier`, 'Give Nepo (1 year)', { body: { tier: 'NEPO', plan: 'year' } }) + postBtn(`/api/admin/users/${u.id}/tier`, 'Make Lapo', { body: { tier: 'LAPO' }, confirm: 'Remove the paid tier from this player?' }) : ''}
${u.role === 'USER' ? postBtn(`/api/admin/users/${u.id}/inner`, u.inner_circle ? 'Remove from inner circle' : 'Add to inner circle', { body: { on: !u.inner_circle }, cls: u.inner_circle ? 'btn--soft btn--sm' : 'btn--gold btn--sm', confirm: u.inner_circle ? `Remove ${u.username} from the inner circle?` : `Add ${u.username} to the inner circle? They get a notification with the rules.` }) : ''}
${u.role === 'SPONSOR' && profile ? postBtn(`/api/admin/sponsors/${u.id}/leads`, profile.lead_capture ? 'Turn lead capture OFF' : 'Turn lead capture ON', { body: { on: !profile.lead_capture }, cls: 'btn--gold btn--sm', confirm: profile.lead_capture ? 'Stop collecting leads for this sponsor?' : 'Let this sponsor collect player details (with consent) from their ads?' }) : ''}</div>`}
<div class="grid g2m" style="margin-top:14px">
  <div class="panel"><h2 class="h2" style="margin-top:0;color:var(--ink);text-shadow:none">Gift</h2>${form(`/api/admin/users/${u.id}/gift`, `
    ${select({ label: 'Booster or skin', name: 'item', options: items.map(i => [i.id, `${i.name} (${i.kind.toLowerCase()}${i.audience !== 'ALL' ? ', ' + i.audience.toLowerCase() : ''})`]) })}
    ${field({ label: 'How many', name: 'qty', type: 'number', value: '1', attrs: 'min="1" max="1000"' })}
    ${check({ name: 'email', label: 'Also send it as an email' })}`, { submit: 'Send gift' })}</div>
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
  ${check({ name: 'email', label: 'Also send it as an email (sent in batches over the next minutes)' })}
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
${pools.map(p => `<tr><td><a href="/pool/${esc(p.id)}">${esc(p.name)}</a><div class="small muted">${esc(p.code)}${p.creator ? ' · by ' + esc(p.creator) : ''}</div></td><td>${p.instant ? '⚡ instant · ' : ''}${esc(p.kind.toLowerCase())}${p.audience !== 'ALL' ? ' · ' + esc(p.audience.toLowerCase()) : ''}${p.private ? ' · private' : ''}${p.gameType === 'MATCH' ? ' · VS' : ''}${p.promoId ? ' · ad' : ''}</td><td>${p.paused ? '<span class="badge red">Paused</span>' : stateBadge(p.state)}${p.settled ? ' <span class="small muted">paid</span>' : ''}${p.lapoRules ? ' <span class="small muted">Lapo rules</span>' : ''}</td><td>${short(p.players)}</td><td>${esc(naira(p.prize))}</td><td>${p.entryFee ? esc(naira(p.entryFee)) : 'Free'}</td><td>${p.state === 'waiting' ? `${short(p.players)}/${short(p.maxPlayers)} joined<div class="small muted">runs ${esc(fmtDur(p.duration))} when full</div>` : esc(lagos(p.endsAt))}</td>
<td style="white-space:nowrap">${!p.paused && ['live', 'soon', 'waiting'].includes(p.state) ? [5, 30].map(m => postBtn(`/api/admin/pools/${p.id}/extend`, `+${m} min`, { body: { minutes: m }, cls: 'btn--soft btn--sm' })).join('') : ''}${p.paused ? postBtn(`/api/admin/pools/${p.id}/restart`, 'Restart in 10 min', { cls: 'btn--green btn--sm', body: { minutes: 10 } }) : (p.state === 'live' || p.state === 'soon') ? postBtn(`/api/admin/pools/${p.id}/pause`, 'Pause + refund', { cls: 'btn--gold btn--sm', confirm: `Pause “${p.name}”? Everybody gets back the money and boosters they put into it, and they join again when you restart it.` }) : ''}${p.state === 'ended' && !p.settled ? postBtn(`/api/admin/pools/${p.id}/settle`, 'Pay out', { cls: 'btn--green btn--sm' }) : ''}${!p.settled && p.state !== 'cancelled' ? postBtn(`/api/admin/pools/${p.id}/cancel`, 'Cancel', { confirm: `Cancel “${p.name}” and refund every entry fee?`, cls: 'btn--danger btn--sm' }) : ''}</td></tr>`).join('') || '<tr><td colspan="8">No pools.</td></tr>'}
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
  const mine = ads.filter(a => a.owner_role === 'ADMIN'), theirs = ads.filter(a => a.owner_role !== 'ADMIN');
  const waiting = theirs.filter(a => !a.approved && !a.reject_reason), rejected = theirs.filter(a => !a.approved && a.reject_reason);
  const running = mine.find(a => a.active && a.approved);
  const body = `<h1 class="h1">Ads</h1><p class="sub">Ads only show in pools made by you or by a sponsor — never in players’ pools. Each ad shows before the game (finishing before the first tap), to players who join late, and before results.</p>
<h2 class="h2" style="margin-top:0">Your Tap Am ads</h2>
<div class="note" style="margin-bottom:10px">${running ? `<b>Running now:</b> “${esc(running.title)}”. It shows in every pool you make (unless you pick another ad or “No ad” for that pool).` : '<b>No Tap Am ad is running.</b> Switch one on below — only one runs at a time.'}</div>
${adList(mine, { admin: true, own: true })}
<h2 class="h2">Create a Tap Am ad</h2><div class="panel">${adForm([], { admin: true })}</div>
<h2 class="h2">Sponsor ads waiting approval (${waiting.length})</h2>${waiting.length ? adList(waiting, { admin: true }) : '<div class="empty" style="margin-bottom:6px">No ads waiting for approval.</div>'}
<h2 class="h2">Sponsor ads</h2><p class="sub">Sponsors pick one of their ads for each pool they make. You can pause or delete any of them (the sponsor is told).</p>${adList(theirs.filter(a => a.approved), { admin: true })}
${rejected.length ? `<h2 class="h2">Rejected (${rejected.length})</h2>${adList(rejected, { admin: true })}` : ''}
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

// ── top winnings + top funded accounts ──────────────────────────────────────
export function adminMoney(ctx) {
  const { period, winners, funded, paystack: ps = { total: 0, n: 0, payers: 0, by: [], days: [], recent: [] } } = ctx;
  const tabsP = [['DAY', 'Today'], ['WEEK', 'This week'], ['MONTH', 'This month'], ['YEAR', 'This year'], ['ALL', 'All time']];
  const PURPOSE = { FUND: 'Wallet top-ups', SPONSOR_FUND: 'Sponsor wallet top-ups', MAPO_MONTH: 'Mapo monthly', MAPO_YEAR: 'Mapo yearly', NEPO_MONTH: 'Nepo monthly', NEPO_YEAR: 'Nepo yearly' };
  const maxDay = Math.max(1, ...ps.days.map(d => Number(d.total)));
  const body = `<h1 class="h1">Money</h1><p class="sub">Money that came in through Paystack (confirmed payments only), who won the most and who put the most in, for the period you pick (Lagos time).</p>
<nav class="tabs">${tabsP.map(([k, l]) => `<a href="/admin/money?p=${k}" ${k === period ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
<h2 class="h2" style="margin-top:0">Money in from Paystack</h2>
<div class="grid g2 g4">
  <div class="tcard card c-green" style="padding:14px"><div class="stat"><span class="k">Received</span><span class="v">${esc(nairaShort(ps.total))}</span></div></div>
  <div class="tcard card c-sky" style="padding:14px"><div class="stat"><span class="k">Payments</span><span class="v">${short(ps.n)}</span></div></div>
  <div class="tcard card c-purple" style="padding:14px"><div class="stat"><span class="k">People who paid</span><span class="v">${short(ps.payers)}</span></div></div>
  <div class="tcard card c-orange" style="padding:14px"><div class="stat"><span class="k">Average payment</span><span class="v">${esc(nairaShort(ps.n ? Math.round(ps.total / ps.n) : 0))}</span></div></div>
</div>
${ps.by.length ? `<div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th>What for</th><th>Amount</th><th>Payments</th></tr></thead><tbody>${ps.by.map(r => `<tr><td>${esc(PURPOSE[r.purpose] || r.purpose)}</td><td><b>${esc(naira(r.total))}</b></td><td>${r.n}</td></tr>`).join('')}</tbody></table></div>` : ''}
<h3 style="margin:16px 0 8px;font:900 18px var(--display);color:#fff">Last 14 days</h3>
${ps.days.length ? `<div class="panel" style="display:grid;gap:6px">${ps.days.map(d => `<div style="display:grid;grid-template-columns:96px 1fr 110px;gap:10px;align-items:center;font:700 13px var(--body)"><span>${esc(d.d)}</span><span style="height:12px;border-radius:99px;background:var(--cloud);overflow:hidden"><i style="display:block;height:100%;width:${Math.max(2, Math.round(Number(d.total) / maxDay * 100))}%;background:var(--green-d)"></i></span><b style="text-align:right">${esc(naira(d.total))}</b></div>`).join('')}</div>` : '<div class="empty">No Paystack payments in the last 14 days.</div>'}
<h3 style="margin:16px 0 8px;font:900 18px var(--display);color:#fff">Latest payments</h3>
${ps.recent.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>When</th><th>Who</th><th>What for</th><th>Amount</th><th>Reference</th></tr></thead><tbody>${ps.recent.map(r => `<tr><td>${esc(lagos(r.at))}</td><td>${r.uid ? `<a href="/admin/users/${esc(r.uid)}" style="color:#000;font-weight:800">${esc(r.username)}</a>` : '—'}</td><td>${esc(PURPOSE[r.purpose] || r.purpose)}</td><td><b>${esc(naira(r.amount_kobo))}</b></td><td class="small">${esc(r.reference)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No confirmed payments yet.</div>'}
<h2 class="h2" style="margin-top:0">Top winnings</h2>${winners.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Player</th><th>Won</th><th>Prizes</th></tr></thead><tbody>${winners.map(w => `<tr><td>${w.pos}</td><td><a href="/admin/users/${esc(w.id)}">${esc(w.username)}</a></td><td><b>${esc(naira(w.won))}</b></td><td>${w.prizes}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No prizes paid in this period.</div>'}
<h2 class="h2">Top funded accounts</h2>${funded.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Account</th><th>Type</th><th>Added</th><th>Times</th></tr></thead><tbody>${funded.map((f, i) => `<tr><td>${i + 1}</td><td><a href="/admin/users/${esc(f.id)}">${esc(f.username)}</a></td><td>${f.role === 'SPONSOR' ? 'Sponsor' : 'Player'}</td><td><b>${esc(naira(f.funded))}</b></td><td>${f.times}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Nobody added money in this period.</div>'}`;
  return page(ctx, 'Top money', '/admin/money', body, { css: ADMIN_CSS });
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
  <td style="white-space:nowrap">${w.status === 'PENDING' ? `${paystack ? postBtn(`/api/admin/withdrawals/${w.id}/transfer`, 'Send via ' + paystack, { cls: 'btn--green btn--sm', confirm: `Send ${naira(w.amount_kobo)} to ${w.account_name || w.account_number} now?` }) : ''}${postBtn(`/api/admin/withdrawals/${w.id}/paid`, 'Mark paid', { confirm: 'Only mark paid if you sent the money yourself. Continue?' })}<form class="rejform" data-api="/api/admin/withdrawals/${esc(w.id)}/reject" novalidate><div class="ta-field"><input class="ta-input" name="note" maxlength="200" placeholder="Reason (the player sees it)" aria-label="Reason for rejecting"><p class="ta-error" data-err="note"></p></div><button class="btn btn--danger btn--sm" type="submit">Reject + refund</button></form>` : ''}</td></tr>`;
  const table = list => `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Player</th><th>Amount</th><th>Bank</th><th>Asked</th><th>Status</th><th></th></tr></thead><tbody>${list.map(row).join('') || '<tr><td colspan="6">Nothing here.</td></tr>'}</tbody></table></div>`;
  const body = `<div class="headrow"><h1 class="h1">Payouts</h1><a class="btn btn--white btn--sm" href="/admin/withdrawals.csv" data-no-swap download>CSV for bank upload</a></div>
<p class="sub">${paystack ? (auto ? 'Automatic payouts are <b style="color:#fff">ON</b>: small requests from older accounts with no cheating flags are paid every 5 minutes. Everything else waits here.' : 'Automatic payouts are off (turn on in Overview, Settings).') : 'No payment gateway is connected, so pay manually (download the CSV for your bank) and then press “Mark paid”.'}</p>
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
<form method="post" class="form" data-api="/api/setup-admin" novalidate style="display:grid;gap:12px">
${['setupKey:Setup key:password', 'username:Nickname:text', 'email:Email:email', 'password:Password (10+ characters):password'].map(x => { const [n, l, t] = x.split(':'); return `<div class="ta-field"><label class="ta-label" for="s-${n}">${l}</label><input class="ta-input" id="s-${n}" name="${n}" type="${t}" required autocomplete="${n === 'password' ? 'new-password' : 'off'}"><p class="ta-error" data-err="${n}"></p></div>`; }).join('')}
<div class="ta-msg" role="alert"></div><button class="btn btn--green btn--block" type="submit">Create admin</button></form></div></main>`;
  return themeShell({ title: 'Admin setup', body });
}

// ── suggest (public) ────────────────────────────────────────────────────────
export function suggestPage(user) {
  const body = `<main class="ta-page"><a class="ta-logo" href="/" style="width:120px">${LOGO_IMG()}</a><div class="ta-card">
<a href="${user ? '/dashboard' : '/'}" data-back style="color:var(--ink);font-weight:700">Back</a>
<h1 style="margin:10px 0 6px;font:900 32px/1 var(--display)">Suggest something</h1><p class="ta-note" style="margin:0 0 16px">Wetin we fit add or fix? We dey read everything.${user ? ' Want a special pool? <a href="/suggest-pool">Suggest a pool</a>.' : ''}</p>
<form method="post" class="form" data-api="/api/suggestions" data-reset novalidate style="display:grid;gap:12px">
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
    <form method="post" class="form" data-api="/api/admin/login" novalidate style="display:grid;gap:12px">
      <div class="ta-field"><label class="ta-label" for="a-id">Nickname or email</label><input class="ta-input" id="a-id" name="identifier" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="254" required><p class="ta-error" data-err="identifier"></p></div>
      <div class="ta-field"><label class="ta-label" for="a-pw">Password</label><input class="ta-input" id="a-pw" name="password" type="password" autocomplete="current-password" maxlength="128" required><p class="ta-error" data-err="password"></p></div>
      <div class="ta-msg" role="alert"></div>
      <button class="btn btn--block" type="submit">Enter admin</button>
    </form>
    <p class="ta-note" style="margin:14px 0 0">Forgot your password? <a href="/login#reset-email">Get a reset code by email</a> (sent to the admin email address).</p>
  </div>
  <p style="text-align:center;margin-top:14px"><a href="/" style="color:#fff">Back to Tap Am</a></p>
</main>`;
  return themeShell({ title: 'Admin login', body, bodyClass: 'bg-anim', css: '.badge{display:inline-flex;padding:5px 10px;border-radius:999px;font:800 12px var(--body)}.badge.red{background:var(--danger);color:#fff}' });
}

// ── errors: what happened, when, where, and what to do ─────────────────────
export function adminErrors(ctx) {
  const { rows, page: pg, hasNext, counts } = ctx;
  const body = `<div class="headrow"><h1 class="h1">Errors</h1>${rows.length ? postBtn('/api/admin/errors/clear', 'Clear all', { cls: 'btn--white btn--sm', confirm: 'Clear the whole error log?' }) : ''}</div>
<p class="sub">Every server error is recorded here with when it happened, where, the details and what to do about it. Last 24 hours: <b>${short(counts.day)}</b> · last 7 days: <b>${short(counts.week)}</b>.</p>
${rows.length ? `<div class="tbl-wrap errs"><table class="tbl"><thead><tr><th>When (Lagos)</th><th>Where</th><th>What happened</th><th>What to do</th></tr></thead><tbody>
${rows.map(r => `<tr><td style="white-space:nowrap">${esc(lagos(r.created_at))}</td><td>${esc(r.area)}</td><td><b>${esc(r.message)}</b><details><summary>Details</summary><pre>${esc(r.detail || '')}${r.stack ? '\n\n' + esc(r.stack) : ''}</pre></details></td><td>${esc(r.hint || '')}</td></tr>`).join('')}
</tbody></table></div>${pager('/admin/errors', pg, hasNext)}` : '<div class="empty">No errors recorded. 🎉</div>'}`;
  return page(ctx, 'Errors', '/admin/errors', body, { css: ADMIN_CSS });
}

// ── announcements and emails ────────────────────────────────────────────────
export function adminMessages(ctx) {
  const { recent, pools, jobs, emailOn, marketingOn } = ctx;
  const body = `<h1 class="h1">Announce</h1>
${emailOn ? '' : '<div class="panel" style="margin-bottom:12px;background:var(--sunny)"><b>Email is not connected yet.</b> Notifications and pop-ups work now; emails will be skipped until ZEPTOMAIL_TOKEN is added to the worker.</div>'}
<h2 class="h2">Make an announcement</h2><div class="panel">${form('/api/admin/announcements', `
  ${field({ label: 'Title', name: 'title', placeholder: 'Big Friday tournament!', attrs: 'maxlength="90" required' })}
  <div class="ta-field" data-field="body"><label class="ta-label" for="f-body">Message</label><textarea class="ta-input" id="f-body" name="body" rows="4" maxlength="2000" placeholder="What players should know" required></textarea><p class="ta-error" data-err="body"></p></div>
  ${field({ label: 'Link (optional)', name: 'link', placeholder: '/pools or https://…', attrs: 'maxlength="300" autocomplete="off"' })}
  ${choice({ label: 'Who gets it', name: 'audience', options: [['ALL', 'Everybody'], ['PLAYERS', 'All players'], ['LAPO', 'Lapo'], ['MAPO', 'Mapo'], ['NEPO', 'Nepo'], ['SPONSORS', 'Sponsors']], value: 'ALL', cls: 'wrap4' })}
  ${check({ name: 'overlay', label: '<b>Also show it as a pop-up</b> the next time they open Tap Am (never during a game)' })}
  <div class="two">${select({ label: 'Also email it', name: 'email', options: [['NO', 'No email'], ...(marketingOn ? [['NEWS', 'Yes — to people who said yes to news']] : []), ['SERVICE', 'Yes — to every account (service news only)']], value: 'NO' })}${field({ label: 'Pop-up shows for (days)', name: 'days', type: 'number', value: '3', attrs: 'min="1" max="30"' })}</div>
  <p class="ta-hint" style="margin:0">Use “every account” only for important account or service news (like a server problem). Offers and promotions go only to people who said yes.</p>`, { submit: 'Send announcement', shine: true })}</div>
<h2 class="h2">Email a pool to players</h2><div class="panel">${!marketingOn ? '<p class="muted" style="margin:0">Off for now: pool news is marketing, and ZeptoMail allows account emails only. Connect a marketing email service, then switch on “Marketing emails” in settings.</p>' : pools.length ? form('/api/admin/email-pool', `
  ${select({ label: 'Pool', name: 'pool', options: pools.map(p => [p.id, `${p.name}${p.sponsor_name ? ' · ' + p.sponsor_name : ''}`]) })}
  ${choice({ label: 'Players', name: 'audience', options: [['ALL', 'Everybody'], ['LAPO', 'Lapo'], ['MAPO', 'Mapo'], ['NEPO', 'Nepo']], value: 'ALL', cls: 'wrap4' })}
  <p class="ta-hint" style="margin:0">Sent from no-reply@tapammm.live to players who said yes to pool news, with a one-click “stop these emails” link. Free for Tap Am.</p>`, { submit: 'Email this pool' }) : '<p class="muted" style="margin:0">No open pools to email right now.</p>'}</div>
${jobs.length ? `<h2 class="h2">Emails going out</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>What</th><th>Status</th><th>Sent</th><th>Started</th></tr></thead><tbody>${jobs.map(j => `<tr><td>${esc(j.what)}</td><td>${esc(j.status.toLowerCase())}</td><td>${short(j.sent)}</td><td>${esc(lagos(j.created_at))}</td></tr>`).join('')}</tbody></table></div>` : ''}
<h2 class="h2">Recent announcements</h2>${recent.length ? `<div class="list">${recent.map(a => `<div class="item"><div class="grow"><div class="t" style="font-size:16px">${esc(a.title)}</div><div class="s">${esc(lagos(a.created_at))} · ${esc(a.audience.toLowerCase())}${a.overlay ? ' · pop-up' + (a.active ? '' : ' (stopped)') : ''}${a.email !== 'NO' ? ' · email' : ''}</div></div>${a.overlay && a.active ? postBtn(`/api/admin/announcements/${a.id}/stop`, 'Stop pop-up', { cls: 'btn--soft btn--sm' }) : ''}</div>`).join('')}</div>` : '<div class="empty">No announcements yet.</div>'}`;
  return page(ctx, 'Announce', '/admin/messages', body, { css: ADMIN_CSS });
}

// ── inner circle ────────────────────────────────────────────────────────────
export function adminInnerCircle(ctx) {
  const { list, open, invitees, rules, isDefault } = ctx;
  const n = k => esc(naira(k || 0));
  const body = `<h1 class="h1">Inner circle</h1><p class="sub">Players you trust to bring people in. Give the role from a player’s page (Users → player → “Add to inner circle”). Members see what the people they brought have spent — never their wallets. Perks (free boosters, Mapo / Nepo status) are given from the player’s page.</p>
${list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Member</th><th>Invites</th><th>Invitees’ wallets</th><th>Invitees spent</th><th>Since</th><th></th></tr></thead><tbody>
${list.map(m => `<tr><td><a href="/admin/users/${esc(m.id)}" style="color:#000;font-weight:800">${esc(m.username)}</a><div class="small" style="color:#000">${esc(m.email || '')}${m.whatsapp ? ' · ' + esc(m.whatsapp) : ''}</div></td><td><b>${short(m.invites)}</b></td><td>${n(m.wallets)}</td><td><b>${n(m.spent)}</b></td><td class="small">${m.inner_circle_at ? esc(lagos(m.inner_circle_at)) : ''}</td><td><a class="btn btn--soft btn--sm" href="/admin/inner-circle?m=${esc(m.id)}#who">People</a></td></tr>`).join('')}
</tbody></table></div>` : '<div class="empty">Nobody in the inner circle yet.</div>'}
${open ? `<h2 class="h2" id="who">People ${esc(open.username)} brought (${invitees.length})</h2>${invitees.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Player</th><th>Wallet</th><th>Winnings</th><th>Spent</th><th>Joined</th></tr></thead><tbody>
${invitees.map(i => `<tr><td><a href="/admin/users/${esc(i.id)}" style="color:#000;font-weight:800">${esc(i.username)}</a>${i.status !== 'ACTIVE' ? ` <span class="badge red">${esc(i.status.toLowerCase())}</span>` : ''}</td><td>${n(i.wallet)}</td><td>${n(i.winnings)}</td><td><b>${n(i.spent)}</b></td><td class="small">${esc(lagos(i.created_at))}</td></tr>`).join('')}
</tbody></table></div>` : '<div class="empty">Nobody yet.</div>'}` : ''}
<h2 class="h2">Rules</h2><div class="panel">
  <p class="small muted" style="margin:0 0 10px">Members read these at <b>/inner-circle</b> (only members and you can open it). ${isDefault ? 'These are the default rules — edit and save to change them.' : 'Empty the box and save to go back to the default rules.'}</p>
  ${form('/api/admin/inner-circle/rules', `<div class="ta-field"><label class="ta-label" for="f-rules">Rules</label><textarea class="ta-input" id="f-rules" name="rules" rows="14" maxlength="6000">${esc(rules)}</textarea><p class="ta-error" data-err="rules"></p></div>`, { submit: 'Save rules' })}
  <div class="actions"><a class="btn btn--white btn--sm" href="/inner-circle" target="_blank" rel="noopener">Open the rules page</a>${copyBtn((ctx.origin || '') + '/inner-circle', 'Copy link')}</div>
  ${form('/api/admin/inner-circle/send', check({ name: 'email', label: 'Also email the link to every member' }), { submit: 'Send rules to all members', btn: 'btn--gold' })}
</div>`;
  return page(ctx, 'Inner circle', '/admin/inner-circle', body, { css: ADMIN_CSS });
}

// ── home page ad requests ───────────────────────────────────────────────────
export function adminAdRequests(ctx) {
  const { rows, prices } = ctx;
  const P = { DAY: ['day', 1], WEEK: ['week', 7], MONTH: ['month', 30], YEAR: ['year', 365] };
  const st = { PENDING: 'badge', LIVE: 'badge live', ENDED: 'badge', REJECTED: 'badge red', CANCELLED: 'badge' };
  const card = r => `<div class="panel" style="margin-bottom:12px">
  <div class="row wrap" style="justify-content:space-between;gap:8px"><b style="font:900 19px var(--display);color:var(--ink)">${esc(r.title)}</b><span class="${st[r.status] || 'badge'}">${esc(r.status.toLowerCase())}</span></div>
  <p class="small" style="margin:6px 0;color:#000">From <a href="/admin/users/${esc(r.user_id)}" style="color:#000;font-weight:800">${esc(r.username)}</a> (${r.role === 'SPONSOR' ? 'sponsor' : 'player'}) · ${short(r.units)} ${P[r.period]?.[0] || ''}${r.units == 1 ? '' : 's'} · paid ${esc(naira(r.price_kobo))} · ${esc(lagos(r.created_at))}${r.live_until && r.status === 'LIVE' ? ` · live until ${esc(lagos(r.live_until))}` : ''}</p>
  ${r.image_url && /^\/media\//.test(r.image_url) ? `<a href="${esc(r.image_url)}" target="_blank" rel="noopener"><img src="${esc(r.image_url)}" alt="Their ad picture" style="display:block;width:100%;max-height:220px;object-fit:contain;margin:6px 0 8px;border-radius:12px;background:var(--cloud)"></a>` : ''}
  <div class="small" style="display:grid;gap:3px;color:#000">${r.youtube_url ? `<div>YouTube: <a href="${esc(r.youtube_url)}" target="_blank" rel="noopener">${esc(r.youtube_url)}</a></div>` : ''}${r.image_url && !/^\/media\//.test(r.image_url) ? `<div>Picture: <a href="${esc(r.image_url)}" target="_blank" rel="noopener noreferrer">${esc(r.image_url.slice(0, 80))}</a></div>` : ''}${r.target_url ? `<div>Goes to: <a href="${esc(r.target_url)}" target="_blank" rel="noopener noreferrer">${esc(r.target_url.slice(0, 80))}</a></div>` : ''}${r.details ? `<div style="white-space:pre-wrap">What they want: ${esc(r.details)}</div>` : ''}${r.admin_note ? `<div>Your note: ${esc(r.admin_note)}</div>` : ''}</div>
  ${r.status === 'PENDING' ? `<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:800">Publish on the home page</summary>${form(`/api/admin/ad-requests/${r.id}/publish`, `
    <div class="two">${field({ label: 'Days on the home page', name: 'days', type: 'number', value: String((P[r.period]?.[1] || 1) * (r.units || 1)), attrs: 'min="1" max="730"', hint: 'It comes down by itself after this.' })}${field({ label: 'Button text', name: 'cta', placeholder: r.youtube_url && !r.target_url ? 'Watch am' : 'Check am', attrs: 'maxlength="20"' })}</div>
    ${upload({ label: `Slide picture (optional: ${r.image_url && /^\/media\//.test(r.image_url) ? 'their picture is used if empty' : r.youtube_url ? 'the video thumbnail is used if empty' : 'upload one'})`, name: 'image_url' })}
    ${field({ label: 'Message to them (optional)', name: 'note', attrs: 'maxlength="300"' })}
    ${check({ name: 'email', label: 'Also email them' })}`, { submit: 'Publish and tell them', btn: 'btn--green' })}</details>
  <details style="margin-top:8px"><summary style="cursor:pointer;font-weight:800">Reject and refund</summary>${form(`/api/admin/ad-requests/${r.id}/reject`, `${field({ label: 'Why it was rejected (they see this)', name: 'note', attrs: 'maxlength="300" required' })}${check({ name: 'email', label: 'Email them the reason too', checked: true })}`, { submit: 'Reject and refund', btn: 'btn--danger' })}</details>` : ''}
  ${r.email ? `<details style="margin-top:8px"><summary style="cursor:pointer;font-weight:800">Email ${esc(r.username)}</summary>${form(`/api/admin/ad-requests/${r.id}/email`, `${field({ label: 'Subject', name: 'subject', value: `About your Tap Am home page ad “${r.title}”`, attrs: 'maxlength="90"' })}<div class="ta-field"><label class="ta-label" for="f-msg-${esc(r.id)}">Message</label><textarea class="ta-input" id="f-msg-${esc(r.id)}" name="message" rows="5" maxlength="3000" placeholder="Why it was rejected, what to change, or a question…" required></textarea><p class="ta-error" data-err="message"></p></div>`, { submit: 'Send email', btn: 'btn--gold' })}</details>` : ''}
  ${r.status === 'LIVE' ? `<div class="actions">${postBtn(`/api/admin/ad-requests/${r.id}/end`, 'Take it down now', { cls: 'btn--soft btn--sm', confirm: 'Take this ad off the home page now? (No refund.)' })}</div>` : ''}
</div>`;
  const body = `<h1 class="h1">Home page ad requests</h1><p class="sub">Players and sponsors apply from “Advertise with us” and pay from their wallet. Publish one to put it on the home page for a number of days — it comes down by itself after that. Rejected requests are refunded.</p>
<h2 class="h2">Prices</h2><div class="panel">${form('/api/admin/settings', `<div class="two">${moneyField({ label: 'Per day', name: 'slide_price_day_kobo', value: String(prices.DAY / 100) })}${moneyField({ label: 'Per week', name: 'slide_price_week_kobo', value: String(prices.WEEK / 100) })}</div>
  <div class="two">${moneyField({ label: 'Per month', name: 'slide_price_month_kobo', value: String(prices.MONTH / 100) })}${moneyField({ label: 'Per year', name: 'slide_price_year_kobo', value: String(prices.YEAR / 100) })}</div>`, { submit: 'Save prices' })}</div>
<h2 class="h2">Requests</h2>${rows.length ? rows.map(card).join('') : '<div class="empty">No requests yet.</div>'}`;
  return page(ctx, 'Ad requests', '/admin/ad-requests', body, { css: ADMIN_CSS });
}
