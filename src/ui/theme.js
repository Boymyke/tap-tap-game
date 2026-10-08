// Tap Am design system — shared by every themed page.
// Concept: match cards on a table (patterned playing cards, VS stickers, card stacks)
// drawn in a flat-vector style, with glowing 7-segment displays for every number.
// The logo stays as-is.

export const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const BRAND = 'Tap Am';
export const TAGLINE = 'tap ammm jor, make you chop ammm';
export const FERRN_URL = 'https://www.ferrnagency.com';
export const ASSET_VERSION = '3';

// Tone-on-tone geometric pattern for cards (like printed match cards).
const PATTERN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'%3E%3Cg fill='%23fff' fill-opacity='.07'%3E%3Cpath d='M0 0l14 14L0 28zM28 0l14 14-14 14zM14 28l14 14-14 14zM42 28l14 14-14 14z'/%3E%3C/g%3E%3Cg fill='%23000' fill-opacity='.09'%3E%3Cpath d='M28 0L14 14l14 14zM56 0L42 14l14 14zM28 28L14 42l14 14zM56 28L42 42l14 14z'/%3E%3C/g%3E%3C/svg%3E\")";

const CSS = `
:root{
  --table:#01240c;--felt:#04170c;--ink:#06140b;
  --card-green:#1c5a33;--card-green-d:#123d22;
  --card-orange:#e2802a;--card-orange-d:#a95a14;
  --card-mustard:#d8a73a;--card-mustard-d:#9c7520;
  --card-gold:#efc032;--card-gold-d:#b38b14;
  --sticker:#2a39d1;--sticker-d:#18239a;
  --neon:#00ff6e;--neon-d:#00a346;--neon-soft:#59ffb4;
  --seg-on:#5dff4a;--seg-off:rgba(93,255,74,.10);
  --paper:#fbf6e8;--text:#ecfff4;--muted:#a9dcc1;--dim:#6fb391;
  --danger:#ff6b57;--brand-red:#ff2600;
  --display:"Barlow Condensed","Arial Narrow",system-ui,sans-serif;
  --body:"Barlow",system-ui,-apple-system,"Segoe UI",Arial,sans-serif;
  --pattern:${PATTERN};
  --accent:var(--neon);--label:var(--text);--placeholder:#4fa57a;--hint:var(--dim);--tagline:var(--neon-soft);
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;height:100%}
[hidden]{display:none!important}
body{margin:0;min-height:100%;background:var(--table);color:var(--text);font-family:var(--body);font-size:16px;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;overscroll-behavior-y:none}
body::before{content:"";position:fixed;inset:0;z-index:-1;background:radial-gradient(120% 80% at 50% 0%,rgba(0,0,0,0),rgba(0,0,0,.45)),var(--table) url(/assets/bg-mobile.jpg) center top/cover no-repeat}
@media (min-width:760px){body::before{background-image:radial-gradient(120% 80% at 50% 0%,rgba(0,0,0,0),rgba(0,0,0,.45)),url(/assets/bg-desktop.jpg);background-position:center}}
a{color:inherit}
:focus-visible{outline:3px solid var(--neon);outline-offset:2px;border-radius:6px}
button{font-family:inherit}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

/* ── playing card ─────────────────────────────── */
.tcard{--c:var(--card-green);--cd:var(--card-green-d);position:relative;border-radius:18px;background:var(--pattern) 0 0/56px 56px,var(--c);color:#fff;
  box-shadow:5px 6px 0 -1px var(--cd),10px 12px 0 -2px rgba(0,0,0,.25),0 22px 40px rgba(0,0,0,.45)}
.tcard::before{content:"";position:absolute;inset:9px;border:2.5px solid rgba(255,255,255,.9);border-radius:11px;pointer-events:none}
.tcard--flat{box-shadow:0 14px 34px rgba(0,0,0,.45)}
.tcard--orange{--c:var(--card-orange);--cd:var(--card-orange-d)}
.tcard--mustard{--c:var(--card-mustard);--cd:var(--card-mustard-d)}
.tcard--gold{--c:var(--card-gold);--cd:var(--card-gold-d)}
.tcard--ink{--c:#0b2416;--cd:#06140b}
.tcard--gold p,.tcard--gold li,.tcard--mustard p,.tcard--mustard li,.tcard--gold small,.tcard--mustard small{color:#241a02!important}
.tcard--gold a:not(.btn),.tcard--mustard a:not(.btn){color:#1d1503!important}
.tcard--gold h1,.tcard--gold h2,.tcard--gold h3,.tcard--mustard h1,.tcard--mustard h2,.tcard--mustard h3,.tcard--gold .code,.tcard--mustard .code{text-shadow:0 2px 0 rgba(0,0,0,.28)}
.vs{display:inline-grid;place-items:center;min-width:52px;height:40px;padding:0 10px;border-radius:10px;background:linear-gradient(180deg,#3b4bea,var(--sticker));color:#fff;font:800 italic 22px/1 var(--display);letter-spacing:.5px;border:2.5px solid #9fb0ff;box-shadow:0 4px 0 var(--sticker-d),0 8px 16px rgba(0,0,0,.35);transform:rotate(-5deg)}
.code{font:800 clamp(28px,8vw,44px)/.9 var(--display);letter-spacing:.5px;text-transform:uppercase;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.15)}
.tag{display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:6px;background:rgba(0,0,0,.28);font:700 12px/1.2 var(--body);color:#fff}

/* ── 7-segment displays ───────────────────────── */
.segbox{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:10px;background:#04130a;border:2px solid #1d8f44;box-shadow:inset 0 0 0 2px #062010,inset 0 6px 14px rgba(0,0,0,.6),0 3px 0 #0d5226}
.seg{display:inline-flex;align-items:center;gap:.08em;height:1em;font-size:22px;filter:drop-shadow(0 0 5px rgba(93,255,74,.55))}
.seg svg{display:block;height:1em;width:.6em;overflow:visible}
.seg svg.c{width:.24em}
.seg polygon,.seg circle{fill:var(--seg-off);transition:fill .06s}
.seg .on{fill:var(--seg-on)}
.seglabel{font:600 12px/1.1 var(--body);color:var(--dim)}

/* ── buttons ──────────────────────────────────── */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:52px;padding:0 22px;border:0;border-radius:12px;background:var(--neon);color:var(--ink);font:800 20px/1 var(--display);letter-spacing:.3px;text-decoration:none;cursor:pointer;
  box-shadow:0 5px 0 var(--neon-d),0 10px 22px rgba(0,255,110,.28),inset 0 2px 0 rgba(255,255,255,.45);transition:transform .06s,box-shadow .06s,filter .15s}
.btn:hover{filter:brightness(1.05)}
.btn:active{transform:translateY(4px);box-shadow:0 1px 0 var(--neon-d),0 4px 10px rgba(0,255,110,.2),inset 0 2px 0 rgba(255,255,255,.45)}
.btn[disabled]{cursor:progress;filter:saturate(.6) brightness(.85)}
.btn--ghost{background:rgba(4,23,12,.75);color:var(--text);box-shadow:0 4px 0 #020a05,inset 0 0 0 2px rgba(89,255,180,.35)}
.btn--ghost:active{box-shadow:0 0 0 #020a05,inset 0 0 0 2px rgba(89,255,180,.35)}
.btn--gold{background:var(--card-gold);box-shadow:0 5px 0 var(--card-gold-d),inset 0 2px 0 rgba(255,255,255,.5)}
.btn--block{width:100%}
.btn--shine,.ta-btn--shine{position:relative;overflow:hidden;isolation:isolate}
.btn--shine::after,.ta-btn--shine::after{content:"";position:absolute;top:-30%;bottom:-30%;left:-70%;width:45%;background:linear-gradient(100deg,transparent 0%,rgba(255,255,255,.15) 30%,rgba(255,255,255,.85) 50%,rgba(255,255,255,.15) 70%,transparent 100%);transform:skewX(-22deg);animation:ta-shine 2.6s ease-in-out infinite;pointer-events:none;z-index:-1}
@keyframes ta-shine{0%{left:-70%}55%,100%{left:135%}}
.iconbtn{display:inline-grid;place-items:center;width:42px;height:42px;border:0;border-radius:12px;background:rgba(4,23,12,.8);color:var(--text);cursor:pointer;box-shadow:inset 0 0 0 2px rgba(89,255,180,.25);text-decoration:none}
.iconbtn svg{width:22px;height:22px}

/* ── top bar + menu sheet ─────────────────────── */
.bar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:calc(env(safe-area-inset-top) + 10px) 14px 10px}
.bar .ta-logo{width:96px;flex:none}
.bar-right{display:flex;align-items:center;gap:8px}
.sheet{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;background:rgba(2,12,6,.96);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);padding:calc(env(safe-area-inset-top) + 10px) 16px calc(env(safe-area-inset-bottom) + 16px);overflow:auto;animation:sheet-in .18s ease-out}
@keyframes sheet-in{from{opacity:0;transform:translateY(-8px)}}
.sheet-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.sheet-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:560px;width:100%;margin:0 auto}
.sheet-grid a,.sheet-grid button{min-height:86px;padding:16px 14px;display:flex;flex-direction:column;justify-content:flex-end;gap:2px;text-decoration:none;border:0;text-align:left;cursor:pointer;color:#fff;font:800 22px/1 var(--display);text-transform:uppercase}
.sheet-grid small{font:500 12px/1.3 var(--body);text-transform:none;color:rgba(255,255,255,.85)}
.sheet-grid .tcard::before{inset:6px;border-width:2px;border-radius:9px}
.sheet-foot{max-width:560px;width:100%;margin:18px auto 0;display:flex;flex-wrap:wrap;gap:10px 18px;justify-content:center;font-size:14px}
.sheet-foot a{color:var(--muted);text-decoration:none}
.sheet-foot a:hover{color:var(--neon)}

/* ── offline banner ───────────────────────────── */
.netbar{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 14px);z-index:80;transform:translateX(-50%);display:flex;align-items:center;gap:10px;width:max-content;max-width:calc(100% - 24px);padding:12px 16px;border-radius:12px;background:#2a0b06;border:2px solid var(--danger);color:#ffd9d2;font:600 14px/1.35 var(--body);box-shadow:0 10px 30px rgba(0,0,0,.5)}
.netbar.ok{background:#05301a;border-color:var(--neon);color:#d6ffe9}
.netbar b{color:#fff}
.netbar-dot{flex:none;width:10px;height:10px;border-radius:50%;background:var(--danger);box-shadow:0 0 0 4px rgba(255,107,87,.25)}
.netbar.ok .netbar-dot{background:var(--neon);box-shadow:0 0 0 4px rgba(0,255,110,.25)}

/* ── logo, footer line ────────────────────────── */
.ta-logo{display:block;width:179px;line-height:0}
.ta-logo img{width:100%;height:auto}
.ta-tagline{margin:12px 0 0;max-width:240px;text-align:center;font:600 italic 15px/1.2 var(--body);color:var(--neon-soft)}
.ta-powered{margin:40px 0 0;font-size:14px;color:#fff;text-align:center}
.ta-powered a{color:var(--brand-red);font-weight:700;text-decoration:none}
.ta-powered a:hover{text-decoration:underline;text-underline-offset:3px}

/* ── auth pages (login / sign-up / codes) ─────── */
.ta-page{min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;align-items:center;padding:max(40px,calc(env(safe-area-inset-top) + 20px)) 18px max(28px,env(safe-area-inset-bottom))}
.ta-card{position:relative;width:100%;max-width:380px;margin-top:30px;padding:24px 22px 30px;border-radius:18px;background:var(--pattern) 0 0/56px 56px,var(--card-green);box-shadow:5px 6px 0 -1px var(--card-green-d),10px 12px 0 -2px rgba(0,0,0,.25),0 22px 40px rgba(0,0,0,.45)}
.ta-card::before{content:"";position:absolute;inset:9px;border:2.5px solid rgba(255,255,255,.9);border-radius:11px;pointer-events:none}
.ta-card>*{position:relative}
.ta-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:5px;border-radius:12px;background:rgba(0,0,0,.28)}
.ta-tab{display:flex;align-items:center;justify-content:center;height:48px;border:0;border-radius:9px;background:transparent;color:rgba(255,255,255,.7);font:800 21px/1 var(--display);text-decoration:none;cursor:pointer;transition:background .15s,color .15s}
.ta-tab:hover{color:#fff}
.ta-tab[aria-selected="true"]{background:var(--paper);color:var(--card-green-d);box-shadow:0 3px 0 rgba(0,0,0,.25)}
.ta-form{margin-top:20px}
.ta-field{margin:0 0 16px}
.ta-label{display:block;margin:0 0 7px;font:700 15px/1.2 var(--body);color:#fff}
.ta-label small{font-weight:500;color:rgba(255,255,255,.7)}
.ta-input{display:block;width:100%;height:46px;margin:0;padding:0 13px;border:2px solid transparent;border-radius:10px;background:rgba(3,22,11,.72);color:#fff;font:500 16px var(--body);outline:none;transition:border-color .15s,box-shadow .15s}
.ta-input::placeholder{color:#6fb391;font-size:15px;opacity:1}
.ta-input:focus{border-color:var(--neon);box-shadow:0 0 0 3px rgba(0,255,110,.18)}
.ta-input.is-invalid{border-color:var(--danger)}
select.ta-input{appearance:none;-webkit-appearance:none;padding-right:28px;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2359ffb4' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 11px center}
select.ta-input:invalid{color:#6fb391;font-size:15px}
select.ta-input option{color:#fff;background:#0b3a22}
.ta-hint{margin:6px 0 0;font-size:13px;line-height:1.35;color:rgba(255,255,255,.75)}
.ta-error{display:flex;gap:6px;align-items:flex-start;margin:7px 0 0;padding:6px 8px;border-radius:8px;background:rgba(40,6,2,.55);font:600 13px/1.35 var(--body);color:#ffc9bf}
.ta-error::before{content:"!";flex:none;display:grid;place-items:center;width:16px;height:16px;border-radius:50%;background:var(--danger);color:#1a0400;font-size:11px;font-weight:800}
.ta-error:empty{display:none}
.ta-pw{position:relative}
.ta-pw .ta-input{padding-right:48px}
.ta-eye{position:absolute;top:2px;right:2px;width:42px;height:42px;display:grid;place-items:center;border:0;background:none;color:var(--neon-soft);cursor:pointer;border-radius:8px}
.ta-eye svg{width:17px;height:15px}
.ta-eye .ta-eye-open{display:none}
.ta-eye[aria-pressed="true"] .ta-eye-open{display:block}
.ta-eye[aria-pressed="true"] .ta-eye-closed{display:none}
.ta-forgot-row{display:flex;justify-content:flex-end}
.ta-forgot{margin:4px 0 0;padding:6px 0;border:0;background:none;color:var(--paper);font:600 13px var(--body);text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.ta-dob{display:grid;grid-template-columns:1fr 1.2fr 1.2fr;gap:8px}
.ta-check{display:flex;gap:10px;align-items:flex-start;margin:0 0 4px;font:500 14px/1.45 var(--body);color:#fff;cursor:pointer}
.ta-check input{appearance:none;-webkit-appearance:none;flex:none;display:grid;place-content:center;width:22px;height:22px;margin:0;border:2px solid rgba(255,255,255,.8);border-radius:6px;background:rgba(3,22,11,.6);cursor:pointer}
.ta-check input:checked{background:var(--neon);border-color:var(--neon)}
.ta-check input:checked::after{content:"";width:10px;height:5px;margin-top:-3px;border:2.5px solid var(--ink);border-top:0;border-right:0;transform:rotate(-45deg)}
.ta-check input.is-invalid{border-color:var(--danger)}
.ta-check a{color:var(--paper);font-weight:700;text-underline-offset:2px}
.ta-btn{display:flex;align-items:center;justify-content:center;width:100%;height:54px;margin:18px 0 0;border:0;border-radius:12px;background:var(--neon);color:var(--ink);font:800 22px/1 var(--display);cursor:pointer;
  box-shadow:0 5px 0 var(--neon-d),0 10px 22px rgba(0,255,110,.3),inset 0 2px 0 rgba(255,255,255,.45);transition:transform .06s,box-shadow .06s}
.ta-btn:active{transform:translateY(4px);box-shadow:0 1px 0 var(--neon-d),inset 0 2px 0 rgba(255,255,255,.45)}
.ta-btn[disabled]{cursor:progress;filter:saturate(.6) brightness(.85)}
.ta-btn-ghost{display:block;width:100%;margin:14px 0 0;padding:11px;border:0;border-radius:10px;background:rgba(0,0,0,.28);color:#fff;font:600 15px var(--body);cursor:pointer}
.ta-btn-ghost[disabled]{opacity:.6;cursor:not-allowed}
.ta-step h2{margin:4px 0 6px;font:800 28px/1 var(--display);color:#fff}
.ta-form.ta-step{margin-top:2px}
.ta-step p.ta-sub{margin:0 0 16px;font-size:15px;line-height:1.5;color:rgba(255,255,255,.88)}
.ta-step p.ta-sub b{color:#fff}
.ta-otp{height:60px;text-align:center;font:700 28px var(--body);letter-spacing:12px;font-variant-numeric:tabular-nums;padding-left:24px}
.ta-otp::placeholder{font-size:22px;letter-spacing:12px}
.ta-testcode{margin:0 0 14px;padding:10px 12px;border-radius:10px;background:var(--card-gold);color:var(--ink);font:600 14px/1.45 var(--body);box-shadow:0 3px 0 var(--card-gold-d)}
.ta-testcode b{font-size:18px;letter-spacing:3px}
.ta-back{display:inline-flex;align-items:center;gap:6px;margin:0 0 6px;padding:4px 0;border:0;background:none;color:#fff;font:600 15px var(--body);cursor:pointer}
.ta-msg{font-size:14px;line-height:1.45}
.ta-msg:empty{display:none}
.ta-msg.err{margin:6px 0 0;padding:10px 12px;border-radius:10px;background:rgba(40,6,2,.65);color:#ffd2ca}
.ta-msg.ok{margin:6px 0 0;padding:10px 12px;border-radius:10px;background:rgba(0,0,0,.3);color:#d8ffe9}
@media (max-width:359px){.ta-page{padding-left:12px;padding-right:12px}.ta-card{padding:20px 16px 26px}.ta-dob{gap:6px}select.ta-input{padding-left:9px;padding-right:22px;background-position:right 7px center}}

/* ── document pages (how to play, legal, faq…) ── */
.doc{width:100%;max-width:820px;margin:0 auto;padding:0 14px calc(env(safe-area-inset-bottom) + 28px)}
.doc-head{padding:18px 6px 18px}
.doc-head h1{margin:0;font:800 clamp(40px,11vw,64px)/.92 var(--display);text-transform:uppercase;color:#fff}
.doc-head p{margin:12px 0 0;max-width:60ch;font-size:17px;line-height:1.55;color:var(--muted)}
.doc-tabs{display:flex;gap:8px;overflow-x:auto;padding:4px 6px 14px;scrollbar-width:none}
.doc-tabs::-webkit-scrollbar{display:none}
.doc-tabs a{flex:none;padding:9px 14px;border-radius:10px;background:rgba(4,23,12,.8);color:var(--muted);text-decoration:none;font:700 15px var(--body);box-shadow:inset 0 0 0 2px rgba(89,255,180,.2)}
.doc-tabs a[aria-current="page"]{background:var(--paper);color:var(--card-green-d);box-shadow:0 3px 0 rgba(0,0,0,.3)}
.doc-card{margin:0 0 18px;padding:26px 24px 24px}
.doc-card>*{position:relative}
.doc-card h2{margin:0 0 10px;font:800 28px/1 var(--display);text-transform:uppercase;color:#fff}
.doc-card h3{margin:18px 0 6px;font:800 21px/1.1 var(--display);color:#fff}
.doc-card p,.doc-card li{font-size:16px;line-height:1.65;color:rgba(255,255,255,.92)}
.doc-card p{margin:0 0 10px}
.doc-card ul,.doc-card ol{margin:0 0 10px;padding-left:20px}
.doc-card li{margin:0 0 6px}
.doc-card a{color:var(--paper);font-weight:700;text-underline-offset:2px}
.doc-card strong{color:#fff}
.doc-card code{font-size:14px;padding:1px 6px;border-radius:5px;background:rgba(0,0,0,.3)}
.doc-updated{display:inline-block;margin:0 0 14px;padding:4px 10px;border-radius:6px;background:rgba(0,0,0,.28);font:600 13px var(--body);color:#fff}
.doc-lede{margin:0 0 14px;padding:14px 16px;border-radius:12px;background:rgba(0,0,0,.25);font-size:16px;line-height:1.55;color:#fff}
.doc-foot{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin:24px 0 0}
@media (min-width:760px){.doc{padding:0 24px 40px}.doc-card{padding:34px 40px 30px}}

@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}}
`;

