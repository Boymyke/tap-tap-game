// Tap Am design system.
// Plain gradient background (Mapo/Nepo can change it), white content panels, bright patterned
// cards with white borders and hard shadows, Barlow / Barlow Condensed type, neon-green accents.
// Logo files come from public/assets/brand/src (see scripts/brand.mjs).
import { THEMES } from '../tiers.js';

export const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const BRAND = 'Tap Am';
export const TAGLINE = 'tap ammm make you chop moneyyyy';
export const FERRN_URL = 'https://www.ferrnagency.com';
export const ASSET_VERSION = '7';

// Tone-on-tone diamond texture for cards (like printed match cards).
const PATTERN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'%3E%3Cg fill='%23fff' fill-opacity='.07'%3E%3Cpath d='M0 0l14 14L0 28zM28 0l14 14-14 14zM14 28l14 14-14 14zM42 28l14 14-14 14z'/%3E%3C/g%3E%3Cg fill='%23000' fill-opacity='.09'%3E%3Cpath d='M28 0L14 14l14 14zM56 0L42 14l14 14zM28 28L14 42l14 14zM56 28L42 42l14 14z'/%3E%3C/g%3E%3C/svg%3E\")";

const CSS = `
:root{
  --bg-a:#6A35FF;--bg-b:#2A0F8F;--bg-deep:#1B0B4D;--accent:#00FF6E;
  --ink:#150B33;--ink-2:#2B1C5E;--ink-soft:#5B4E86;
  --text:#fff;--muted:#E4DAFF;--dim:#B9A9F2;
  --paper:#fff;--cloud:#F4F0FF;--line:#E6DEFF;
  --green:#00FF6E;--green-d:#00B852;--sunny:#FFD23F;--sunny-d:#D9A400;--pink:#FF4FA3;--pink-d:#C42A78;--sky:#2E8BFF;--sky-d:#1A5FC2;
  --orange:#FF8A2A;--orange-d:#C95F10;--teal:#21D4C8;--teal-d:#0F9A91;--purple:#9161FF;--purple-d:#5E30D6;--danger:#FF4D5E;--danger-d:#C21F33;
  --ts:0 1.5px 0 rgba(0,0,0,.6);--ts-big:0 3px 0 rgba(0,0,0,.45);
  --r:18px;--r-sm:12px;--r-btn:12px;--r-in:10px;--r-tag:6px;--pattern:${PATTERN};
  --sh:0 6px 0 rgba(21,11,51,.28);--sh-lg:0 8px 0 rgba(21,11,51,.3),0 18px 40px rgba(10,0,40,.35);
  --display:"Barlow Condensed","Arial Narrow",system-ui,sans-serif;--body:"Barlow",system-ui,-apple-system,"Segoe UI",Arial,sans-serif;
  --seg-on:#5dff4a;--seg-off:rgba(93,255,74,.12);
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;height:100%;background:var(--bg-deep)}
[hidden]{display:none!important}
body{margin:0;min-height:100%;color:var(--text);font:400 16px/1.45 var(--body);-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;overscroll-behavior-y:none;
  background:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:manipulation}
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;
  background:var(--bg-custom,linear-gradient(165deg,var(--bg-a) 0%,var(--bg-b) 58%,var(--bg-deep) 100%))}
/* Login / sign-up: slowly moving gradient. */
body.bg-anim::before{background:linear-gradient(120deg,var(--bg-a),var(--pink),var(--bg-b),var(--sky),var(--bg-deep),var(--bg-a));background-size:400% 400%;animation:bgmove 18s ease-in-out infinite}
@keyframes bgmove{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
input,textarea,select,[contenteditable]{-webkit-user-select:text;user-select:text}
a{color:inherit}
img,svg{max-width:100%}
:focus-visible{outline:3px solid var(--accent);outline-offset:2px;border-radius:8px}
button{font-family:inherit}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.ink{color:var(--ink)}
.ts{text-shadow:var(--ts)}

/* ── sticker cards ───────────────────────────── */
.tcard,.card{--c:var(--sky);--cd:var(--sky-d);position:relative;border-radius:var(--r);background:var(--pattern) 0 0/56px 56px,var(--c);color:#fff;border:3px solid rgba(255,255,255,.92);box-shadow:0 6px 0 var(--cd),0 14px 30px rgba(10,0,40,.25);text-shadow:var(--ts)}
.tcard h1,.tcard h2,.tcard h3,.card h1,.card h2,.card h3{text-shadow:var(--ts-big)}
.tcard--flat{box-shadow:0 5px 0 var(--cd)}
.c-sky{--c:var(--sky);--cd:var(--sky-d)}.c-pink,.tcard--pink{--c:var(--pink);--cd:var(--pink-d)}.c-orange,.tcard--orange{--c:var(--orange);--cd:var(--orange-d)}
.c-purple,.tcard--purple{--c:var(--purple);--cd:var(--purple-d)}.c-teal,.tcard--mustard{--c:var(--teal);--cd:var(--teal-d)}
.c-ink,.tcard--ink{--c:var(--ink);--cd:#000}
.c-sunny,.tcard--gold{--c:var(--sunny);--cd:var(--sunny-d);color:var(--ink);text-shadow:none}
.c-green{--c:var(--green);--cd:var(--green-d);color:var(--ink);text-shadow:none}
.c-sunny h1,.c-sunny h2,.c-sunny h3,.tcard--gold h1,.tcard--gold h2,.tcard--gold h3,.c-green h1,.c-green h2,.c-green h3{text-shadow:none}
.c-sunny a:not(.btn),.c-green a:not(.btn),.tcard--gold a:not(.btn){color:var(--ink)}
.vs{display:inline-grid;place-items:center;min-width:48px;height:38px;padding:0 10px;border-radius:var(--r-btn);background:var(--ink);color:var(--sunny);font:900 italic 20px/1 var(--display);border:3px solid #fff;box-shadow:0 4px 0 rgba(0,0,0,.35);transform:rotate(-6deg);text-shadow:none}
.code{font:900 clamp(26px,7.5vw,40px)/.95 var(--display);letter-spacing:.3px;text-transform:uppercase;color:#fff;text-shadow:var(--ts-big)}
.tag{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:var(--r-tag);background:rgba(0,0,0,.3);font:700 12px/1.3 var(--body);color:#fff;text-shadow:none}

/* ── white panels (forms, lists) ─────────────── */
.panel{position:relative;padding:16px;border-radius:var(--r);background:var(--paper);color:var(--ink);box-shadow:var(--sh)}
.panel+.panel{margin-top:12px}
.panel .muted,.panel .small.muted{color:var(--ink-soft)}
.panel a:not(.btn){color:var(--purple-d);font-weight:700}
.muted{color:var(--muted)}.small{font-size:13px}.dim{color:var(--dim)}

/* ── 7-segment displays (game + landing only) ─ */
.segbox{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:12px;background:var(--ink);border:2px solid rgba(255,255,255,.85);box-shadow:inset 0 4px 10px rgba(0,0,0,.6),0 3px 0 rgba(0,0,0,.35)}
.seg{display:inline-flex;align-items:center;gap:.08em;height:1em;font-size:22px;filter:drop-shadow(0 0 5px rgba(93,255,74,.55))}
.seg svg{display:block;height:1em;width:.6em;overflow:visible}
.seg svg.c{width:.24em}
.seg polygon,.seg circle{fill:var(--seg-off);transition:fill .06s}
.seg .on{fill:var(--seg-on)}
.seglabel{font:700 11px/1.1 var(--body);color:#C9BDF5;text-transform:uppercase;letter-spacing:.4px;text-shadow:none}

/* ── buttons ─────────────────────────────────── */
.btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:52px;padding:0 22px;border:0;border-radius:var(--r-btn);background:var(--ink);color:#fff;font:800 19px/1 var(--display);letter-spacing:.3px;text-decoration:none;cursor:pointer;text-shadow:none;white-space:nowrap;
  box-shadow:0 5px 0 #000,0 10px 20px rgba(10,0,40,.25);transition:transform .08s,box-shadow .08s,filter .15s,background .15s}
.btn:hover{filter:brightness(1.1)}
.btn:active{transform:translateY(4px);box-shadow:0 1px 0 #000}
.btn[disabled]{cursor:not-allowed;filter:saturate(.5) brightness(.9);opacity:.7}
.btn--green{background:var(--green);color:var(--ink);box-shadow:0 5px 0 var(--green-d),0 10px 22px rgba(0,255,110,.25)}
.btn--green:active{box-shadow:0 1px 0 var(--green-d)}
.btn--white{background:#fff;color:var(--ink);box-shadow:0 5px 0 #CFC2FF}
.btn--white:active{box-shadow:0 1px 0 #CFC2FF}
.btn--gold,.btn--sunny{background:var(--sunny);color:var(--ink);box-shadow:0 5px 0 var(--sunny-d)}
.btn--ghost{background:rgba(255,255,255,.12);color:#fff;box-shadow:inset 0 0 0 2.5px rgba(255,255,255,.75)}
.btn--ghost:active{box-shadow:inset 0 0 0 2.5px #fff}
.panel .btn--ghost,.btn--soft{background:var(--cloud);color:var(--ink);box-shadow:inset 0 0 0 2px var(--line)}
.btn--danger{background:var(--danger);color:#fff;box-shadow:0 5px 0 var(--danger-d)}
.btn--block{width:100%;white-space:normal;text-align:center;line-height:1.15;padding-top:8px;padding-bottom:8px}
.btn svg{flex:none;width:20px;height:20px}
.btn--sm{min-height:40px;padding:0 15px;font-size:15px;box-shadow:0 3px 0 #000}
.btn--sm.btn--green{box-shadow:0 3px 0 var(--green-d)}.btn--sm.btn--white{box-shadow:0 3px 0 #CFC2FF}.btn--sm.btn--danger{box-shadow:0 3px 0 var(--danger-d)}.btn--sm.btn--gold{box-shadow:0 3px 0 var(--sunny-d)}
.btn.is-loading{color:transparent!important;pointer-events:none}
.btn.is-loading::after{content:"";position:absolute;left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;border:3.5px solid currentColor;border-color:rgba(255,255,255,.35);border-top-color:#fff;animation:spin .7s linear infinite}
.btn--green.is-loading::after,.btn--white.is-loading::after,.btn--gold.is-loading::after,.btn--soft.is-loading::after{border-color:rgba(21,11,51,.2);border-top-color:var(--ink)}
.btn--shine{overflow:hidden;isolation:isolate}
.btn--shine::before{content:"";position:absolute;top:-30%;bottom:-30%;left:-70%;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.75),transparent);transform:skewX(-22deg);animation:shine 2.8s ease-in-out infinite;pointer-events:none;z-index:-1}
@keyframes shine{0%{left:-70%}55%,100%{left:135%}}
.iconbtn{position:relative;display:inline-grid;place-items:center;width:42px;height:42px;border:0;border-radius:var(--r-btn);background:rgba(255,255,255,.14);color:#fff;cursor:pointer;text-decoration:none;box-shadow:inset 0 0 0 2px rgba(255,255,255,.25)}
.iconbtn svg{width:22px;height:22px}
.iconbtn:active{transform:scale(.94)}

/* ── loading ring ────────────────────────────── */
.ring{display:inline-block;width:30px;height:30px;border-radius:50%;border:4px solid rgba(255,255,255,.25);border-top-color:var(--accent);animation:spin .75s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.navload{position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 64px);z-index:100;display:flex;align-items:center;gap:10px;transform:translateX(-50%);padding:8px 14px 8px 9px;border-radius:999px;background:var(--ink);color:#fff;font:700 14px var(--body);box-shadow:0 8px 24px rgba(0,0,0,.4);opacity:0;pointer-events:none;transition:opacity .15s}
.navload .ring{width:22px;height:22px;border-width:3.5px}
html.is-nav .navload{opacity:1;transition-delay:.12s}
.navbar-progress{position:fixed;left:0;top:0;height:3px;z-index:101;width:0;background:var(--accent);box-shadow:0 0 10px var(--accent);transition:width .3s ease-out,opacity .3s}
.skel{border-radius:var(--r);background:linear-gradient(90deg,rgba(255,255,255,.08),rgba(255,255,255,.18),rgba(255,255,255,.08)) 0 0/200% 100%;animation:skel 1.2s linear infinite}
@keyframes skel{to{background-position:-200% 0}}

/* ── menu sheet ──────────────────────────────── */
.bar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:calc(env(safe-area-inset-top) + 10px) 14px 10px}
.bar .ta-logo{width:96px;flex:none}
.bar-right{display:flex;align-items:center;gap:8px}
.sheet{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;background:rgba(21,11,51,.97);padding:calc(env(safe-area-inset-top) + 10px) 16px calc(env(safe-area-inset-bottom) + 16px);overflow:auto;animation:sheet-in .18s ease-out}
@keyframes sheet-in{from{opacity:0;transform:translateY(-8px)}}
.sheet-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.sheet-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:560px;width:100%;margin:0 auto}
.sheet-grid a,.sheet-grid button{min-height:88px;padding:14px;display:flex;flex-direction:column;justify-content:flex-end;gap:3px;text-decoration:none;text-align:left;cursor:pointer;font:800 20px/1.05 var(--display)}
.sheet-grid small{font:500 12.5px/1.3 var(--body)}
.sheet-foot{max-width:560px;width:100%;margin:18px auto 0;display:flex;flex-wrap:wrap;gap:10px 18px;justify-content:center;font-size:14px}
.sheet-foot a{color:var(--muted);text-decoration:none}
.sheet-foot a:hover{color:var(--accent)}

/* ── connection banner, toast, dialogs ───────── */
.netbar{position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 10px);z-index:110;transform:translateX(-50%);display:flex;align-items:center;gap:10px;width:max-content;max-width:calc(100% - 24px);padding:10px 16px;border-radius:999px;background:var(--danger);color:#fff;font:700 14px/1.3 var(--body);box-shadow:0 10px 30px rgba(0,0,0,.4);text-shadow:var(--ts);animation:drop .25s cubic-bezier(.2,1.4,.4,1)}
@keyframes drop{from{transform:translate(-50%,-20px);opacity:0}}
.netbar.ok{background:var(--green);color:var(--ink);text-shadow:none}
.netbar-dot{flex:none;width:10px;height:10px;border-radius:50%;background:#fff;box-shadow:0 0 0 4px rgba(255,255,255,.3);animation:blink 1s infinite}
.netbar.ok .netbar-dot{background:var(--ink);box-shadow:none;animation:none}
@keyframes blink{50%{opacity:.35}}
.toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 92px);z-index:105;transform:translateX(-50%);display:flex;align-items:center;gap:10px;width:max-content;max-width:calc(100% - 24px);padding:10px 10px 10px 16px;border-radius:18px;background:var(--ink);color:#fff;font:600 15px/1.35 var(--body);box-shadow:0 12px 30px rgba(0,0,0,.45);animation:toast-in .22s cubic-bezier(.2,1.3,.4,1)}
.toast.err{background:#fff;color:var(--ink);box-shadow:0 0 0 3px var(--danger),0 12px 30px rgba(0,0,0,.45)}
.toast .ico{flex:none;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--green);color:var(--ink);font-weight:900}
.toast.err .ico{background:var(--danger);color:#fff}
.toast .go{flex:none;padding:8px 12px;border-radius:999px;background:var(--green);color:var(--ink);font:800 13px var(--body);text-decoration:none;white-space:nowrap}
.toast.err .go{background:var(--ink);color:#fff}
.toast .msg{padding-right:6px}
@keyframes toast-in{from{opacity:0;transform:translate(-50%,10px) scale(.96)}}
@media (min-width:900px){.toast{bottom:28px}}
.wtoast{position:fixed;left:12px;bottom:calc(env(safe-area-inset-bottom) + 14px);z-index:90;display:flex;align-items:center;gap:10px;max-width:min(340px,calc(100% - 24px));padding:9px 14px 9px 9px;border-radius:var(--r-sm);background:#fff;color:var(--ink);font:600 13.5px/1.3 var(--body);box-shadow:0 10px 28px rgba(0,0,0,.4);transform:translateY(20px);opacity:0;transition:transform .35s cubic-bezier(.2,1.3,.4,1),opacity .3s;pointer-events:none}
.yt{position:relative;width:100%;aspect-ratio:16/9;background:#000;overflow:hidden}
.yt iframe{position:absolute;inset:0;width:100%;height:100%;border:0;pointer-events:none}
.yt-cover{position:absolute;inset:0;background:transparent}
.yt-mute{position:absolute;right:8px;bottom:8px;z-index:2;min-height:34px;padding:0 12px;border:0;border-radius:999px;background:rgba(0,0,0,.72);color:#fff;font:800 13px var(--body);cursor:pointer;text-transform:none;letter-spacing:0}
.wtoast.in{transform:none;opacity:1}.wtoast.out{transform:translateY(20px);opacity:0}
.wtoast .wt-ic{flex:none;display:grid;place-items:center;width:34px;height:34px;border-radius:var(--r-in);background:var(--green);color:var(--ink);font:900 20px var(--display)}
.wtoast .wt-amt{color:#0A9B4A}.wtoast small{display:block;font-size:12px;color:var(--ink-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px}
.dlg{position:fixed;inset:0;z-index:95;display:grid;place-items:center;padding:16px;background:rgba(10,0,40,.62);animation:fade .15s}
@keyframes fade{from{opacity:0}}
.dlg-in{width:100%;max-width:420px;padding:22px 20px 18px;border-radius:var(--r);background:#fff;color:var(--ink);box-shadow:0 20px 60px rgba(0,0,0,.5);animation:pop .22s cubic-bezier(.2,1.4,.4,1)}
@keyframes pop{from{transform:scale(.9);opacity:0}}
.dlg h3{margin:0 0 8px;font:900 24px/1.05 var(--display)}
.dlg p{margin:0 0 14px;line-height:1.5;color:var(--ink-soft)}
.dlg .dlg-art{display:grid;place-items:center;margin:-60px auto 6px;width:96px;height:96px}
.dlg .actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px}
.dlg .actions .btn{flex:1}
.isteps{margin:0 0 6px;padding:0;list-style:none;counter-reset:s;display:grid;gap:10px}
.isteps li{counter-increment:s;display:grid;grid-template-columns:32px 1fr;gap:10px;align-items:start;font-size:15px;line-height:1.45;color:var(--ink)}
.isteps li::before{content:counter(s);display:grid;place-items:center;width:32px;height:32px;border-radius:var(--r-in);background:var(--ink);color:var(--green);font:900 17px var(--display)}
.cele{position:fixed;inset:0;z-index:120;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 50% 50%,rgba(255,210,63,.4),rgba(21,11,51,.95) 62%)}
.cele-rays{position:absolute;left:50%;top:50%;width:220vmax;height:220vmax;margin:-110vmax 0 0 -110vmax;background:repeating-conic-gradient(from 0deg,rgba(255,236,140,.16) 0 8deg,transparent 8deg 22deg);animation:spin 14s linear infinite}
.cele-in{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:14px;padding:20px;text-align:center;animation:cele-pop .6s cubic-bezier(.2,1.6,.4,1)}
@keyframes cele-pop{0%{transform:scale(.2) rotate(-14deg);opacity:0}100%{transform:none;opacity:1}}
.cele-k{padding:8px 22px;border-radius:var(--r);background:var(--sunny);border:4px solid #fff;box-shadow:0 6px 0 var(--sunny-d),0 18px 40px rgba(0,0,0,.5);font:900 italic clamp(40px,12vw,90px)/1 var(--display);color:var(--ink)}
.cele-t{font:900 clamp(26px,7vw,52px)/1.05 var(--display);color:#fff;text-shadow:var(--ts-big)}
.cele-bit{position:absolute;left:0;top:0;width:12px;height:16px;border-radius:3px;pointer-events:none;opacity:0}

/* ── logo, footer line ───────────────────────── */
.ta-logo{display:block;width:150px;line-height:0}
.ta-logo img{width:100%;height:auto}
.ta-tagline{margin:10px 0 0;max-width:260px;text-align:center;font:700 italic 16px/1.2 var(--body);color:#fff;text-shadow:var(--ts)}
.ta-powered{margin:34px 0 0;font-size:14px;color:#fff;text-align:center;text-shadow:var(--ts)}
.ta-powered a{color:var(--sunny);font-weight:800;text-decoration:none}
.ta-note{font:600 14px/1.45 var(--body);color:var(--ink-soft)}.ta-note a{color:var(--purple-d);font-weight:800}

/* ── forms (white panels / auth card) ────────── */
.ta-page{min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;align-items:center;padding:max(36px,calc(env(safe-area-inset-top) + 18px)) 16px max(28px,env(safe-area-inset-bottom))}
.ta-card{position:relative;width:100%;max-width:400px;margin-top:22px;padding:20px 20px 24px;border-radius:var(--r);background:#fff;color:var(--ink);box-shadow:var(--sh-lg)}
.ta-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:5px;border-radius:var(--r-btn);background:var(--cloud)}
.ta-tab{display:flex;align-items:center;justify-content:center;height:46px;border:0;border-radius:var(--r-in);background:transparent;color:var(--ink-soft);font:800 18px/1 var(--display);text-decoration:none;cursor:pointer}
.ta-tab[aria-selected="true"]{background:var(--ink);color:#fff;box-shadow:0 3px 0 #000}
.ta-form{margin-top:18px}
.ta-field{margin:0 0 15px}
.ta-label{display:flex;align-items:center;gap:6px;margin:0 0 7px;font:700 15px/1.2 var(--body);color:var(--ink)}
.ta-label small{font-weight:500;color:var(--ink-soft)}
.ta-input{display:block;width:100%;height:50px;margin:0;padding:0 15px;border:2px solid var(--line);border-radius:var(--r-in);background:var(--cloud);color:var(--ink);font:600 16px var(--body);outline:none;transition:border-color .15s,box-shadow .15s,background .15s}
.ta-input::placeholder{color:#9A8FC2;font-weight:500;opacity:1}
.ta-input:focus{border-color:var(--purple);background:#fff;box-shadow:0 0 0 4px rgba(145,97,255,.2)}
.ta-input.is-invalid{border-color:var(--danger);background:#FFF2F4}
.ta-input[readonly]{background:#fff}
textarea.ta-input{height:auto;min-height:96px;padding:12px 15px;resize:vertical;line-height:1.45}
select.ta-input{appearance:none;-webkit-appearance:none;padding-right:34px;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1.5l5 5 5-5' stroke='%23150B33' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center}
select.ta-input:invalid{color:#9A8FC2}
.ta-hint{margin:6px 0 0;font-size:13px;line-height:1.4;color:var(--ink-soft)}
.ta-error{display:flex;gap:6px;align-items:flex-start;margin:7px 0 0;padding:7px 10px;border-radius:12px;background:#FFE8EB;font:700 13px/1.35 var(--body);color:#A3122A}
.ta-error::before{content:"!";flex:none;display:grid;place-items:center;width:17px;height:17px;border-radius:50%;background:var(--danger);color:#fff;font-size:11px;font-weight:900}
.ta-error:empty{display:none}
.ta-pw{position:relative}
.ta-pw .ta-input{padding-right:50px}
.ta-eye{position:absolute;top:3px;right:3px;width:44px;height:44px;display:grid;place-items:center;border:0;background:none;color:var(--ink-soft);cursor:pointer;border-radius:12px}
.ta-eye svg{width:18px;height:16px}
.ta-eye .ta-eye-open{display:none}
.ta-eye[aria-pressed="true"] .ta-eye-open{display:block}
.ta-eye[aria-pressed="true"] .ta-eye-closed{display:none}
.ta-forgot-row{display:flex;justify-content:flex-end}
.ta-forgot{margin:4px 0 0;padding:6px 0;border:0;background:none;color:var(--purple-d);font:700 13px var(--body);text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.ta-check{display:flex;gap:10px;align-items:flex-start;margin:0 0 4px;font:500 14px/1.45 var(--body);color:var(--ink);cursor:pointer}
.ta-check input{appearance:none;-webkit-appearance:none;flex:none;display:grid;place-content:center;width:24px;height:24px;margin:0;border:2.5px solid var(--ink);border-radius:8px;background:#fff;cursor:pointer}
.ta-check input:checked{background:var(--green);border-color:var(--ink)}
.ta-check input:checked::after{content:"";width:11px;height:6px;margin-top:-3px;border:3px solid var(--ink);border-top:0;border-right:0;transform:rotate(-45deg)}
.ta-check input.is-invalid{border-color:var(--danger)}
.ta-check a{color:var(--purple-d);font-weight:800;text-underline-offset:2px}
.ta-btn{position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:56px;margin:18px 0 0;border:0;border-radius:var(--r-btn);background:var(--ink);color:#fff;font:800 20px/1 var(--display);cursor:pointer;box-shadow:0 5px 0 #000;transition:transform .06s,box-shadow .06s}
.ta-btn:active{transform:translateY(4px);box-shadow:0 1px 0 #000}
.ta-btn[disabled]{cursor:progress;opacity:.85}
.ta-btn--shine{overflow:hidden;isolation:isolate}
.ta-btn--shine::before{content:"";position:absolute;top:-30%;bottom:-30%;left:-70%;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-22deg);animation:shine 2.8s ease-in-out infinite;pointer-events:none;z-index:-1}
.ta-btn-ghost{display:block;width:100%;margin:12px 0 0;padding:12px;border:0;border-radius:var(--r-btn);background:var(--cloud);color:var(--ink);font:700 15px var(--body);cursor:pointer}
.ta-btn-ghost[disabled]{opacity:.6;cursor:not-allowed}
.ta-step h2{margin:4px 0 6px;font:900 26px/1.05 var(--display);color:var(--ink)}
.ta-form.ta-step{margin-top:2px}
.ta-step p.ta-sub{margin:0 0 16px;font-size:15px;line-height:1.5;color:var(--ink-soft)}
.ta-step p.ta-sub b{color:var(--ink)}
.ta-otp{height:62px;text-align:center;font:800 28px var(--body);letter-spacing:12px;font-variant-numeric:tabular-nums;padding-left:24px}
.ta-otp::placeholder{font-size:22px;letter-spacing:12px}
.ta-testcode{margin:0 0 14px;padding:10px 12px;border-radius:14px;background:var(--sunny);color:var(--ink);font:600 14px/1.45 var(--body)}
.ta-testcode b{font-size:18px;letter-spacing:3px}
.ta-back{display:inline-flex;align-items:center;gap:6px;margin:0 0 6px;padding:4px 0;border:0;background:none;color:var(--ink);font:700 15px var(--body);cursor:pointer}
.ta-msg{font-size:14px;line-height:1.45}
.ta-msg:empty{display:none}
.ta-msg.err{margin:6px 0 0;padding:10px 12px;border-radius:14px;background:#FFE8EB;color:#A3122A;font-weight:700}
.ta-msg.ok{margin:6px 0 0;padding:10px 12px;border-radius:14px;background:#E3FFEF;color:#0B6B37;font-weight:700}
.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media (max-width:359px){.ta-page{padding-left:10px;padding-right:10px}.ta-card{padding:18px 14px 22px}.two{grid-template-columns:1fr}}

.seg-choice{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:5px;padding:5px;border-radius:var(--r-btn);background:var(--cloud)}
.seg-choice label{position:relative;display:flex;align-items:center;justify-content:center;min-height:44px;padding:6px 8px;border-radius:var(--r-in);color:var(--ink-soft);font:800 15px/1.1 var(--display);text-align:center;cursor:pointer}
.seg-choice input{position:absolute;opacity:0;pointer-events:none}
.seg-choice label:has(input:checked){background:var(--ink);color:#fff;box-shadow:0 3px 0 #000}
.seg-choice label:has(input:focus-visible){outline:3px solid var(--purple)}
@media (max-width:420px){.seg-choice.wrap4{grid-auto-flow:row;grid-template-columns:1fr 1fr}}
/* ── info tooltips ───────────────────────────── */
.tip{position:relative;display:inline-grid;place-items:center;width:22px;height:22px;border:0;border-radius:50%;background:var(--ink);color:#fff;font:800 13px/1 var(--display);cursor:pointer;vertical-align:middle}
.tip-pop{position:absolute;z-index:40;left:50%;bottom:calc(100% + 10px);width:min(260px,70vw);transform:translateX(-50%);padding:10px 12px;border-radius:14px;background:var(--ink);color:#fff;font:500 13.5px/1.45 var(--body);text-align:left;box-shadow:0 10px 26px rgba(0,0,0,.35);animation:pop .15s}
.tip-pop::after{content:"";position:absolute;left:50%;top:100%;margin-left:-7px;border:7px solid transparent;border-top-color:var(--ink)}

/* ── document pages (how to play, legal, faq…) ─ */
.doc{width:100%;max-width:820px;margin:0 auto;padding:0 14px calc(env(safe-area-inset-bottom) + 28px)}
.doc-head{padding:14px 4px 16px}
.doc-head h1{margin:0;font:900 clamp(36px,10vw,58px)/.95 var(--display);color:#fff;text-shadow:var(--ts-big)}
.doc-head p{margin:12px 0 0;max-width:60ch;font-size:17px;line-height:1.55;color:var(--muted)}
.doc-tabs{display:flex;gap:8px;overflow-x:auto;padding:4px 4px 14px;scrollbar-width:none}
.doc-tabs::-webkit-scrollbar{display:none}
.doc-tabs a{flex:none;padding:10px 15px;border-radius:var(--r-btn);background:rgba(255,255,255,.14);color:#fff;text-decoration:none;font:700 15px var(--body);box-shadow:inset 0 0 0 2px rgba(255,255,255,.22)}
.doc-tabs a[aria-current="page"]{background:#fff;color:var(--ink);box-shadow:0 3px 0 rgba(0,0,0,.25)}
.doc-card{margin:0 0 18px;padding:24px 22px 22px;border-radius:var(--r);background:#fff;color:var(--ink);box-shadow:var(--sh)}
.doc-card h2{margin:0 0 10px;font:900 26px/1.05 var(--display);color:var(--ink)}
.doc-card h3{margin:20px 0 6px;font:800 20px/1.15 var(--display);color:var(--ink)}
.doc-card p,.doc-card li{font-size:16px;line-height:1.65;color:#2B2250}
.doc-card p{margin:0 0 10px}
.doc-card ul,.doc-card ol{margin:0 0 10px;padding-left:20px}
.doc-card li{margin:0 0 6px}
.doc-card a{color:var(--purple-d);font-weight:700;text-underline-offset:2px}
.doc-card strong{color:var(--ink)}
.doc-card code{font-size:14px;padding:1px 6px;border-radius:6px;background:var(--cloud)}
.doc-card .flag{display:block;margin:10px 0;padding:10px 12px;border-radius:12px;background:#FFF6D6;border:2px dashed var(--sunny-d);font-size:14px;color:#5A4300}
.doc-card .flag::before{content:"Needs legal review: ";font-weight:800}
.doc-updated{display:inline-block;margin:0 0 14px;padding:5px 12px;border-radius:999px;background:var(--cloud);font:700 13px var(--body);color:var(--ink)}
.doc-lede{margin:0 0 14px;padding:14px 16px;border-radius:16px;background:var(--sunny);font-size:16px;line-height:1.55;color:var(--ink);font-weight:500}
.doc-foot{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin:24px 0 0}
.doc-art{float:right;width:84px;margin:-6px -4px 6px 12px}
@media (min-width:760px){.doc{padding:0 24px 40px}.doc-card{padding:32px 38px 28px}.doc-art{width:110px}}

@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}}
`;

