// UI kit for signed-in pages: app shell (top bar + bottom nav), cards, forms, lists, badges.
import { themeShell, esc, ICONS, menuSheet } from './theme.js';

export { esc };
export const naira = k => '₦' + (Number(k || 0) / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 });
export const lagos = (iso, opts = {}) => { try { return new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', ...opts }).format(new Date(iso)); } catch { return iso; } };

const I = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>',
  pools: '<rect x="3" y="4" width="8" height="12" rx="2"/><rect x="13" y="8" width="8" height="12" rx="2"/>',
  store: '<path d="M4 7h16l-1.5 12a2 2 0 01-2 1.8H7.5a2 2 0 01-2-1.8z"/><path d="M8 7a4 4 0 018 0"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M16 12h3M3 9h18"/>',
  me: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  bell: '<path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 20a2 2 0 004 0"/>',
  admin: '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/>',
  ads: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M10 9l5 3-5 3z"/>'
};
const icon = (k, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;

const NAVS = {
  USER: [['/dashboard', 'Home', 'home'], ['/pools', 'Pools', 'pools'], ['/store', 'Store', 'store'], ['/wallet', 'Wallet', 'wallet'], ['/me', 'Me', 'me']],
  SPONSOR: [['/sponsor', 'Home', 'home'], ['/sponsor/pools', 'Pools', 'pools'], ['/sponsor/ads', 'Ads', 'ads'], ['/wallet', 'Wallet', 'wallet']],
  ADMIN: [['/admin', 'Admin', 'admin'], ['/admin/users', 'Users', 'me'], ['/admin/pools', 'Pools', 'pools'], ['/admin/store', 'Store', 'store'], ['/admin/withdrawals', 'Payouts', 'wallet']]
};

const CSS = `
html,body{min-height:100%}
.app{min-height:100vh;min-height:100dvh;padding-bottom:calc(env(safe-area-inset-bottom) + 84px)}
.app-bar{position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:calc(env(safe-area-inset-top) + 8px) 14px 8px;background:rgba(2,15,8,.86);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid rgba(89,255,180,.1)}
.app-bar .ta-logo{width:84px}
.app-bar-right{display:flex;align-items:center;gap:8px}
.chip{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 12px;border-radius:10px;background:rgba(4,23,12,.85);box-shadow:inset 0 0 0 2px rgba(89,255,180,.22);color:var(--text);font:700 14px var(--body);text-decoration:none;white-space:nowrap}
.chip b{color:var(--neon);font-weight:800}
.bell{position:relative}
.bell .dot{position:absolute;top:6px;right:7px;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:var(--brand-red);color:#fff;font:700 10px/16px var(--body);text-align:center}
.app-desk-nav{display:none}
.app-main{width:100%;max-width:1100px;margin:0 auto;padding:14px 14px 0}
.app-main.narrow{max-width:640px}
.bnav{position:fixed;left:0;right:0;bottom:0;z-index:40;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;padding:6px 6px calc(env(safe-area-inset-bottom) + 6px);background:rgba(2,15,8,.94);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-top:1px solid rgba(89,255,180,.12)}
.bnav a{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 2px;border-radius:10px;color:var(--dim);text-decoration:none;font:700 11.5px var(--body)}
.bnav a svg{width:23px;height:23px}
.bnav a[aria-current="page"]{color:var(--neon);background:rgba(0,255,110,.08)}
@media (min-width:900px){
  .app{padding-bottom:30px}.bnav{display:none}
  .app-desk-nav{display:flex;gap:4px}
  .app-desk-nav a{padding:9px 12px;border-radius:10px;color:var(--muted);text-decoration:none;font:700 15px var(--body)}
  .app-desk-nav a[aria-current="page"]{color:var(--ink);background:var(--neon)}
  .app-bar{padding:12px max(20px,calc((100vw - 1100px)/2))}
  .app-bar .ta-logo{width:100px}
  .app-main{padding:22px 20px 0}
}
.h1{margin:6px 2px 14px;font:800 clamp(34px,9vw,52px)/.92 var(--display);text-transform:uppercase;color:#fff}
.h2{margin:22px 2px 10px;font:800 24px/1 var(--display);text-transform:uppercase;color:#fff;display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.h2 a{font:700 14px var(--body);text-transform:none;color:var(--neon);text-decoration:none}
.sub{margin:-6px 2px 14px;color:var(--muted);font-size:15px;line-height:1.5}
.grid{display:grid;gap:12px}
.g2{grid-template-columns:1fr 1fr}
@media (min-width:700px){.g3{grid-template-columns:repeat(3,1fr)}.g2m{grid-template-columns:1fr 1fr}.g4{grid-template-columns:repeat(4,1fr)}}
.card{position:relative;padding:18px 18px 16px}
.card>*{position:relative}
.card.tcard::before{inset:7px;border-width:2px;border-radius:10px}
.card h3{margin:0 0 6px;font:800 22px/1.05 var(--display);text-transform:uppercase}
.card p{margin:0 0 8px;font-size:15px;line-height:1.5;color:rgba(255,255,255,.92)}
.panel{padding:16px;border-radius:16px;background:rgba(3,18,10,.82);box-shadow:inset 0 0 0 1.5px rgba(89,255,180,.14)}
.panel+.panel{margin-top:12px}
.stat{display:flex;flex-direction:column;gap:4px}
.stat .k{font:600 13px var(--body);color:rgba(255,255,255,.85)}
.stat .v{font:800 30px/1 var(--display);color:#fff}
.badge{display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:7px;font:800 13px/1 var(--display);letter-spacing:.3px;text-transform:uppercase;background:rgba(0,0,0,.3);color:#fff;white-space:nowrap}
.badge.nepo{background:var(--card-gold);color:var(--ink)}
.badge.lapo{background:var(--neon-soft);color:var(--ink)}
.badge.live{background:var(--neon);color:var(--ink)}
.badge.soon{background:#9fb0ff;color:var(--ink)}
.badge.ended{background:rgba(255,255,255,.18)}
.badge.sponsor{background:var(--sticker);color:#fff}
.badge.red{background:var(--danger);color:#1a0400}
.bar-progress{height:12px;border-radius:7px;background:rgba(0,0,0,.35);overflow:hidden}
.bar-progress i{display:block;height:100%;border-radius:7px;background:linear-gradient(90deg,var(--neon),var(--neon-soft))}
.row{display:flex;align-items:center;justify-content:space-between;gap:10px}
.row.wrap{flex-wrap:wrap}
.muted{color:var(--muted)}
.small{font-size:13px}
.list{display:grid;gap:10px}
.item{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;background:rgba(3,18,10,.82);box-shadow:inset 0 0 0 1.5px rgba(89,255,180,.12);text-decoration:none;color:var(--text)}
.item .grow{flex:1;min-width:0}
.item .t{font:800 19px/1.1 var(--display);text-transform:uppercase;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.item .s{font-size:13px;color:var(--muted);margin-top:3px}
.item .amt{font:800 19px var(--display);white-space:nowrap}
.pos{color:var(--neon)}.neg{color:#ff9a8a}
.empty{padding:22px 18px;border-radius:14px;border:2px dashed rgba(89,255,180,.25);text-align:center;color:var(--muted);font-size:15px;line-height:1.5}
.empty a{color:var(--neon)}
.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px}
.actions .btn{height:46px;font-size:18px;padding:0 16px}
.btn--sm{height:38px!important;font-size:16px!important;padding:0 12px!important;border-radius:10px}
.btn--danger{background:var(--danger);box-shadow:0 4px 0 #a33b2b;color:#1a0400}
/* pool cards */
.pgrid{display:grid;gap:14px}
@media (min-width:700px){.pgrid{grid-template-columns:1fr 1fr}}
@media (min-width:1000px){.pgrid{grid-template-columns:1fr 1fr 1fr}}
.pc{display:flex;flex-direction:column;gap:8px;padding:18px 18px 16px;text-decoration:none;min-height:170px}
.pc::before{inset:7px!important;border-width:2px!important;border-radius:10px!important}
.pc>*{position:relative}
.pc .t{font:800 25px/1 var(--display);text-transform:uppercase;color:#fff;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.pc .meta{display:flex;flex-wrap:wrap;gap:6px 12px;font:600 13.5px var(--body);color:rgba(255,255,255,.92)}
.pc .prize{font:800 30px/1 var(--display);color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.2)}
.pc .foot{margin-top:auto;display:flex;justify-content:space-between;align-items:center;gap:8px}
.pc .segbox{padding:3px 7px;border-radius:8px}.pc .seg{font-size:16px}
.vsrow{display:flex;align-items:center;gap:8px}.vsrow .code{font-size:30px}.vsrow .vs{min-width:40px;height:30px;font-size:17px}
/* forms */
.form{display:grid;gap:14px}
.form .ta-field{margin:0}
.form .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.form textarea.ta-input{height:auto;min-height:90px;padding:10px 13px;resize:vertical}
.form .note{padding:12px 14px;border-radius:12px;background:rgba(239,192,50,.14);box-shadow:inset 0 0 0 1.5px rgba(239,192,50,.5);color:#ffe9a6;font-size:14px;line-height:1.5}
.form .note b{color:#fff}
.seg-choice{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;padding:5px;border-radius:12px;background:rgba(0,0,0,.3)}
.seg-choice label{position:relative;display:flex;align-items:center;justify-content:center;min-height:42px;padding:6px 8px;border-radius:9px;color:rgba(255,255,255,.8);font:800 17px/1.1 var(--display);text-align:center;cursor:pointer}
.seg-choice input{position:absolute;opacity:0;pointer-events:none}
.seg-choice input:checked+span{color:var(--ink)}
.seg-choice label:has(input:checked){background:var(--paper);color:var(--ink)}
.seg-choice label:has(input:focus-visible){outline:3px solid var(--neon)}
.upl{display:flex;align-items:center;gap:12px}
.upl img{width:64px;height:64px;object-fit:cover;border-radius:10px;background:rgba(0,0,0,.3)}
.color-in{width:56px;height:46px;padding:4px;border-radius:10px;border:0;background:rgba(3,22,11,.72);cursor:pointer}
/* tables (admin) */
.tbl-wrap{overflow-x:auto;border-radius:14px;background:rgba(3,18,10,.85);box-shadow:inset 0 0 0 1.5px rgba(89,255,180,.12)}
.tbl{width:100%;border-collapse:collapse;font-size:14px;min-width:640px}
.tbl th,.tbl td{padding:10px 12px;text-align:left;border-bottom:1px solid rgba(89,255,180,.08);vertical-align:middle}
.tbl th{font:800 14px var(--display);text-transform:uppercase;color:var(--muted);letter-spacing:.3px}
.tbl tr:last-child td{border-bottom:0}
.tbl a{color:var(--neon)}
.tabs{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 12px;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tabs a{flex:none;padding:9px 14px;border-radius:10px;background:rgba(4,23,12,.8);color:var(--muted);text-decoration:none;font:700 15px var(--body);box-shadow:inset 0 0 0 2px rgba(89,255,180,.2)}
.tabs a[aria-current="page"]{background:var(--paper);color:var(--card-green-d)}
/* dialog + toast */
.dlg{position:fixed;inset:0;z-index:90;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.62)}
.dlg>.tcard{width:100%;max-width:420px;padding:22px 20px 18px}
.dlg h3{margin:0 0 8px;font:800 26px/1 var(--display);text-transform:uppercase}
.dlg p{margin:0 0 14px;line-height:1.5}
.toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 92px);z-index:95;transform:translateX(-50%);max-width:calc(100% - 24px);padding:12px 16px;border-radius:12px;background:#05301a;border:2px solid var(--neon);color:#e3ffef;font:600 15px/1.35 var(--body);box-shadow:0 10px 30px rgba(0,0,0,.5);animation:toast-in .2s ease-out}
.toast.err{background:#2a0b06;border-color:var(--danger);color:#ffd9d2}
.toast a{color:#fff;font-weight:800}
@keyframes toast-in{from{opacity:0;transform:translate(-50%,8px)}}
@media (min-width:900px){.toast{bottom:28px}}
`;

export function appPage({ user, title, active = '', body, script = '', css = '', narrow = false, unread = 0, wallet = null, bodyClass = '', scripts = [] }) {
  const nav = NAVS[user?.role] || NAVS.USER;
  const links = nav.map(([href, label, ic]) => `<a href="${href}" ${href === active ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span></a>`).join('');
  const desk = nav.map(([href, label]) => `<a href="${href}" ${href === active ? 'aria-current="page"' : ''}>${label}</a>`).join('');
  const walletChip = wallet ? `<a class="chip" href="/wallet" aria-label="Wallet balance">${naira(wallet.balance_kobo)}</a>` : '';
  const page = `<div class="app">
<header class="app-bar">
  <a class="ta-logo" href="/" aria-label="Tap Am home"><img src="/assets/logo-tapam.svg" width="179" height="48" alt="tap am"></a>
  <nav class="app-desk-nav" aria-label="Main">${desk}</nav>
  <div class="app-bar-right">${walletChip}<a class="iconbtn bell" href="/notifications" aria-label="Notifications${unread ? ', ' + unread + ' new' : ''}">${icon('bell')}${unread ? `<span class="dot">${unread > 9 ? '9+' : unread}</span>` : ''}</a><button type="button" class="iconbtn" data-menu-open aria-label="Open menu" aria-controls="menu">${ICONS.menu}</button></div>
</header>
<main class="app-main${narrow ? ' narrow' : ''}">${body}</main>
<nav class="bnav" aria-label="Main">${links}</nav>
</div>${menuSheet(user)}`;
  return themeShell({ title, body: page, script, css: CSS + css, bodyClass, scripts });
}

export const tierBadge = (label) => `<span class="badge ${label === 'Nepo baby' ? 'nepo' : label === 'Sponsor' ? 'sponsor' : label === 'Super admin' ? 'red' : 'lapo'}">${esc(label)}</span>`;
export const stateBadge = s => `<span class="badge ${s}">${{ live: 'Live now', soon: 'Starting soon', ended: 'Ended', cancelled: 'Cancelled' }[s] || s}</span>`;

const COLORS = ['', 'tcard--orange', 'tcard--gold', 'tcard--mustard'];
const PEOPLE = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 19c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6v1h-13z"/><circle cx="17" cy="9" r="2.8"/><path d="M15.6 13.3c3.4-.5 6.2 1.7 6.2 5v1.7h-4.6v-1c0-2.3-.6-4.2-1.6-5.7z"/></svg>';

export function poolCard(p, i = 0) {
  const color = p.kind === 'SPONSORED' ? 'tcard--orange' : p.kind === 'PAID' ? 'tcard--gold' : COLORS[i % COLORS.length];
  const head = p.gameType === 'MATCH' && p.sideA
    ? `<div class="vsrow"><span class="code">${esc(p.sideA.slice(0, 3))}</span><span class="vs">VS</span><span class="code">${esc(p.sideB.slice(0, 3))}</span></div><div class="t" style="font-size:18px">${esc(p.name)}</div>`
    : `<div class="t">${esc(p.name)}</div>`;
  const when = p.state === 'soon' ? p.startsAt : p.endsAt;
  return `<a class="tcard pc ${color}" href="/pool/${p.id}" style="${p.theme ? `--c:${esc(p.theme)}` : ''}">
  <div class="row">${stateBadge(p.state)}<span class="row" style="gap:6px">${p.private ? '<span class="badge">Private</span>' : ''}${p.audience !== 'ALL' ? `<span class="badge ${p.audience === 'NEPO' ? 'nepo' : 'lapo'}">${p.audience === 'NEPO' ? 'Nepo only' : 'Lapo only'}</span>` : ''}${p.joined ? '<span class="badge live">Joined</span>' : ''}</span></div>
  ${head}
  <div class="meta">${p.sponsor ? `<span>By ${esc(p.sponsor)}</span>` : ''}<span>${p.entryFee ? naira(p.entryFee) + ' entry' : 'Free entry'}</span><span style="display:inline-flex;gap:4px;align-items:center">${PEOPLE}${Number(p.players || 0).toLocaleString('en-NG')}</span></div>
  <div class="foot"><span class="prize">${p.prize ? naira(p.prize) : 'For glory'}</span>${p.state === 'ended' ? '' : `<span class="segbox"><span class="seg" data-countdown="${esc(when)}" data-label="${p.state === 'soon' ? 'Starts in' : 'Ends in'}"></span></span>`}</div>
</a>`;
}

// Form helpers (rendered fields work with the generic [data-api] handler in app.js).
export const field = ({ label, name, type = 'text', value = '', placeholder = '', hint = '', attrs = '' }) => `<div class="ta-field">
  <label class="ta-label" for="f-${name}">${label}</label>
  <input class="ta-input" id="f-${name}" name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${attrs}>
  ${hint ? `<p class="ta-hint">${hint}</p>` : ''}<p class="ta-error" data-err="${name}" aria-live="polite"></p></div>`;
export const select = ({ label, name, options, value = '', hint = '' }) => `<div class="ta-field">
  <label class="ta-label" for="f-${name}">${label}</label>
  <select class="ta-input" id="f-${name}" name="${name}">${options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
  ${hint ? `<p class="ta-hint">${hint}</p>` : ''}<p class="ta-error" data-err="${name}" aria-live="polite"></p></div>`;
export const choice = ({ label, name, options, value }) => `<div class="ta-field"><span class="ta-label">${label}</span><div class="seg-choice" role="radiogroup" aria-label="${esc(label)}">${options.map(([v, l]) => `<label><input type="radio" name="${name}" value="${esc(v)}" ${v === value ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div><p class="ta-error" data-err="${name}"></p></div>`;
export const check = ({ name, label, checked = false }) => `<label class="ta-check"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}><span>${label}</span></label><p class="ta-error" data-err="${name}"></p>`;
export const upload = ({ label, name, value = '' }) => `<div class="ta-field"><span class="ta-label">${label}</span><div class="upl"><img data-preview="${name}" src="${esc(value || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27M4 17l5-5 4 4 3-3 4 4%27 fill=%27none%27 stroke=%27%2359ffb4%27 stroke-width=%272%27/%3E%3C/svg%3E')}" alt=""><input type="hidden" name="${name}" value="${esc(value)}"><label class="btn btn--ghost btn--sm" style="cursor:pointer">Choose image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-upload="${name}" hidden></label></div><p class="ta-error" data-err="${name}"></p></div>`;
export const form = (api, inner, { ok = '', submit = 'Save', cls = '', shine = false } = {}) => `<form class="form ${cls}" data-api="${api}" ${ok ? `data-ok="${ok}"` : ''} novalidate>${inner}<div class="ta-msg" role="alert"></div><button class="btn btn--block ${shine ? 'btn--shine' : ''}" type="submit">${submit}</button></form>`;
export const postBtn = (api, label, { body = {}, confirm = '', cls = 'btn--ghost btn--sm' } = {}) => `<button type="button" class="btn ${cls}" data-post="${api}" data-body='${esc(JSON.stringify(body))}' ${confirm ? `data-confirm="${esc(confirm)}"` : ''}>${label}</button>`;
