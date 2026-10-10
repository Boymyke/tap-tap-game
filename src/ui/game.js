// The game screen: live board (top 5, scrollable), one big tap card, booster button (bottom left) with tips,
// ads around the game, voice. Logic lives in /assets/game.js; sounds in /assets/sounds.js.
import { themeShell, esc, ICONS } from './theme.js';
import { padLook } from './skins.js';

const CSS = `
html,body{height:100%;overflow:hidden;overscroll-behavior:none}
body.is-game{background:var(--bg-deep)}
.gm{height:100vh;height:100dvh;display:flex;flex-direction:column;width:100%;overflow:hidden;padding-top:env(safe-area-inset-top)}
.gm>*{flex:none}
.gm-bar{display:flex;align-items:center;gap:8px;padding:8px 10px 4px}
.gm-bar .iconbtn{flex:none}
.gm-chips{flex:1;min-width:0;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}
.gm-chips::-webkit-scrollbar{display:none}
.gchip{flex:none;display:flex;flex-direction:column;align-items:flex-start;gap:1px;max-width:170px;padding:6px 12px;border:0;border-radius:16px;background:rgba(255,255,255,.14);box-shadow:inset 0 0 0 2px rgba(255,255,255,.2);color:#fff;font:700 11.5px var(--body);text-align:left;cursor:pointer}
.gchip b{display:block;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:900 15px/1.1 var(--display)}
.gchip[aria-pressed="true"]{background:#fff;color:var(--ink);box-shadow:0 3px 0 rgba(0,0,0,.3)}
.gchip.ended{opacity:.55}
.iconbtn .off{display:none}.iconbtn[data-muted="1"] .on{display:none}.iconbtn[data-muted="1"] .off{display:inline}
.iconbtn[aria-pressed="true"]{background:var(--green);color:var(--ink)}

/* live board (above the tap area): you on the left, a scrollable list that shows the top 5 */
.lb{display:flex;align-items:stretch;gap:6px;margin:4px 10px 6px;padding:6px;border-radius:var(--r);background:rgba(0,0,0,.28)}
.lb-me{flex:none;display:flex;flex-direction:column;justify-content:center;min-width:72px;padding:6px 10px;border-radius:var(--r-sm);background:var(--green);color:var(--ink);text-align:center}
.lb-me b{font:900 24px/1 var(--display)}.lb-me small{font:800 10.5px var(--body);text-transform:uppercase;letter-spacing:.3px}
.lb-list{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;max-height:calc(5 * 25px + 4 * 3px);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scroll-behavior:smooth;-webkit-overflow-scrolling:touch}
.lb-row{flex:none;display:flex;align-items:center;gap:7px;height:25px;padding:0 8px 0 3px;border-radius:var(--r-in);background:rgba(255,255,255,.1);transition:background .3s}
.lb-row.me{background:rgba(0,255,110,.22);box-shadow:inset 0 0 0 2px var(--green)}
.lb-row.up{animation:rowup .5s}
@keyframes rowup{0%{transform:translateX(8px)}60%{transform:translateX(-3px)}}
.lb-row .r{flex:none;display:grid;place-items:center;min-width:30px;height:19px;padding:0 5px;border-radius:var(--r-tag);background:rgba(0,0,0,.35);font:900 12px/1 var(--display);color:#fff}
.lb-row:nth-child(1) .r{background:var(--sunny);color:var(--ink)}.lb-row:nth-child(2) .r{background:#E6E6F0;color:var(--ink)}.lb-row:nth-child(3) .r{background:#E8A15C;color:var(--ink)}
.lb-row.gap{height:auto;padding:0;background:none;justify-content:center;font:900 11px/1 var(--body);opacity:.6}
.lb-row .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:800 13px var(--body)}
.lb-row .s{flex:none;font:900 15px/1 var(--display);color:var(--sunny);font-variant-numeric:tabular-nums}
.lb-row .nemoji{margin-left:3px}
.teams{display:flex;height:26px;margin:0 10px 6px;border-radius:999px;overflow:hidden;font:900 12.5px/26px var(--display);color:#fff;text-shadow:var(--ts)}
.teams span{padding:0 10px;white-space:nowrap;overflow:hidden;transition:flex-grow .5s}
.teams span:first-child{background:var(--orange)}.teams span:last-child{background:var(--sky);text-align:right}

.gm-main{flex:1 1 0!important;min-height:0;display:grid;grid-template-rows:minmax(0,1fr);grid-template-columns:minmax(0,1fr);gap:8px;padding:0 10px 4px}
.gm-side{display:none}
.gm-play{position:relative;min-height:0;min-width:0;display:flex;flex-direction:column}

/* the pad */
.gpad{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-between;padding:14px 14px 12px;border-radius:var(--r);cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:none;outline:none;overflow:hidden;contain:layout paint;transition:box-shadow .3s,filter .3s}
.gpad:focus-visible{box-shadow:0 0 0 4px var(--green),0 6px 0 var(--cd)}
.gpad.glow{box-shadow:0 0 0 3px #5dff4a,0 0 30px rgba(93,255,74,.55),0 6px 0 var(--cd)}
.gpad.boosted{animation:boostglow 1s ease-in-out infinite alternate}
@keyframes boostglow{from{box-shadow:0 0 0 3px #FFD23F,0 0 18px rgba(255,210,63,.5),0 6px 0 var(--cd)}to{box-shadow:0 0 0 6px #fff36b,0 0 46px rgba(255,243,107,.85),0 6px 0 var(--cd)}}
.pad-top,.pad-bottom{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;position:relative;z-index:2;pointer-events:none}
.pill{display:inline-flex;flex-direction:column;gap:1px;padding:7px 12px;border-radius:16px;background:rgba(0,0,0,.34);text-shadow:none}
.pill small{font:800 10.5px var(--body);text-transform:uppercase;letter-spacing:.4px;opacity:.85}
.pill b{font:900 clamp(22px,6vh,40px)/1 var(--display);font-variant-numeric:tabular-nums;color:#fff}
.pill.time b{font-size:clamp(16px,4.2vh,26px);color:var(--green)}
.pad-mid{flex:1;display:grid;place-items:center;text-align:center;position:relative;z-index:2;pointer-events:none}
.pad-word{display:block;font:900 italic clamp(56px,16vw,130px)/.85 var(--display);letter-spacing:-1px;color:#fff;text-shadow:0 6px 0 rgba(0,0,0,.25)}
.pad-msg{display:block;margin-top:12px;font:800 clamp(14px,3.8vw,19px)/1.25 var(--body);color:#fff;text-shadow:var(--ts)}
.pad-bottom{align-items:center;font:800 13px var(--body);color:#fff}
.pad-bottom .tagp{padding:6px 11px;border-radius:999px;background:rgba(0,0,0,.34);text-shadow:none}
.pad-bottom .tagp.boost{background:var(--sunny);color:var(--ink);animation:pulse 1s infinite}
@keyframes pulse{50%{transform:scale(1.06)}}
.pad-fx{position:absolute;inset:0;pointer-events:none;z-index:3;overflow:hidden;border-radius:inherit}
.fx-plus{position:absolute;left:0;top:0;font:900 italic 44px/1 var(--display);color:#fff;-webkit-text-stroke:3px var(--ink);paint-order:stroke fill;text-shadow:0 4px 0 rgba(0,0,0,.35);will-change:transform,opacity;opacity:0;white-space:nowrap}
.fx-ring{position:absolute;left:0;top:0;width:80px;height:80px;margin:-40px 0 0 -40px;border-radius:50%;border:5px solid rgba(255,255,255,.9);opacity:0;will-change:transform,opacity}
.fx-bit{position:absolute;left:0;top:0;width:10px;height:14px;border-radius:3px;opacity:0;will-change:transform,opacity}
.fx-banner{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);padding:8px 20px;border-radius:18px;background:var(--ink);border:4px solid #fff;box-shadow:0 6px 0 rgba(0,0,0,.4),0 14px 30px rgba(0,0,0,.45);font:900 italic clamp(28px,8vw,54px)/1 var(--display);color:var(--sunny);white-space:nowrap;opacity:0;will-change:transform,opacity}
.fx-banner.gold{background:var(--sunny);color:var(--ink)}
.gpad.shake{animation:shake .32s}
@keyframes shake{20%{transform:translate(-5px,2px) rotate(-.6deg)}40%{transform:translate(5px,-2px) rotate(.6deg)}60%{transform:translate(-3px,1px)}80%{transform:translate(3px,0)}}
.gpad.flash::after{content:"";position:absolute;inset:0;border-radius:inherit;background:rgba(255,255,255,.4);animation:flash .35s forwards;pointer-events:none;z-index:4}
@keyframes flash{to{opacity:0}}
.gpad.locked{cursor:default}
.gpad.locked .pad-word{opacity:.55}
/* connection state on the card */
.net{position:absolute;left:50%;top:50%;z-index:7;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:10px;padding:18px 20px;border-radius:22px;background:rgba(21,11,51,.92);color:#fff;text-align:center;font:800 16px/1.3 var(--body);box-shadow:0 10px 30px rgba(0,0,0,.5);pointer-events:none}
.net .ring{width:34px;height:34px}
.net.ok{background:var(--green);color:var(--ink)}
.gpad.offline{filter:grayscale(.75) brightness(.8)}

/* bottom bar: booster button on the left */
.gm-foot{display:flex;align-items:center;gap:8px;padding:6px 10px calc(env(safe-area-inset-bottom) + 10px)}
.boostbtn{position:relative;display:flex;align-items:center;gap:10px;min-height:56px;padding:0 16px 0 10px;border:0;border-radius:var(--r-btn);background:var(--sunny);color:var(--ink);font:900 17px var(--display);cursor:pointer;box-shadow:0 5px 0 var(--sunny-d)}
.boostbtn:active{transform:translateY(4px);box-shadow:0 1px 0 var(--sunny-d)}
.boostbtn .ic{display:grid;place-items:center;width:38px;height:38px;border-radius:var(--r-in);background:var(--ink);color:var(--sunny);font:900 italic 18px var(--display)}
.boostbtn .cnt{position:absolute;top:-8px;left:34px;min-width:24px;height:24px;padding:0 6px;border-radius:999px;background:var(--pink);color:#fff;font:900 12px/24px var(--body);text-align:center;border:2px solid var(--bg-deep)}
.boostbtn[disabled]{filter:grayscale(.8);opacity:.6}
.gm-foot .grow{flex:1}
.gm-foot .btn{min-height:50px}
/* booster tips: up to 3 cards slide in from the left now and then. Tap one to use that booster. */
.tips{position:absolute;left:0;bottom:calc(env(safe-area-inset-bottom) + 84px);z-index:12;display:grid;gap:8px;max-width:min(340px,calc(100% - 20px));pointer-events:none}
.tipcard{pointer-events:auto;display:flex;align-items:center;gap:10px;width:100%;margin:0;padding:9px 12px 9px 12px;border:0;border-radius:0 var(--r-sm) var(--r-sm) 0;background:#fff;color:var(--ink);text-align:left;cursor:pointer;box-shadow:inset 5px 0 0 var(--sunny),0 10px 26px rgba(0,0,0,.45);font:700 13.5px/1.3 var(--body);transform:translateX(-110%);transition:transform .45s cubic-bezier(.2,1.2,.4,1),opacity .3s}
.tipcard.in{transform:none}
.tipcard.out{transform:translateX(-110%);opacity:0}
.tipcard .m{flex:none;display:grid;place-items:center;width:40px;height:40px;border-radius:var(--r-in);background:var(--c,#2E8BFF);color:#fff;font:900 italic 16px var(--display);text-shadow:var(--ts)}
.tipcard .tx{flex:1;min-width:0}
.tipcard .tx b{display:block;font:900 15px/1.1 var(--display)}
.tipcard .go{flex:none;padding:7px 10px;border-radius:var(--r-in);background:var(--green);color:var(--ink);font:900 13px var(--display)}
.tipcard:active{filter:brightness(.95)}

/* sheets & modals */
.gsheet{position:fixed;inset:0;z-index:80;display:flex;align-items:flex-end;justify-content:center;background:rgba(10,0,40,.6)}
.gsheet[hidden]{display:none}
.gsheet-in{width:100%;max-width:520px;max-height:84vh;overflow:auto;padding:18px 16px calc(env(safe-area-inset-bottom) + 16px);border-radius:var(--r) var(--r) 0 0;background:#fff;color:var(--ink);box-shadow:0 -10px 40px rgba(0,0,0,.5);animation:up .22s ease-out}
@keyframes up{from{transform:translateY(40px);opacity:0}}
.gsheet h2{margin:0 0 4px;font:900 26px/1 var(--display);display:flex;justify-content:space-between;align-items:center}
.gsheet h2 .iconbtn{background:var(--cloud);color:var(--ink);box-shadow:none}
.gsheet p{margin:0 0 12px;color:var(--ink-soft);font-size:14px;line-height:1.5}
.bopt{position:relative;display:flex;align-items:center;gap:12px;width:100%;padding:10px 12px;margin-top:8px;border:0;border-radius:var(--r-sm);background:var(--cloud);color:var(--ink);text-align:left;cursor:pointer;font:inherit}
.bopt .m{flex:none;display:grid;place-items:center;width:52px;height:52px;border-radius:var(--r-in);background:var(--c,#2E8BFF);color:#fff;font:900 italic 20px var(--display);text-shadow:var(--ts)}
.bopt .t{flex:1;font:900 17px/1.15 var(--display)}
.bopt .t small{display:block;font:600 12.5px var(--body);color:var(--ink-soft)}
.bopt .q{font:900 18px var(--display)}
.bopt.locked{opacity:.6}
.bopt.locked .q{font-size:12px;font-family:var(--body)}
.bopt[disabled]{opacity:.5;cursor:not-allowed}
.gboard{display:grid;gap:6px;margin:0;padding:0;list-style:none}
.gboard li{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:14px;background:var(--cloud)}
.gboard li.me{box-shadow:inset 0 0 0 3px var(--green)}
.gboard .r{width:34px;font:900 18px var(--display);color:var(--ink-soft)}
.gboard .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:800 15px var(--body)}
.gboard .s{font:900 17px var(--display)}
.ginfo{padding:14px;border-radius:22px;background:rgba(0,0,0,.28)}
.ginfo h1{margin:0 0 6px;font:900 24px/1.05 var(--display)}
.ginfo .small{color:var(--muted)}

.promo{position:fixed;inset:0;z-index:85;display:grid;place-items:center;padding:16px;background:rgba(10,0,40,.78)}
.promo[hidden]{display:none}
.promo-in{position:relative;width:100%;max-width:440px;max-height:92vh;overflow:auto;padding:12px;border-radius:var(--r);background:#fff;color:var(--ink);box-shadow:0 20px 50px rgba(0,0,0,.6);animation:pop .25s cubic-bezier(.2,1.4,.4,1)}
@keyframes pop{from{transform:scale(.88);opacity:0}}
.promo-in .lbl{display:flex;justify-content:space-between;align-items:center;margin:2px 4px 8px;font:800 12px var(--body);color:var(--ink-soft);text-transform:uppercase;letter-spacing:.5px}
.promo-media{display:block;width:100%;border-radius:var(--r-sm);overflow:hidden;background:#000}
.promo-media img{display:block;width:100%;max-height:55vh;object-fit:contain}
.promo-media iframe{display:block;width:100%;aspect-ratio:16/9;border:0}
.promo-in h3{margin:10px 4px 8px;font:900 21px/1.1 var(--display)}
.promo-in .lbl{gap:10px}
.promo-x{flex:none;min-height:34px;padding:0 12px;border:0;border-radius:var(--r-in);background:var(--ink);color:#fff;font:800 13px var(--body);cursor:pointer;text-transform:none;letter-spacing:0}
.promo-x[disabled]{cursor:default;background:var(--cloud);color:var(--ink-soft)}
/* how long until the ad can close: a line that fills left to right */
.promo-line{height:5px;margin:0 4px 10px;border-radius:999px;background:var(--cloud);overflow:hidden}
.promo-line i{display:block;height:100%;width:100%;border-radius:inherit;background:var(--green);transform:scaleX(0);transform-origin:left center}
.lead{display:grid;gap:10px;margin-top:10px;padding:12px;border-radius:18px;background:var(--cloud)}
.lead .ta-input{background:#fff;height:46px}

.gend{position:absolute;inset:10px;z-index:6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px;border-radius:var(--r-sm);background:rgba(21,11,51,.94);text-align:center;cursor:default;animation:pop .3s cubic-bezier(.2,1.4,.4,1)}
.gend[hidden]{display:none}
.gend .ttl{font:900 clamp(28px,8vw,46px)/1 var(--display);color:var(--sunny)}
.gend .big{font:900 clamp(40px,11vh,72px)/1 var(--display);color:#fff}
.gend .sub{font:600 15px/1.45 var(--body);color:#E4DAFF;max-width:30ch}
.gsheet .actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
.gend .actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}

.vlist{display:grid;gap:6px;margin:10px 0}
.vlist div{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:12px;background:var(--cloud);font:700 15px var(--body)}
.vlist i{width:10px;height:10px;border-radius:50%;background:#0A9B4A}

/* wide screens and landscape: info + board left, pad right */
@media (min-width:900px),(orientation:landscape) and (max-height:600px){
  .lb,.teams{display:none}
  .gm-main{grid-template-rows:1fr;grid-template-columns:minmax(240px,340px) 1fr;grid-template-areas:"side play";gap:14px;padding-left:max(12px,env(safe-area-inset-left));padding-right:max(12px,env(safe-area-inset-right))}
  .gm-side{grid-area:side;display:flex;flex-direction:column;gap:10px;min-height:0;overflow:auto;scrollbar-width:thin}
  .gm-side .gboard li{background:rgba(255,255,255,.12);color:#fff}.gm-side .gboard .r{color:#C9BDF5}
  .gm-play{grid-area:play}
  .tips{position:fixed;left:0;bottom:calc(env(safe-area-inset-bottom) + 80px)}
}
@media (orientation:landscape) and (max-height:600px){
  .gm-bar{padding:4px max(10px,env(safe-area-inset-left)) 2px}
  .gm-main{grid-template-columns:minmax(200px,34vw) 1fr;padding-bottom:2px}
  .gpad{padding:10px 12px}
  .pad-word{font-size:clamp(46px,15vh,96px)}
  .gm-foot{padding-top:2px;padding-bottom:max(6px,env(safe-area-inset-bottom))}
  .boostbtn,.gm-foot .btn{min-height:44px}
  .ginfo{padding:10px}.ginfo h1{font-size:19px}
}
@media (max-height:700px) and (orientation:portrait){.pad-msg{font-size:14px}.lb-list{max-height:calc(3 * 25px + 2 * 3px)}}
@media (prefers-reduced-motion:reduce){.gpad.boosted,.pad-bottom .tagp.boost{animation:none}}
`;

const MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>';
const SOUND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" stroke="none"/><path class="on" d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/><path class="off" d="M17 9l5 6M22 9l-5 6"/></svg>';

const safeJson = o => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

export function playPage(ctx) {
  const { user, pools, boosters, skin, prefs, voice, serverNow, me, theme, bgCss } = ctx;
  const single = pools.length === 1 ? pools[0] : null;
  const look = padLook(skin, prefs, single, ctx.paid);
  const data = { me, pools, boosters, voice, serverNow };
  const poolBg = single?.bg ? `linear-gradient(165deg,${single.bg},color-mix(in srgb,${single.bg} 45%,#000))` : '';
  const body = `<div class="gm" id="gm">
<header class="gm-bar">
  <a class="iconbtn" href="${single ? `/pool/${esc(single.id)}` : '/dashboard'}" data-back aria-label="Leave game">${ICONS.back}</a>
  <div class="gm-chips" id="chips" role="group" aria-label="Your pools in this game">${pools.map((p, i) => `<button type="button" class="gchip" data-pool="${esc(p.id)}" aria-pressed="${i === 0}"><b>${esc(p.name)}</b><span data-chip-rank>—</span></button>`).join('')}</div>
  <button type="button" class="iconbtn" id="snd" aria-label="Sound">${SOUND}</button>
  ${voice.enabled ? `<button type="button" class="iconbtn" id="mic" aria-label="Live voice" aria-pressed="false">${MIC}</button>` : ''}
</header>
<div class="lb" id="lb" aria-live="off" aria-label="Live board"><div class="lb-me"><small>You</small><b id="lb-me">#—</b></div><div class="lb-list" id="lb-list" tabindex="0" aria-label="Top players"></div></div>
<div class="teams" id="teams" hidden><span></span><span></span></div>
<div class="gm-main">
  <aside class="gm-side" aria-label="Pool and leaderboard">
    <div class="ginfo"><h1 id="g-name">${esc(pools[0].name)}</h1><div class="small" id="g-meta"></div></div>
    <ol class="gboard" id="board-side" aria-live="off"></ol>
  </aside>
  <section class="gm-play">
    <div class="tcard gpad ${look.cls}" id="pad" style="${look.style}" role="button" tabindex="0" aria-label="Tap here. Every tap na one point.">
      <div class="pad-top"><span class="pill"><small>Score</small><b id="score">0</b></span><span class="pill time" style="text-align:right"><small id="time-lbl">Ends in</small><b id="time">—</b></span></div>
      <div class="pad-mid"><div><span class="pad-word">TAP AM</span><span class="pad-msg" id="msg" aria-live="polite">Loading the pool…</span></div></div>
      <div class="pad-bottom"><span class="tagp" id="pos">#— of —</span><span class="tagp" id="combo">Combo 0</span></div>
      <div class="pad-fx" id="fx" aria-hidden="true"></div>
      <div class="net" id="net" hidden><span class="ring"></span><span id="net-t">Connection lost — taps paused</span></div>
      <div class="gend" id="end" hidden></div>
    </div>
  </section>
</div>
<footer class="gm-foot">
  <button type="button" class="boostbtn" id="boost-btn" aria-label="Boosters"><span class="ic">×2</span><span>Boost</span><span class="cnt" id="boost-count">0</span></button>
  <span class="grow"></span>
</footer>
<div class="tips" id="tips" aria-live="polite"></div>
</div>
<div class="gsheet" id="boost-sheet" hidden><div class="gsheet-in" role="dialog" aria-modal="true" aria-labelledby="bo-h"><h2 id="bo-h">Boosters <button type="button" class="iconbtn" data-close aria-label="Close">${ICONS.close}</button></h2><p>Each booster multiplies every tap for some seconds. Use as many as you like — they run one after the other, and a stronger one jumps the queue.</p><div id="boost-list"></div><div class="actions"><a class="btn btn--soft btn--sm" href="/store">Get boosters</a>${me.calc ? '<a class="btn btn--soft btn--sm" href="/calc">Calculator</a>' : ''}</div></div></div>
<div class="gsheet" id="voice-sheet" hidden><div class="gsheet-in" role="dialog" aria-modal="true" aria-labelledby="vo-h"><h2 id="vo-h">Live voice <button type="button" class="iconbtn" data-close aria-label="Close">${ICONS.close}</button></h2><p id="v-status">Listen to the top players talk while you tap. Nepo babies at Para Para Boy or higher who are in the top ${voice.topN} fit talk.</p><div class="vlist" id="v-list"></div><div class="actions"><button type="button" class="btn btn--green btn--sm" id="v-listen">Listen</button><button type="button" class="btn btn--gold btn--sm" id="v-talk" hidden>Talk</button><button type="button" class="btn btn--soft btn--sm" id="v-leave" hidden>Leave voice</button></div></div></div>
<div class="promo" id="promo" hidden><div class="promo-in" role="dialog" aria-modal="true" aria-label="Sponsored"><div class="lbl"><span id="promo-by">Sponsored</span><button type="button" class="promo-x" id="promo-x" aria-label="Close ad" disabled><span id="promo-wait">Wait 5s</span></button></div><div class="promo-line" aria-hidden="true"><i id="promo-line"></i></div><div id="promo-body"></div></div></div>
<script type="application/json" id="game-data">${safeJson(data)}</script>`;
  return themeShell({ title: single ? single.name : 'Play', body, css: CSS, bodyClass: 'is-game', scripts: ['/assets/sounds.js', '/assets/game.js', ...(voice.enabled ? ['/assets/voice.js'] : [])], theme, bgCss: poolBg || bgCss, noZoom: true });
}
