// Tap Am visual theme — shared by the home, auth and legal pages.
// Colours and sizes come from the Figma reference (Work / Draft / Dump, node 8656:13447).

export const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const BRAND = 'Tap Am';
export const TAGLINE = 'tap ammm jor, make you chop ammm';
export const FERRN_URL = 'https://www.ferrnagency.com';

const CSS = `
:root{
  --bg:#01240c;
  --card-top:#002719;--card-bot:#00130c;
  --tabs-bg:#002418;--tab:#002a1c;--tab-text:#006241;--tab-active:#00724b;
  --label:#d7fff1;--input:#084530;--placeholder:#17986b;--hint:#3fae86;
  --accent:#00ff6e;--accent-border:#42ff6b;--tagline:#59ffb4;
  --ink:#000100;--brand-red:#ff2600;--danger:#ff6b57;
  --body:#bfe9d9;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
[hidden]{display:none!important}
body{margin:0;min-height:100vh;min-height:100dvh;background:var(--bg);color:var(--label);font-family:Roboto,system-ui,-apple-system,"Segoe UI",Arial,sans-serif;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent}
body::before{content:"";position:fixed;inset:0;z-index:-1;background:var(--bg) url(/assets/bg-mobile.jpg) center top/cover no-repeat}
@media (min-width:700px){body::before{background-image:url(/assets/bg-desktop.jpg);background-position:center}}
a{color:inherit}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

.ta-page{min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;align-items:center;padding:max(60px,calc(env(safe-area-inset-top) + 24px)) 20px max(32px,env(safe-area-inset-bottom))}
.ta-logo{display:block;width:179px;line-height:0}
.ta-logo img{width:100%;height:auto}
.ta-tagline{margin:13px 0 0;max-width:220px;text-align:center;font-size:12px;line-height:1.2;color:var(--tagline)}
.ta-powered{margin:60px 0 0;font-size:14px;color:#fff;text-align:center}
.ta-powered a{color:var(--brand-red);font-weight:600;text-decoration:none}
.ta-powered a:hover{text-decoration:underline;text-underline-offset:3px}

.ta-card{width:100%;max-width:362px;margin-top:44px;padding:19px 20px 32px;border-radius:16px;background:linear-gradient(180deg,var(--card-top),var(--card-bot));box-shadow:0 24px 60px rgba(0,0,0,.35)}

.ta-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;height:60px;padding:4px 5px;border-radius:8px;background:var(--tabs-bg)}
.ta-tab{display:flex;align-items:center;justify-content:center;border:0;border-radius:8px;background:var(--tab);color:var(--tab-text);font-family:inherit;font-size:18px;font-weight:500;text-decoration:none;cursor:pointer;transition:background .15s,color .15s}
.ta-tab:hover{color:#0a8a5d}
.ta-tab[aria-selected="true"]{background:var(--tab-active);color:#fff}

.ta-form{margin-top:22px}
.ta-field{margin:0 0 20px}
.ta-label{display:block;margin:0 0 9px;font-size:16px;font-weight:500;line-height:19px;color:var(--label)}
.ta-label small{font-size:13px;font-weight:400;color:var(--placeholder)}
.ta-input{display:block;width:100%;height:42px;margin:0;padding:0 13px;border:1px solid transparent;border-radius:4px;background:var(--input);color:#fff;font-family:inherit;font-size:16px;outline:none;transition:border-color .15s,box-shadow .15s}
.ta-input::placeholder{color:var(--placeholder);font-size:14px;opacity:1}
.ta-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(0,255,110,.15)}
.ta-input.is-invalid{border-color:var(--danger)}
select.ta-input{appearance:none;-webkit-appearance:none;padding-right:28px;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2359ffb4' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 11px center}
select.ta-input:invalid{color:var(--placeholder);font-size:14px}
select.ta-input option{color:#fff;background:#063a28}
.ta-hint{margin:7px 0 0;font-size:12px;line-height:1.35;color:var(--hint)}
.ta-error{display:flex;gap:6px;align-items:flex-start;margin:7px 0 0;font-size:12.5px;line-height:1.4;color:#ff9a8a}
.ta-error::before{content:"!";flex:none;display:grid;place-items:center;width:15px;height:15px;margin-top:1px;border-radius:50%;background:var(--danger);color:#1a0400;font-size:11px;font-weight:700}
.ta-error:empty{display:none}

.ta-pw{position:relative}
.ta-pw .ta-input{padding-right:46px}
.ta-eye{position:absolute;top:0;right:2px;width:42px;height:42px;display:grid;place-items:center;border:0;background:none;color:#4fe39a;cursor:pointer;border-radius:4px}
.ta-eye svg{width:15px;height:13px}
.ta-eye .ta-eye-open{display:none}
.ta-eye[aria-pressed="true"] .ta-eye-open{display:block}
.ta-eye[aria-pressed="true"] .ta-eye-closed{display:none}

.ta-forgot-row{display:flex;justify-content:flex-end}
.ta-forgot{margin:4px 0 0;padding:6px 0;border:0;background:none;color:var(--accent);font-family:inherit;font-size:12px;cursor:pointer}
.ta-forgot:hover{text-decoration:underline}

.ta-dob{display:grid;grid-template-columns:1fr 1.2fr 1.2fr;gap:8px}

.ta-check{display:flex;gap:10px;align-items:flex-start;margin:0 0 4px;font-size:13px;line-height:1.5;color:var(--label);cursor:pointer}
.ta-check input{appearance:none;-webkit-appearance:none;flex:none;display:grid;place-content:center;width:20px;height:20px;margin:0;border:1px solid var(--placeholder);border-radius:4px;background:var(--input);cursor:pointer}
.ta-check input:checked{background:var(--accent);border-color:var(--accent-border)}
.ta-check input:checked::after{content:"";width:10px;height:5px;margin-top:-3px;border:2px solid var(--ink);border-top:0;border-right:0;transform:rotate(-45deg)}
.ta-check input.is-invalid{border-color:var(--danger)}
.ta-check a{color:var(--accent);text-underline-offset:2px}

.ta-btn{display:block;width:100%;height:50px;margin:16px 0 0;border:1px solid var(--accent-border);border-radius:8px;background:var(--accent);color:var(--ink);font-family:inherit;font-size:18px;font-weight:500;cursor:pointer;box-shadow:0 4px 52.6px rgba(0,255,55,.41),inset 0 -4px 4px -2px #002f03;transition:transform .08s,filter .15s}
.ta-btn:hover{filter:brightness(1.06)}
.ta-btn:active{transform:translateY(1px)}
.ta-btn[disabled]{cursor:progress;filter:saturate(.6) brightness(.9)}
.ta-btn--shine{position:relative;overflow:hidden;isolation:isolate}
.ta-btn--shine::after{content:"";position:absolute;top:-30%;bottom:-30%;left:-70%;width:45%;background:linear-gradient(100deg,transparent 0%,rgba(255,255,255,.15) 30%,rgba(255,255,255,.85) 50%,rgba(255,255,255,.15) 70%,transparent 100%);transform:skewX(-22deg);animation:ta-shine 2.6s ease-in-out infinite;pointer-events:none;z-index:-1}
@keyframes ta-shine{0%{left:-70%}55%,100%{left:135%}}
@media (prefers-reduced-motion:reduce){.ta-btn--shine::after{animation:none;display:none}}
.ta-btn-ghost{display:block;width:100%;margin:12px 0 0;padding:10px;border:1px solid rgba(89,255,180,.25);border-radius:8px;background:transparent;color:var(--tagline);font-family:inherit;font-size:14px;cursor:pointer}
.ta-btn-ghost:hover:not([disabled]){border-color:var(--accent);color:var(--accent)}
.ta-btn-ghost[disabled]{opacity:.55;cursor:not-allowed}
.ta-link{border:0;background:none;padding:0;color:var(--accent);font:inherit;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
.ta-form.ta-step{margin-top:2px}
.ta-step h2{margin:6px 0 6px;font-size:20px;font-weight:600;color:#fff}
.ta-step p.ta-sub{margin:0 0 18px;font-size:14px;line-height:1.5;color:var(--body)}
.ta-step p.ta-sub b{color:#fff;font-weight:500}
.ta-otp{height:56px;text-align:center;font-size:26px;letter-spacing:12px;font-variant-numeric:tabular-nums;padding-left:24px}
.ta-otp::placeholder{font-size:22px;letter-spacing:12px}
.ta-testcode{margin:0 0 16px;padding:10px 12px;border-radius:6px;border:1px dashed #ffd23f;background:rgba(255,210,63,.08);color:#ffe28a;font-size:13px;line-height:1.45}
.ta-testcode b{font-size:16px;letter-spacing:3px;color:#fff}
.ta-back{display:inline-flex;align-items:center;gap:6px;margin:0 0 6px;padding:4px 0;border:0;background:none;color:var(--tagline);font-family:inherit;font-size:14px;cursor:pointer}
.ta-back:hover{color:var(--accent)}

.ta-msg{font-size:13px;line-height:1.45}
.ta-msg:empty{display:none}
.ta-msg.err{margin:4px 0 0;padding:10px 12px;border-radius:6px;background:rgba(255,38,0,.12);border:1px solid rgba(255,107,87,.45);color:#ffc2b8}
.ta-msg.ok{margin:4px 0 0;padding:10px 12px;border-radius:6px;background:rgba(0,255,110,.1);border:1px solid rgba(0,255,110,.4);color:#c9ffe2}

@media (max-width:359px){.ta-page{padding-left:14px;padding-right:14px}.ta-card{padding:16px 14px 26px}.ta-tab{font-size:16px}.ta-dob{gap:6px}select.ta-input{padding-left:9px;padding-right:22px;background-position:right 7px center}}
@media (min-width:700px){.ta-card{max-width:400px;padding:22px 24px 36px}}

/* Legal pages */
.ta-page--doc .ta-logo{width:132px}
.ta-page--doc .ta-tagline{display:none}
.ta-doc{width:100%;max-width:760px;margin-top:32px;padding:22px 20px 36px;border-radius:16px;background:linear-gradient(180deg,var(--card-top),var(--card-bot) 60%);box-shadow:0 24px 60px rgba(0,0,0,.35)}
.ta-doc .ta-tabs{grid-template-columns:repeat(3,1fr);height:52px}
.ta-doc .ta-tab{font-size:15px;color:#2a9d72;text-decoration:none}
.ta-doc .ta-tab:hover{color:#4fe39a}
.ta-doc .ta-tab[aria-selected="true"]{color:#fff}
.ta-doc-body{padding:6px 4px 0}
.ta-doc h1{margin:26px 0 6px;font-size:28px;line-height:1.15;font-weight:700;color:#fff;letter-spacing:-.3px}
.ta-updated{margin:0 0 18px;font-size:13px;color:var(--placeholder)}
.ta-lede{margin:0 0 8px;padding:12px 14px;border-left:3px solid var(--accent);border-radius:0 6px 6px 0;background:rgba(0,255,110,.06);color:var(--label);font-size:15px;line-height:1.6}
.ta-doc h2{margin:28px 0 8px;font-size:18px;font-weight:600;color:var(--accent)}
.ta-doc p,.ta-doc li{font-size:15px;line-height:1.65;color:var(--body)}
.ta-doc p{margin:0 0 10px}
.ta-doc ul{margin:0 0 10px;padding-left:20px}
.ta-doc li{margin:0 0 6px}
.ta-doc strong{color:var(--label)}
.ta-doc a{color:var(--accent);text-underline-offset:2px}
.ta-doc code{font-size:13px;padding:1px 5px;border-radius:4px;background:rgba(0,255,110,.08);color:var(--label)}
.ta-doc-foot{display:flex;flex-wrap:wrap;gap:12px 20px;justify-content:space-between;margin-top:30px;padding-top:18px;border-top:1px solid rgba(89,255,180,.15);font-size:14px}
.ta-doc-foot a{text-decoration:none}
.ta-doc-foot a:hover{text-decoration:underline}
@media (min-width:700px){.ta-doc{padding:26px 36px 40px}.ta-doc h1{font-size:34px}}
`;

export function logoBlock({ tagline = true } = {}) {
  return `<a class="ta-logo" href="/" aria-label="${BRAND} home"><img src="/assets/logo-tapam.svg" width="179" height="48" alt="tap am"></a>${tagline ? `<p class="ta-tagline">${esc(TAGLINE)}</p>` : ''}`;
}

export const poweredBy = () => `<p class="ta-powered">Powered by <a href="${FERRN_URL}" target="_blank" rel="noopener">Ferrn Agency</a></p>`;

export function themeShell({ title, description = 'Tap ammm jor, make you chop ammm. A competitive tapping game for the people.', body, script = '', css = '' }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#01240c">
<meta name="description" content="${esc(description)}">
<title>${esc(title)} | ${BRAND}</title>
<link rel="icon" href="/assets/logo-tapam.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}${css}</style></head><body>${body}${script ? `<script nonce="__NONCE__">${script}</script>` : ''}</body></html>`;
}