// Main logo: "TAP" (white on dark backgrounds, black on light) + the "AM" box: purple by default,
// green on the landing page, blue on login / sign-up. Files are made by scripts/brand.mjs.
export const LOGO_IMG = (w = 150, { dark = false, box = 'purple' } = {}) => {
  const name = (dark ? 'logo' : 'logo-white') + (box === 'green' ? '-green' : box === 'blue' ? '-blue' : '');
  return `<img src="/assets/brand/${name}.svg" width="${w}" height="${Math.round(w * 26.7 / 113.9)}" alt="tap am">`;
};
export function logoBlock({ tagline = true, box = 'blue' } = {}) {
  return `<a class="ta-logo" href="/" aria-label="${BRAND} home">${LOGO_IMG(150, { box })}</a>${tagline ? `<p class="ta-tagline">${esc(TAGLINE)}</p>` : ''}`;
}
export const poweredBy = () => `<p class="ta-powered">Powered by <a href="${FERRN_URL}" target="_blank" rel="noopener">Ferrn Agency</a></p>`;

export const ICONS = {
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4z" fill="currentColor" stroke="none"/><path class="w" d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/><path class="x" d="M16 9l6 6M22 9l-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="3"/><path d="M15 9V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2h3"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v5a2 2 0 002 2h10a2 2 0 002-2v-5"/></svg>',
  qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 20h2M20 14v2" stroke-linecap="round"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="3"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
};

