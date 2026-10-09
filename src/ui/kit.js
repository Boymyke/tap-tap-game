// UI kit for signed-in pages: app shell (top bar + bottom nav), pool cards, forms, lists, badges.
import { themeShell, esc, ICONS, menuSheet, LOGO_IMG } from './theme.js';
import { short } from '../tiers.js';

export { esc, short };
export const naira = k => '₦' + (Number(k || 0) / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 });
export const nairaShort = k => { const n = Number(k || 0) / 100; return '₦' + (Math.abs(n) >= 1e6 ? short(n) : n.toLocaleString('en-NG', { maximumFractionDigits: 2 })); };
export const lagos = (iso, opts = {}) => { try { return new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', ...opts }).format(new Date(iso)); } catch { return iso; } };
export const lagosDate = iso => lagos(iso, { hour: undefined, minute: undefined, year: 'numeric' });

const I = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>',
  pools: '<rect x="3" y="4" width="8" height="12" rx="2.5"/><rect x="13" y="8" width="8" height="12" rx="2.5"/>',
  store: '<path d="M4 7h16l-1.5 12a2 2 0 01-2 1.8H7.5a2 2 0 01-2-1.8z"/><path d="M8 7a4 4 0 018 0"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M16 12.5h3M3 9h18"/>',
  me: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  bell: '<path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 20a2 2 0 004 0"/>',
  admin: '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/>',
  ads: '<rect x="3" y="5" width="18" height="12" rx="2.5"/><path d="M10 9l5 3-5 3z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M8 20h8"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14c2.2.6 3.5 2.6 3.5 6"/>',
  health: '<path d="M3 12h4l3-7 4 14 3-7h4"/>'
};
export const icon = (k, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;

const NAVS = {
  USER: [['/dashboard', 'Home', 'home'], ['/pools', 'Pools', 'pools'], ['/store', 'Store', 'store'], ['/wallet', 'Wallet', 'wallet'], ['/me', 'Me', 'me']],
  SPONSOR: [['/sponsor', 'Home', 'home'], ['/sponsor/pools', 'Pools', 'pools'], ['/sponsor/ads', 'Ads', 'ads'], ['/wallet', 'Wallet', 'wallet']],
  ADMIN: [['/admin', 'Admin', 'admin'], ['/admin/users', 'Users', 'users'], ['/admin/pools', 'Pools', 'pools'], ['/admin/ads', 'Ads', 'ads'], ['/admin/health', 'Health', 'health']]
};

export const KIT_CSS = `
html,body{min-height:100%}
.app{min-height:100vh;min-height:100dvh;padding-bottom:calc(env(safe-area-inset-bottom) + 96px)}
.app-bar{position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:calc(env(safe-area-inset-top) + 8px) 14px 8px;background:color-mix(in srgb,var(--bg-deep) 82%,transparent);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.app-bar .ta-logo{width:88px}
.app-bar-right{display:flex;align-items:center;gap:8px}
.chip{display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 13px 0 9px;border-radius:999px;background:var(--green);color:var(--ink);font:800 15px var(--display);text-decoration:none;white-space:nowrap;box-shadow:0 3px 0 var(--green-d)}
.chip svg{width:19px;height:19px}
.bell .dot{position:absolute;top:-4px;right:-4px;min-width:19px;height:19px;padding:0 5px;border-radius:999px;background:var(--pink);color:#fff;font:800 11px/19px var(--body);text-align:center;border:2px solid var(--bg-deep)}
.app-desk-nav{display:none}
.app-main{width:100%;max-width:1100px;margin:0 auto;padding:12px 14px 0;animation:page-in .22s ease-out}
@keyframes page-in{from{opacity:.4;transform:translateY(6px)}}
.app-main.narrow{max-width:640px}
.bnav{position:fixed;left:10px;right:10px;bottom:calc(env(safe-area-inset-bottom) + 10px);z-index:40;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px;padding:6px;border-radius:26px;background:var(--ink);box-shadow:0 10px 30px rgba(0,0,0,.45),inset 0 0 0 2px rgba(255,255,255,.08)}
.bnav a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:54px;padding:4px 2px;border-radius:20px;color:#A99BE0;text-decoration:none;font:700 11.5px var(--body);transition:background .15s,color .15s}
.bnav a svg{width:24px;height:24px}
.bnav a[aria-current="page"]{color:var(--ink);background:var(--green)}
.bnav a:active{transform:scale(.95)}
@media (min-width:900px){
  .app{padding-bottom:30px}.bnav{display:none}
  .app-desk-nav{display:flex;gap:4px;padding:5px;border-radius:999px;background:rgba(0,0,0,.25)}
  .app-desk-nav a{padding:9px 15px;border-radius:999px;color:#fff;text-decoration:none;font:700 15px var(--body)}
  .app-desk-nav a[aria-current="page"]{color:var(--ink);background:var(--green)}
  .app-bar{padding:12px max(20px,calc((100vw - 1100px)/2))}
  .app-bar .ta-logo{width:104px}
  .app-main{padding:22px 20px 0}
}
.h1{margin:6px 2px 14px;font:900 clamp(32px,8.5vw,46px)/1 var(--display);color:#fff;text-shadow:var(--ts-big)}
.headrow{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:6px 2px 14px}
.headrow .h1{margin:0}
.h2{margin:24px 2px 12px;font:900 23px/1.1 var(--display);color:#fff;text-shadow:var(--ts);display:flex;justify-content:flex-start;align-items:center;gap:8px}
.h2 a{margin-left:auto;flex:none;font:700 14px var(--body);color:var(--ink);background:#fff;padding:7px 12px;border-radius:999px;text-decoration:none;text-shadow:none;white-space:nowrap}
.h2 .emoji{font-size:22px}
.sub{margin:-6px 2px 14px;color:var(--muted);font-size:15px;line-height:1.5}
.back{display:inline-flex;align-items:center;gap:6px;margin:0 0 10px;padding:8px 14px 8px 10px;border-radius:999px;background:rgba(255,255,255,.14);color:#fff;text-decoration:none;font:700 15px var(--body);box-shadow:inset 0 0 0 2px rgba(255,255,255,.22)}
.back svg{width:18px;height:18px}
.grid{display:grid;gap:12px;grid-template-columns:minmax(0,1fr)}
.g2{grid-template-columns:1fr 1fr}
@media (min-width:700px){.g3{grid-template-columns:repeat(3,1fr)}.g2m{grid-template-columns:1fr 1fr}.g4{grid-template-columns:repeat(4,1fr)}}
.card{padding:18px}
.card>*{position:relative}
.card h3{margin:0 0 6px;font:900 22px/1.05 var(--display)}
.card p{margin:0 0 8px;font-size:15px;line-height:1.5}
.stat{display:flex;flex-direction:column;gap:4px}
.stat .k{font:700 13px var(--body);opacity:.9}
.stat .v{font:900 28px/1 var(--display)}
.badge{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:999px;font:800 12px/1 var(--body);letter-spacing:.2px;background:rgba(0,0,0,.32);color:#fff;white-space:nowrap;text-shadow:none}
.badge.lapo{background:#fff;color:var(--ink)}
.badge.mapo{background:var(--teal);color:var(--ink)}
.badge.nepo{background:var(--sunny);color:var(--ink)}
.badge.live{background:var(--green);color:var(--ink)}
.badge.soon{background:#fff;color:var(--ink)}
.badge.ended{background:rgba(0,0,0,.35)}
.badge.sponsor{background:var(--ink);color:var(--sunny)}
.badge.red{background:var(--danger);color:#fff}
.badge.paid{background:var(--sunny);color:var(--ink)}
.panel .badge{background:var(--cloud);color:var(--ink)}
.panel .badge.live{background:var(--green)}.panel .badge.nepo{background:var(--sunny)}.panel .badge.red{background:var(--danger);color:#fff}.panel .badge.mapo{background:var(--teal)}
.when{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:999px;background:var(--ink);color:var(--green);font:800 13px/1 var(--body);white-space:nowrap;text-shadow:none;font-variant-numeric:tabular-nums}
.when::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 0 3px rgba(0,255,110,.25)}
.when.ended{color:#C9BDF5}.when.ended::before{background:#C9BDF5;box-shadow:none}
.bar-progress{height:14px;border-radius:999px;background:rgba(0,0,0,.28);overflow:hidden;box-shadow:inset 0 2px 0 rgba(0,0,0,.2)}
.bar-progress i{display:block;height:100%;border-radius:999px;background:var(--green);box-shadow:inset 0 -3px 0 rgba(0,0,0,.15)}
.row{display:flex;align-items:center;justify-content:space-between;gap:10px}
.row.wrap{flex-wrap:wrap}
.list{display:grid;gap:10px;grid-template-columns:minmax(0,1fr)}
.item{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:18px;background:#fff;color:var(--ink);text-decoration:none;box-shadow:0 4px 0 rgba(21,11,51,.22)}
.item .grow{flex:1;min-width:0}
.item .t{font:800 17px/1.15 var(--display);color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.item .s{font-size:13px;color:var(--ink-soft);margin-top:3px}
.item .amt{font:900 18px var(--display);white-space:nowrap}
.item.me{box-shadow:0 0 0 3px var(--green),0 4px 0 rgba(21,11,51,.22)}
.pos{color:#0A9B4A}.neg{color:#D11F3C}
.empty{padding:22px 18px;border-radius:var(--r);background:rgba(255,255,255,.1);border:2.5px dashed rgba(255,255,255,.35);text-align:center;color:#fff;font-size:15px;line-height:1.5}
.empty a{color:var(--green);font-weight:800}
.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}
.hscroll{display:grid;grid-auto-flow:column;grid-auto-columns:min(84%,340px);gap:14px;overflow-x:auto;padding:4px 14px 14px;margin:0 -14px;scroll-snap-type:x mandatory;scrollbar-width:none}
.hscroll::-webkit-scrollbar{display:none}
.hscroll>*{scroll-snap-align:start}
@media (min-width:900px){.hscroll{grid-auto-flow:row;grid-template-columns:repeat(3,1fr);grid-auto-columns:auto;overflow:visible;margin:0;padding:4px 0 6px}}
/* pool cards */
.pgrid{display:grid;gap:16px;grid-template-columns:minmax(0,1fr)}
@media (min-width:700px){.pgrid{grid-template-columns:1fr 1fr}}
@media (min-width:1000px){.pgrid{grid-template-columns:1fr 1fr 1fr}}
.pc{display:flex;flex-direction:column;gap:9px;padding:16px 16px 14px;text-decoration:none;min-height:184px;overflow:hidden}
.pc>*{position:relative}
.pc .tags{display:flex;flex-wrap:wrap;gap:6px}
.pc .t{font:900 23px/1.05 var(--display);overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.pc .meta{display:flex;flex-wrap:wrap;gap:6px 12px;font:700 13.5px var(--body)}
.pc .meta span{display:inline-flex;align-items:center;gap:4px}
.pc .prize{font:900 30px/1 var(--display)}
.pc .prize small{display:block;font:700 12px var(--body);opacity:.9;margin-bottom:3px}
.pc .foot{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;gap:8px;flex-wrap:wrap}
.pc .art{position:absolute;right:-18px;top:-18px;width:86px;opacity:.95;pointer-events:none}
.vsrow{display:flex;align-items:center;gap:10px}.vsrow .code{font-size:28px}.vsrow .vs{min-width:40px;height:32px;font-size:16px}
/* forms */
.form{display:grid;gap:15px}
.form .ta-field{margin:0}
.form .note{padding:12px 14px;border-radius:16px;background:#FFF6D6;color:#4A3800;font-size:14px;line-height:1.5}
.form .note b{color:var(--ink)}
.upl{display:flex;align-items:center;gap:12px}
.upl img{width:64px;height:64px;object-fit:cover;border-radius:14px;background:var(--cloud)}
.color-in{width:100%;height:50px;padding:5px;border-radius:16px;border:2px solid var(--line);background:var(--cloud);cursor:pointer}
.swatches{display:flex;flex-wrap:wrap;gap:10px}
.swatch{position:relative;width:46px;height:46px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px var(--line);cursor:pointer;padding:0}
.swatch input{position:absolute;opacity:0;inset:0;cursor:pointer}
.swatch:has(input:checked){box-shadow:0 0 0 3px var(--ink)}
.swatch:has(input:checked)::after{content:"✓";position:absolute;inset:0;display:grid;place-items:center;color:#fff;font:900 18px var(--display);text-shadow:var(--ts)}
.swatch.locked{opacity:.45}
.stepper{display:flex;align-items:center;gap:6px}
.stepper button{flex:none;width:44px;height:44px;border:0;border-radius:14px;background:var(--cloud);color:var(--ink);font:900 22px/1 var(--display);cursor:pointer}
.stepper input{width:70px;text-align:center;padding:0 6px}
/* tables (admin) */
.tbl-wrap{overflow-x:auto;border-radius:var(--r);background:#fff;color:var(--ink);box-shadow:var(--sh)}
.tbl{width:100%;border-collapse:collapse;font-size:14px;min-width:640px}
.tbl th,.tbl td{padding:11px 12px;text-align:left;border-bottom:1px solid var(--line);vertical-align:middle}
.tbl th{font:800 13px var(--display);color:var(--ink-soft);text-transform:uppercase;letter-spacing:.3px;background:var(--cloud)}
.tbl tr:last-child td{border-bottom:0}
.tbl a{color:var(--purple-d);font-weight:700}
.tabs{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 14px;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tabs a{flex:none;padding:10px 15px;border-radius:999px;background:rgba(255,255,255,.14);color:#fff;text-decoration:none;font:700 15px var(--body);box-shadow:inset 0 0 0 2px rgba(255,255,255,.2)}
.tabs a[aria-current="page"]{background:#fff;color:var(--ink);box-shadow:0 3px 0 rgba(0,0,0,.25)}
.pager{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:14px}
.pager span{font:700 14px var(--body);color:#fff}
/* copy row */
.copyrow{display:flex;align-items:center;gap:8px;padding:6px 6px 6px 14px;border-radius:999px;background:#fff;color:var(--ink)}
.copyrow code{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:800 16px var(--display);letter-spacing:.5px}
.copybtn{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 13px;border:0;border-radius:999px;background:var(--ink);color:#fff;font:800 13px var(--body);cursor:pointer}
.copybtn svg{width:16px;height:16px}
.copybtn.done{background:var(--green);color:var(--ink)}
.locked-overlay{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border-radius:inherit;background:rgba(21,11,51,.55);color:#fff;font:800 14px var(--body);text-align:center;padding:10px}
.locked-overlay svg{width:30px;height:30px}
.is-locked{filter:grayscale(.55)}
`;

export function appPage({ user, title, active = '', body, script = '', css = '', narrow = false, unread, wallet, bodyClass = '', scripts = [], theme = 'grape', bgCss = '' }) {
  const nav = NAVS[user?.role] || NAVS.USER;
  const links = nav.map(([href, label, ic]) => `<a href="${href}" ${href === active ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span></a>`).join('');
  const desk = nav.map(([href, label]) => `<a href="${href}" ${href === active ? 'aria-current="page"' : ''}>${label}</a>`).join('');
  const w = wallet || user?.wallet;
  const n = unread ?? user?.unread ?? 0;
  const winChip = user?.role === 'USER' && w ? `<a class="chip" href="/wallet" aria-label="Winnings ${esc(naira(w.winnings_kobo))}" data-winnings>${icon('trophy')}${esc(nairaShort(w.winnings_kobo))}</a>`
    : user?.role === 'SPONSOR' && w ? `<a class="chip" href="/wallet" aria-label="Wallet">${icon('wallet')}${esc(nairaShort(w.balance_kobo))}</a>` : '';
  const page = `<div class="app">
<header class="app-bar">
  <a class="ta-logo" href="${user?.role === 'ADMIN' ? '/admin' : user?.role === 'SPONSOR' ? '/sponsor' : '/dashboard'}" aria-label="Tap Am home">${LOGO_IMG()}</a>
  <nav class="app-desk-nav" aria-label="Main">${desk}</nav>
  <div class="app-bar-right">${winChip}<a class="iconbtn bell" href="/notifications" aria-label="Notifications${n ? ', ' + n + ' new' : ''}">${icon('bell')}${n ? `<span class="dot">${n > 9 ? '9+' : n}</span>` : ''}</a><button type="button" class="iconbtn" data-menu-open aria-label="Open menu" aria-controls="menu">${ICONS.menu}</button></div>
</header>
<main class="app-main${narrow ? ' narrow' : ''}" id="main">${body}</main>
<nav class="bnav" aria-label="Main">${links}</nav>
</div>${menuSheet(user)}`;
  return themeShell({ title, body: page, script, css: KIT_CSS + css, bodyClass: ('app-body ' + bodyClass).trim(), scripts, theme, bgCss });
}

export const tierBadge = label => `<span class="badge ${{ 'Nepo baby': 'nepo', 'Mapo baby': 'mapo', 'Lapo baby': 'lapo', Sponsor: 'sponsor', 'Super admin': 'red' }[label] || 'lapo'}">${esc(label)}</span>`;
export const stateBadge = s => `<span class="badge ${s}">${{ live: '● Live now', soon: 'Coming up', ended: 'Ended', cancelled: 'Cancelled' }[s] || s}</span>`;
// Live countdown pill: "Starts in 2h 03m 10s" / "Ends in 14m 09s" (updated by app.js).
export const whenPill = p => p.state === 'ended' || p.state === 'cancelled'
  ? `<span class="when ended">${p.state === 'cancelled' ? 'Cancelled' : 'Ended ' + esc(lagos(p.endsAt))}</span>`
  : `<span class="when" data-when="${esc(p.state === 'soon' ? p.startsAt : p.endsAt)}" data-label="${p.state === 'soon' ? 'Starts in' : 'Ends in'}">${p.state === 'soon' ? 'Starts in' : 'Ends in'} …</span>`;

const PEOPLE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 19c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6v1h-13z"/><circle cx="17" cy="9" r="2.8"/><path d="M15.6 13.3c3.4-.5 6.2 1.7 6.2 5v1.7h-4.6v-1c0-2.3-.6-4.2-1.6-5.7z"/></svg>';
const COLORS = ['c-sky', 'c-purple', 'c-teal', 'c-pink'];
export function poolCard(p, i = 0) {
  const color = p.kind === 'SPONSORED' ? 'c-orange' : p.kind === 'PAID' ? 'c-pink' : COLORS[i % COLORS.length];
  const head = p.gameType === 'MATCH' && p.sideA
    ? `<div class="vsrow"><span class="code">${esc(p.sideA.slice(0, 3))}</span><span class="vs">VS</span><span class="code">${esc(p.sideB.slice(0, 3))}</span></div><div class="t" style="font-size:17px">${esc(p.name)}</div>`
    : `<div class="t">${esc(p.name)}</div>`;
  const tags = [p.kind === 'SPONSORED' ? `<span class="badge sponsor">★ ${esc(p.sponsor || 'Sponsored')}</span>` : p.kind === 'PAID' ? '<span class="badge paid">Paid</span>' : '<span class="badge">Free</span>',
    p.audience !== 'ALL' ? `<span class="badge ${p.audience === 'NEPO' ? 'nepo' : p.audience === 'MAPO' ? 'mapo' : 'lapo'}">${{ NEPO: 'Nepo only', MAPO: 'Mapo + Nepo', LAPO: 'Lapo only' }[p.audience]}</span>` : '',
    p.private ? '<span class="badge">🔒 Private</span>' : '', p.joined ? '<span class="badge live">✓ Joined</span>' : ''].join('');
  return `<a class="tcard pc ${color}" href="/pool/${esc(p.id)}" style="${p.theme ? `--c:${esc(p.theme)};--cd:color-mix(in srgb,${esc(p.theme)} 65%,#000)` : ''}">
  <div class="tags">${tags}</div>
  ${head}
  <div class="meta"><span>${PEOPLE}${short(p.players || 0)} ${Number(p.players) === 1 ? 'player' : 'players'}</span><span>${p.entryFee ? esc(naira(p.entryFee)) + ' entry' : 'Free entry'}</span></div>
  <div class="foot"><span class="prize"><small>Prize</small>${p.prize ? esc(nairaShort(p.prize)) : 'For glory'}</span>${whenPill(p)}</div>
</a>`;
}

// ── form helpers (work with the generic [data-api] handler in app.js) ───────
const tipBtn = tip => (tip ? ` <button type="button" class="tip" data-tip="${esc(tip)}" aria-label="More info">i</button>` : '');
export const field = ({ label, name, type = 'text', value = '', placeholder = '', hint = '', attrs = '', tip = '', id = '' }) => `<div class="ta-field" data-field="${name}">
  <label class="ta-label" for="${id || 'f-' + name}">${label}${tipBtn(tip)}</label>
  <input class="ta-input" id="${id || 'f-' + name}" name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${attrs}>
  ${hint ? `<p class="ta-hint">${hint}</p>` : ''}<p class="ta-error" data-err="${name}" aria-live="polite"></p></div>`;
// Money/number inputs that show commas while you type (₦12,500).
export const moneyField = ({ label, name, value = '', placeholder = '', hint = '', tip = '', attrs = '', id = '' }) => field({ label, name, id, value: value === '' ? '' : Number(value).toLocaleString('en-NG'), placeholder, hint, tip, attrs: `inputmode="numeric" autocomplete="off" data-num ${attrs}` });
export const select = ({ label, name, options, value = '', hint = '', tip = '', attrs = '' }) => `<div class="ta-field" data-field="${name}">
  <label class="ta-label" for="f-${name}">${label}${tipBtn(tip)}</label>
  <select class="ta-input" id="f-${name}" name="${name}" ${attrs}>${options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
  ${hint ? `<p class="ta-hint">${hint}</p>` : ''}<p class="ta-error" data-err="${name}" aria-live="polite"></p></div>`;
export const choice = ({ label, name, options, value, tip = '', cls = '' }) => `<div class="ta-field" data-field="${name}"><span class="ta-label">${label}${tipBtn(tip)}</span><div class="seg-choice ${cls}" role="radiogroup" aria-label="${esc(label)}">${options.map(([v, l]) => `<label><input type="radio" name="${name}" value="${esc(v)}" ${v === value ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div><p class="ta-error" data-err="${name}"></p></div>`;
export const check = ({ name, label, checked = false }) => `<label class="ta-check"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}><span>${label}</span></label><p class="ta-error" data-err="${name}"></p>`;
export const upload = ({ label, name, value = '' }) => `<div class="ta-field"><span class="ta-label">${label}</span><div class="upl"><img data-preview="${name}" src="${esc(value || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27M4 17l5-5 4 4 3-3 4 4%27 fill=%27none%27 stroke=%27%239161FF%27 stroke-width=%272%27/%3E%3C/svg%3E')}" alt=""><input type="hidden" name="${name}" value="${esc(value)}"><label class="btn btn--soft btn--sm" style="cursor:pointer">Choose image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-upload="${name}" hidden></label></div><p class="ta-error" data-err="${name}"></p></div>`;
export const form = (api, inner, { ok = '', submit = 'Save', cls = '', shine = false, btn = 'btn--green' } = {}) => `<form class="form ${cls}" data-api="${api}" ${ok ? `data-ok="${ok}"` : ''} novalidate>${inner}<div class="ta-msg" role="alert"></div><button class="btn ${btn} btn--block ${shine ? 'btn--shine' : ''}" type="submit">${submit}</button></form>`;
export const postBtn = (api, label, { body = {}, confirm = '', cls = 'btn--soft btn--sm', ok = '' } = {}) => `<button type="button" class="btn ${cls}" data-post="${api}" data-body='${esc(JSON.stringify(body))}' ${confirm ? `data-confirm="${esc(confirm)}"` : ''} ${ok ? `data-ok="${ok}"` : ''}>${label}</button>`;
export const copyRow = (value, label = 'Copy') => `<div class="copyrow"><code>${esc(value)}</code><button type="button" class="copybtn" data-copy="${esc(value)}">${ICONS.copy}<span>${label}</span></button></div>`;
export const copyBtn = (value, label = 'Copy') => `<button type="button" class="copybtn" data-copy="${esc(value)}">${ICONS.copy}<span>${label}</span></button>`;
// Something a lower tier can see but not use: tapping it opens the upgrade pop-up.
export const upgradeAttrs = (need, feature) => `data-upgrade="${need}" data-feature="${esc(feature)}"`;
export const lockedOverlay = text => `<div class="locked-overlay">${ICONS.lock}<span>${esc(text)}</span></div>`;
export const backLink = (href, label = 'Back') => `<a class="back" href="${esc(href)}" data-back>${ICONS.back}<span>${esc(label)}</span></a>`;
export const pager = (base, page, hasNext) => (page > 1 || hasNext) ? `<nav class="pager" aria-label="Pages">${page > 1 ? `<a class="btn btn--white btn--sm" href="${base}${base.includes('?') ? '&' : '?'}page=${page - 1}">← Newer</a>` : ''}<span>Page ${page}</span>${hasNext ? `<a class="btn btn--white btn--sm" href="${base}${base.includes('?') ? '&' : '?'}page=${page + 1}">Older →</a>` : ''}</nav>` : '';

// A page anyone can open (plans, ranks, top tappers): app shell when logged in, simple shell otherwise.
export function anyPage({ user, title, body, css = '', script = '', active = '', theme = 'grape', bgCss = '', description }) {
  if (user) return appPage({ user, title, active, body, css, script, theme, bgCss });
  const top = `<header class="bar"><div style="display:flex;align-items:center;gap:8px"><a class="iconbtn" href="/" aria-label="Back">${ICONS.back}</a><a class="ta-logo" style="width:92px" href="/" aria-label="Tap Am home">${LOGO_IMG()}</a></div><div class="bar-right"><a class="btn btn--green btn--sm" href="/signup">Sign up</a><button type="button" class="iconbtn" data-menu-open aria-label="Open menu" aria-controls="menu">${ICONS.menu}</button></div></header>`;
  return themeShell({ title, description, body: `${top}<main class="app-main" id="main" style="padding-bottom:40px">${body}</main>${menuSheet(null)}`, css: KIT_CSS + css, script });
}