export function logoBlock({ tagline = true } = {}) {
  return `<a class="ta-logo" href="/" aria-label="${BRAND} home"><img src="/assets/logo-tapam.svg" width="179" height="48" alt="tap am"></a>${tagline ? `<p class="ta-tagline">${esc(TAGLINE)}</p>` : ''}`;
}

export const poweredBy = () => `<p class="ta-powered">Powered by <a href="${FERRN_URL}" target="_blank" rel="noopener">Ferrn Agency</a></p>`;

export const ICONS = {
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4z" fill="currentColor" stroke="none"/><path class="w" d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/><path class="x" d="M16 9l6 6M22 9l-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>'
};

// Full-screen menu, opened by any [data-menu-open] button (handled in /assets/app.js).
export function menuSheet(user) {
  const account = user
    ? `<a class="tcard tcard--flat" href="${user.role === 'ADMIN' ? '/admin' : '/dashboard'}">Play<small>Your pools and taps</small></a>
       <button type="button" class="tcard tcard--flat tcard--ink" data-logout>Log out<small>See you soon</small></button>`
    : `<a class="tcard tcard--flat" href="/signup">Sign up<small>Free. Takes one minute</small></a>
       <a class="tcard tcard--flat tcard--ink" href="/login">Login<small>Welcome back</small></a>`;
  return `<div class="sheet" id="menu" role="dialog" aria-modal="true" aria-label="Menu" hidden>
  <div class="sheet-head"><a class="ta-logo" style="width:96px" href="/" aria-label="${BRAND} home"><img src="/assets/logo-tapam.svg" width="179" height="48" alt="tap am"></a><button type="button" class="iconbtn" data-menu-close aria-label="Close menu">${ICONS.close}</button></div>
  <nav class="sheet-grid" aria-label="Main">
    ${account}
    <a class="tcard tcard--flat tcard--orange" href="/how-to-play">How to play<small>Rules of the tap</small></a>
    <a class="tcard tcard--flat tcard--gold" href="/merch">Merch<small>Wear the tap</small></a>
    <a class="tcard tcard--flat tcard--mustard" href="/rules">Rules<small>Fair play and policies</small></a>
    <a class="tcard tcard--flat" href="/faq">FAQ<small>Questions wey people dey ask</small></a>
    <a class="tcard tcard--flat tcard--ink" href="/about">About<small>Who we be</small></a>
    <button type="button" class="tcard tcard--flat tcard--orange" data-install hidden>Install app<small>Put Tap Am for your home screen</small></button>
  </nav>
  <div class="sheet-foot"><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/disclaimer">Disclaimer</a><a href="/suggest">Suggest something</a><a href="${FERRN_URL}" target="_blank" rel="noopener">Ferrn Agency</a></div>
</div>`;
}