// Full-screen menu, opened by any [data-menu-open] button (handled in /assets/app.js).
export function menuSheet(user) {
  const home = user ? (user.role === 'ADMIN' ? '/admin' : user.role === 'SPONSOR' ? '/sponsor' : '/dashboard') : '/signup';
  const account = user
    ? `<a class="tcard tcard--flat c-green" href="${home}">Play<small>Your pools and taps</small></a>
       <button type="button" class="tcard tcard--flat c-ink" data-logout>Log out<small>See you soon</small></button>`
    : `<a class="tcard tcard--flat c-green" href="/signup">Sign up<small>Free. Takes one minute</small></a>
       <a class="tcard tcard--flat c-ink" href="/login">Login<small>Welcome back</small></a>`;
  return `<div class="sheet" id="menu" role="dialog" aria-modal="true" aria-label="Menu" hidden>
  <div class="sheet-head"><a class="ta-logo" style="width:100px" href="/" aria-label="${BRAND} home">${LOGO_IMG()}</a><button type="button" class="iconbtn" data-menu-close aria-label="Close menu">${ICONS.close}</button></div>
  <nav class="sheet-grid" aria-label="Main">
    ${account}
    ${user && (user.role === 'USER' || user.role === 'SPONSOR') ? `<a class="tcard tcard--flat c-pink" href="/invite">Invite people<small>Share your link</small></a>` : ''}
    <a class="tcard tcard--flat c-orange" href="/how-to-play">How to play<small>Rules of the tap</small></a>
    <a class="tcard tcard--flat c-sunny" href="/plans">Lapo, Mapo, Nepo<small>Compare the tiers</small></a>
    <a class="tcard tcard--flat c-pink" href="/ranks">Ranks<small>What every rank unlocks</small></a>
    <a class="tcard tcard--flat c-sky" href="/top">Top tappers<small>All time, day, week, month, year</small></a>
    <a class="tcard tcard--flat c-teal" href="/winners">Top winners<small>Who don chop the most</small></a>
    <a class="tcard tcard--flat c-orange" href="/players">Find a player<small>Rank, badges, winnings</small></a>
    <a class="tcard tcard--flat c-teal" href="/rules">Rules<small>Fair play and policies</small></a>
    <a class="tcard tcard--flat c-purple" href="/merch">Merch<small>Wear the tap</small></a>
    <a class="tcard tcard--flat c-sky" href="/faq">FAQ<small>Questions wey people dey ask</small></a>
    <button type="button" class="tcard tcard--flat c-green" data-install hidden>Install app<small>Steps for your phone or computer</small></button>
  </nav>
  <div class="sheet-foot"><a href="/about">About</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/fair-play">Fair play</a><a href="/prizes">Prizes &amp; withdrawals</a><a href="/disclaimer">Disclaimer</a><a href="/suggest">Suggest something</a><a href="${FERRN_URL}" target="_blank" rel="noopener">Ferrn Agency</a></div>
</div>`;
}