export function topBar(user, { back = false, extra = '' } = {}) {
  return `<header class="bar">
  <div style="display:flex;align-items:center;gap:8px">${back ? `<a class="iconbtn" href="/" aria-label="Back to home">${ICONS.back}</a>` : ''}<a class="ta-logo" href="/" aria-label="${BRAND} home"><img src="/assets/logo-tapam.svg" width="179" height="48" alt="tap am"></a></div>
  <div class="bar-right">${extra}<button type="button" class="iconbtn" data-menu-open aria-label="Open menu" aria-controls="menu">${ICONS.menu}</button></div>
</header>`;
}

export function themeShell({ title, description = 'Tap ammm jor, make you chop ammm. Live tapping games for the people.', body, script = '', css = '', bodyClass = '' }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#01240c">
<meta name="description" content="${esc(description)}">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Tap Am">
<meta property="og:title" content="${esc(title)} | ${BRAND}"><meta property="og:description" content="${esc(description)}"><meta property="og:image" content="/assets/icons/icon-512.png">
<title>${esc(title)} | ${BRAND}</title>
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/assets/logo-tapam.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;1,800&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}${css}</style>
<script nonce="__NONCE__" src="/assets/app.js?v=${ASSET_VERSION}" defer></script></head><body${bodyClass ? ` class="${bodyClass}"` : ''}>${body}${script ? `<script nonce="__NONCE__">${script}</script>` : ''}</body></html>`;
}