export function topBar(user, { back = false, extra = '' } = {}) {
  return `<header class="bar">
  <div style="display:flex;align-items:center;gap:8px">${back ? `<a class="iconbtn" href="${user ? '/dashboard' : '/'}" data-back aria-label="Back">${ICONS.back}</a>` : ''}<a class="ta-logo" href="/" aria-label="${BRAND} home">${LOGO_IMG()}</a></div>
  <div class="bar-right">${extra}<button type="button" class="iconbtn" data-menu-open aria-label="Open menu" aria-controls="menu">${ICONS.menu}</button></div>
</header>`;
}

// Theme colours for the page (Nepo themes, landing randomiser, pool colours).
export function themeVars(key = 'grape', extra = '') {
  const t = THEMES[key] || THEMES.grape;
  return `--bg-a:${t.a};--bg-b:${t.b};--bg-deep:${t.deep};--accent:${t.accent};${extra}`;
}

export function themeShell({ title, description = 'Tap amm make you chop big moneyyy. Live tapping games: tap and win big money, free to start.', body, script = '', css = '', bodyClass = '', scripts = [], theme = 'grape', bgCss = '', noZoom = false, head = '', bodyAttr = '' }) {
  const vars = themeVars(theme, bgCss ? `--bg-custom:${bgCss};` : '');
  const t = THEMES[theme] || THEMES.grape;
  return `<!doctype html><html lang="en" style="${esc(vars)}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover${noZoom ? ',maximum-scale=1,user-scalable=no' : ''}">
<meta name="theme-color" content="${t.deep}">
<meta name="description" content="${esc(description)}">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Tap Am">
<meta property="og:title" content="${esc(title)} | ${BRAND}"><meta property="og:description" content="${esc(description)}"><meta property="og:image" content="/assets/icons/og-1200x630.png"><meta name="twitter:card" content="summary_large_image">
<title>${esc(title)} | ${BRAND}</title>
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/assets/icons/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;0,900;1,800;1,900&family=Barlow:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${CSS}${css}</style>${head}
<script nonce="__NONCE__" src="/assets/app.js?v=${ASSET_VERSION}" defer></script>${scripts.map(src => `<script nonce="__NONCE__" src="${src}?v=${ASSET_VERSION}" defer></script>`).join('')}</head><body${bodyClass ? ` class="${bodyClass}"` : ''}${bodyAttr ? ' ' + bodyAttr : ''}>${body}<div class="navload" aria-hidden="true"><span class="ring"></span>Small wait…</div>${script ? `<script nonce="__NONCE__" data-page>(window.TAQ=window.TAQ||[]).push(function(){${script}
});</script>` : ''}</body></html>`;
}
