// The game screen: one big tap card, live board, boosters, promos, voice. Logic lives in /assets/game.js.
import { themeShell, esc, ICONS } from './theme.js';
import { padLook } from './skins.js';
import { naira } from './kit.js';

const CSS = `
html,body{height:100%;overflow:hidden;overscroll-behavior:none}
body.is-game{background:var(--page-bg,#01240c) var(--bgimg,none)}
.gm{height:100vh;height:100dvh;display:grid;grid-template-rows:auto minmax(0,1fr);grid-template-columns:minmax(0,1fr);width:100%;overflow:hidden;padding-top:env(safe-area-inset-top)}
.gm-bar{display:flex;align-items:center;gap:8px;padding:8px 10px 6px}
.gm-bar .iconbtn{flex:none}
.gm-chips{flex:1;min-width:0;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}
.gm-chips::-webkit-scrollbar{display:none}
.gchip{flex:none;display:flex;flex-direction:column;align-items:flex-start;gap:1px;max-width:170px;padding:5px 10px;border:0;border-radius:10px;background:rgba(4,23,12,.86);box-shadow:inset 0 0 0 2px rgba(89,255,180,.2);color:var(--muted);font:700 12px var(--body);text-align:left;cursor:pointer}
.gchip b{display:block;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:800 16px/1.05 var(--display);text-transform:uppercase;color:#fff}
.gchip[aria-pressed="true"]{background:var(--paper);box-shadow:none;color:var(--card-green-d)}
.gchip[aria-pressed="true"] b{color:var(--ink)}
.gchip.ended{opacity:.55}
.iconbtn[aria-pressed="true"]{background:var(--neon);color:var(--ink)}
.iconbtn .off{display:none}.iconbtn[data-muted="1"] .on{display:none}.iconbtn[data-muted="1"] .off{display:inline}

.gm-main{min-height:0;display:grid;grid-template-rows:minmax(0,1fr);grid-template-columns:minmax(0,1fr);gap:8px;padding:2px 10px calc(env(safe-area-inset-bottom) + 10px)}
.gm-side{display:none}
.gm-play{min-height:0;min-width:0;display:flex;flex-direction:column;gap:12px;padding:0 6px 4px 0}
.gm-actions{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:8px}
.gm-actions .btn{min-width:0;white-space:nowrap;height:50px;padding:0 10px;font-size:19px}
.gm-actions .btn small{font:700 12px var(--body);opacity:.85;margin-left:5px}

/* the pad */
.gpad{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-between;padding:16px 16px 14px;cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:manipulation;outline:none;overflow:hidden;contain:layout paint;transition:box-shadow .3s}
.gpad:focus-visible{box-shadow:0 0 0 4px var(--neon),5px 6px 0 -1px var(--cd)}
.gpad.shape-circle,.gpad.shape-blob{border-radius:28%!important}
.gpad.shape-hex{clip-path:polygon(12% 0,88% 0,100% 50%,88% 100%,12% 100%,0 50%)}
.gpad.shape-hex .pad-top,.gpad.shape-hex .pad-bottom{padding:0 8%}
.gpad.glow{box-shadow:0 0 0 3px #5dff4a,0 0 30px rgba(93,255,74,.55),5px 6px 0 -1px var(--cd)}
.gpad.boosted{animation:boostglow 1s ease-in-out infinite alternate}
@keyframes boostglow{from{box-shadow:0 0 0 3px #efc032,0 0 18px rgba(239,192,50,.5),5px 6px 0 -1px var(--cd)}to{box-shadow:0 0 0 5px #fff36b,0 0 46px rgba(255,243,107,.85),5px 6px 0 -1px var(--cd)}}
.gpad .pad-art{position:absolute;inset:0;display:grid;place-items:center;opacity:.32;pointer-events:none}
.gpad .pad-art svg{height:72%;max-width:80%}
.pad-top,.pad-bottom{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;position:relative;z-index:2;pointer-events:none}
.pad-top .segbox{flex-direction:column;align-items:flex-start;gap:3px;padding:6px 10px 5px}
.pad-top .seg{font-size:clamp(24px,6.5vh,44px)}
.pad-mid{flex:1;display:grid;place-items:center;text-align:center;position:relative;z-index:2;pointer-events:none}
.pad-word{display:block;font:800 italic clamp(58px,17vw,140px)/.85 var(--display);letter-spacing:-1px;color:#fff;text-shadow:0 5px 0 rgba(0,0,0,.2)}
.pad-msg{display:block;margin-top:10px;font:700 clamp(15px,4vw,20px)/1.25 var(--body);color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.5)}
.pad-bottom{align-items:center;font:700 14px var(--body);color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.5)}
.pad-bottom .pill{padding:5px 10px;border-radius:9px;background:rgba(0,0,0,.35)}
.pad-bottom .pill.boost{background:#efc032;color:#1d1503;text-shadow:none;animation:pulse 1s infinite}
@keyframes pulse{50%{transform:scale(1.06)}}
.pad-fx{position:absolute;inset:0;pointer-events:none;z-index:3;overflow:hidden;border-radius:inherit}
.fx-plus{position:absolute;left:0;top:0;font:800 italic 44px/1 var(--display);color:#fff;-webkit-text-stroke:2.5px #06140b;paint-order:stroke fill;text-shadow:0 4px 0 rgba(0,0,0,.35);will-change:transform,opacity;opacity:0;white-space:nowrap}
.fx-ring{position:absolute;left:0;top:0;width:76px;height:76px;margin:-38px 0 0 -38px;border-radius:50%;border:4px solid rgba(255,255,255,.85);opacity:0;will-change:transform,opacity}
.fx-bit{position:absolute;left:0;top:0;width:10px;height:14px;border-radius:2px;opacity:0;will-change:transform,opacity}
.fx-banner{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);padding:8px 18px;border-radius:12px;background:linear-gradient(180deg,#3b4bea,var(--sticker));border:3px solid #9fb0ff;box-shadow:0 5px 0 var(--sticker-d),0 12px 26px rgba(0,0,0,.45);font:800 italic clamp(28px,8vw,52px)/1 var(--display);color:#fff;white-space:nowrap;opacity:0;will-change:transform,opacity}
.fx-banner.gold{background:linear-gradient(180deg,#ffe37a,#d9a520);border-color:#fff6c8;box-shadow:0 5px 0 #8a6510,0 12px 26px rgba(0,0,0,.45);color:#2a1d00}
.gpad.shake{animation:shake .32s}
@keyframes shake{20%{transform:translate(-5px,2px) rotate(-.6deg)}40%{transform:translate(5px,-2px) rotate(.6deg)}60%{transform:translate(-3px,1px)}80%{transform:translate(3px,0)}}
.gpad.flash::after{content:"";position:absolute;inset:0;border-radius:inherit;background:rgba(255,255,255,.4);animation:flash .35s forwards;pointer-events:none;z-index:4}
@keyframes flash{to{opacity:0}}
.gpad.locked{cursor:default}
.gpad.locked .pad-word{opacity:.5}

/* board */
.gboard{display:grid;gap:6px;margin:0;padding:0;list-style:none}
.gboard li{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:11px;background:rgba(3,18,10,.85);box-shadow:inset 0 0 0 1.5px rgba(89,255,180,.12);transition:transform .25s}
.gboard li.me{box-shadow:inset 0 0 0 2px var(--neon)}
.gboard .r{width:34px;font:800 19px var(--display);color:var(--muted)}
.gboard li:nth-child(1) .r{color:#efc032}.gboard li:nth-child(2) .r{color:#d8e0ea}.gboard li:nth-child(3) .r{color:#e2802a}
.gboard .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:800 17px var(--display);text-transform:uppercase;color:#fff}
.gboard .s{font:800 18px var(--display);color:var(--neon)}
.ginfo{padding:14px}
.ginfo h1{margin:0 0 6px;font:800 26px/1 var(--display);text-transform:uppercase;color:#fff}
.ginfo .small{color:var(--muted)}
.teams{display:flex;height:30px;border-radius:9px;overflow:hidden;margin-top:10px;font:800 15px/30px var(--display);text-transform:uppercase;color:#fff}
.teams span{padding:0 8px;white-space:nowrap;overflow:hidden;transition:flex-grow .5s}
.teams span:first-child{background:var(--card-orange)}.teams span:last-child{background:var(--sticker);text-align:right}

/* sheets & modals */
.gsheet{position:fixed;inset:0;z-index:80;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55)}
.gsheet[hidden]{display:none}
.gsheet-in{width:100%;max-width:520px;max-height:82vh;overflow:auto;padding:18px 16px calc(env(safe-area-inset-bottom) + 16px);border-radius:20px 20px 0 0;background:#04170c;box-shadow:0 -10px 40px rgba(0,0,0,.5),inset 0 0 0 2px rgba(89,255,180,.18);animation:up .22s ease-out}
@keyframes up{from{transform:translateY(40px);opacity:0}}
.gsheet h2{margin:0 0 4px;font:800 28px/1 var(--display);text-transform:uppercase;color:#fff;display:flex;justify-content:space-between;align-items:center}
.gsheet p{margin:0 0 12px;color:var(--muted);font-size:14px;line-height:1.5}
.bopt{display:flex;align-items:center;gap:12px;width:100%;padding:12px;margin-top:8px;border:0;border-radius:14px;background:rgba(3,22,11,.9);box-shadow:inset 0 0 0 2px rgba(89,255,180,.2);color:#fff;text-align:left;cursor:pointer;font:inherit}
.bopt:disabled{opacity:.45;cursor:not-allowed}
.bopt .t{flex:1;font:800 20px var(--display);text-transform:uppercase}
.bopt .t small{display:block;font:600 13px var(--body);text-transform:none;color:var(--muted)}
.bopt .q{font:800 20px var(--display);color:var(--neon)}
@media (min-width:700px){.gsheet{align-items:center}.gsheet-in{border-radius:20px}}

.promo{position:fixed;inset:0;z-index:85;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.72)}
.promo[hidden]{display:none}
.promo-in{position:relative;width:100%;max-width:440px;padding:12px;border-radius:18px;background:#04170c;box-shadow:inset 0 0 0 2px rgba(239,192,50,.5),0 20px 50px rgba(0,0,0,.6);animation:pop .25s cubic-bezier(.2,1.4,.4,1)}
@keyframes pop{from{transform:scale(.88);opacity:0}}
.promo-in .lbl{display:flex;justify-content:space-between;align-items:center;margin:0 2px 8px;font:700 12px var(--body);color:#ffe9a6;text-transform:uppercase;letter-spacing:.5px}
.promo-media{display:block;width:100%;border-radius:12px;overflow:hidden;background:#000}
.promo-media img{display:block;width:100%;max-height:60vh;object-fit:contain}
.promo-media iframe{display:block;width:100%;aspect-ratio:16/9;border:0}
.promo-in h3{margin:10px 2px 8px;font:800 22px/1.05 var(--display);text-transform:uppercase;color:#fff}
.promo-x{position:absolute;top:-12px;right:-8px;width:40px;height:40px;border:0;border-radius:50%;background:#fff;color:#04170c;font:800 22px/40px var(--body);cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.4)}

.gend{position:absolute;inset:12px;z-index:6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px;border-radius:14px;background:rgba(4,19,10,.93);text-align:center;cursor:default;animation:pop .3s cubic-bezier(.2,1.4,.4,1)}
.gend[hidden]{display:none}
.gend .ttl{font:800 clamp(30px,8vw,48px)/1 var(--display);text-transform:uppercase;color:var(--card-gold)}
.gend .seg{font-size:clamp(38px,10vh,66px)}
.gend .sub{font:600 15px/1.45 var(--body);color:#dfffe9;max-width:30ch}
.gend .actions{justify-content:center}

/* voice */
.vlist{display:grid;gap:6px;margin:10px 0}
.vlist div{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:rgba(3,22,11,.9);font:700 15px var(--body)}
.vlist i{width:10px;height:10px;border-radius:50%;background:var(--neon);box-shadow:0 0 8px var(--neon)}

/* wide screens and landscape: board left, pad right */
@media (min-width:900px),(orientation:landscape) and (max-height:600px){
  .gm-main{grid-template-rows:1fr;grid-template-columns:minmax(240px,340px) 1fr;grid-template-areas:"side play";gap:14px;padding-left:max(12px,env(safe-area-inset-left));padding-right:max(12px,env(safe-area-inset-right))}
  .gm-side{grid-area:side;display:flex;flex-direction:column;gap:10px;min-height:0;overflow:auto;scrollbar-width:thin}
  .gm-play{grid-area:play;gap:10px;padding-bottom:6px}
  .gm-actions{grid-template-columns:1fr 1fr}
  .gm-actions [data-open-board]{display:none}
}
@media (orientation:landscape) and (max-height:600px){
  .gm-bar{padding:4px max(10px,env(safe-area-inset-left)) 2px}
  .gm-main{grid-template-columns:minmax(200px,34vw) 1fr;padding-bottom:max(6px,env(safe-area-inset-bottom))}
  .gpad{padding:10px 12px}
  .pad-word{font-size:clamp(46px,15vh,96px)}
  .pad-top .seg{font-size:clamp(20px,8vh,32px)}
  .gm-actions .btn{height:40px;font-size:16px}
  .ginfo{padding:10px}.ginfo h1{font-size:20px}
  .gboard li{padding:5px 8px}.gboard .n,.gboard .s{font-size:15px}
}
@media (max-height:620px) and (orientation:portrait){.gm-actions .btn{height:44px;font-size:17px}.pad-msg{font-size:14px}}
@media (prefers-reduced-motion:reduce){.gpad.boosted,.pad-bottom .pill.boost{animation:none}}
`;

const MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>';
const SOUND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="on" d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/><path class="off" d="M17 9l5 6M22 9l-5 6"/></svg>';
const BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';

const safeJson = o => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

export function playPage(ctx) {
  const { user, pools, boosters, skin, prefs, voice, serverNow } = ctx;
  const single = pools.length === 1 ? pools[0] : null;
  const look = padLook(skin, prefs, single?.theme || null, single?.skin || null);
  const data = {
    me: { name: user.username, nepo: ctx.nepo, vibrate: prefs.vibrate !== false, rank: user.rank_level || 1 },
    pools: pools.map(p => ({ id: p.id, name: p.name, state: p.state, startsAt: p.startsAt, endsAt: p.endsAt, boosters: p.boosters, boosterUsed: !!p.boosterUsed, sideA: p.sideA, sideB: p.sideB, side: p.mySide || null, prize: p.prize, sponsor: p.sponsor, kind: p.kind })),
    boosters, voice, serverNow
  };
  const bgStyle = prefs.pageBg ? `--page-bg:${esc(prefs.pageBg)}` : '';
  const body = `<div class="gm" id="gm" style="${bgStyle}">
<header class="gm-bar">
  <a class="iconbtn" href="${single ? `/pool/${esc(single.id)}` : '/dashboard'}" aria-label="Leave game">${BACK}</a>
  <div class="gm-chips" id="chips" role="group" aria-label="Your pools in this game">${pools.map((p, i) => `<button type="button" class="gchip" data-pool="${esc(p.id)}" aria-pressed="${i === 0}"><b>${esc(p.name)}</b><span data-chip-rank>—</span></button>`).join('')}</div>
  <button type="button" class="iconbtn" id="snd" aria-label="Sound">${SOUND}</button>
  ${voice.enabled ? `<button type="button" class="iconbtn" id="mic" aria-label="Live voice" aria-pressed="false">${MIC}</button>` : ''}
</header>
<div class="gm-main">
  <aside class="gm-side" aria-label="Pool and leaderboard">
    <div class="panel ginfo"><h1 id="g-name">${esc(pools[0].name)}</h1><div class="small" id="g-meta"></div><div class="teams" id="teams" hidden><span></span><span></span></div></div>
    <ol class="gboard" id="board-side" aria-live="off"></ol>
  </aside>
  <section class="gm-play">
    <div class="tcard gpad ${look.cls}" id="pad" style="${look.style}" role="button" tabindex="0" aria-label="Tap here. Every tap na one point.">
      ${look.art}
      <div class="pad-top"><div class="segbox"><span class="seglabel">score</span><span class="seg" id="score" data-seg="00000" data-label="Your score"></span></div><div class="segbox"><span class="seglabel" id="time-lbl">time left</span><span class="seg" id="time" data-seg="00:00" data-label="Time left"></span></div></div>
      <div class="pad-mid"><div><span class="pad-word">TAP AM</span><span class="pad-msg" id="msg" aria-live="polite">Loading the pool…</span></div></div>
      <div class="pad-bottom"><span class="pill" id="pos">#— of —</span><span class="pill" id="combo">Combo 0</span></div>
      <div class="pad-fx" id="fx" aria-hidden="true"></div>
      <div class="gend" id="end" hidden></div>
    </div>
    <div class="gm-actions">
      <button type="button" class="btn btn--gold" id="boost-btn">Booster<small id="boost-count"></small></button>
      <button type="button" class="btn btn--ghost" data-open-board>Board</button>
      <a class="btn btn--ghost" href="${single ? `/pool/${esc(single.id)}` : '/pools'}">${single ? 'Pool info' : 'Pools'}</a>
    </div>
  </section>
</div>
</div>
<div class="gsheet" id="board-sheet" hidden><div class="gsheet-in" role="dialog" aria-modal="true" aria-labelledby="bs-h"><h2 id="bs-h">Leaderboard <button type="button" class="iconbtn" data-close aria-label="Close">${ICONS.close}</button></h2><p id="bs-meta"></p><ol class="gboard" id="board-sheet-list"></ol></div></div>
<div class="gsheet" id="boost-sheet" hidden><div class="gsheet-in" role="dialog" aria-modal="true" aria-labelledby="bo-h"><h2 id="bo-h">Use a booster <button type="button" class="iconbtn" data-close aria-label="Close">${ICONS.close}</button></h2><p>One booster per pool. It multiplies every tap for a few seconds — use am when you fit tap fastest.</p><div id="boost-list"></div><div class="actions"><a class="btn btn--ghost btn--sm" href="/store">Get boosters</a>${ctx.nepo ? '<a class="btn btn--ghost btn--sm" href="/calc">Calculator</a>' : ''}</div></div></div>
<div class="gsheet" id="voice-sheet" hidden><div class="gsheet-in" role="dialog" aria-modal="true" aria-labelledby="vo-h"><h2 id="vo-h">Live voice <button type="button" class="iconbtn" data-close aria-label="Close">${ICONS.close}</button></h2><p id="v-status">Listen to the top players talk while you tap. Nepo babies at Para Para Boy or higher who are in the top ${voice.topN} fit talk.</p><div class="vlist" id="v-list"></div><div class="actions"><button type="button" class="btn btn--sm" id="v-listen">Listen</button><button type="button" class="btn btn--gold btn--sm" id="v-talk" hidden>Talk</button><button type="button" class="btn btn--ghost btn--sm" id="v-leave" hidden>Leave voice</button></div></div></div>
<div class="promo" id="promo" hidden><div class="promo-in" role="dialog" aria-modal="true" aria-label="Sponsored"><div class="lbl"><span>Sponsored</span><span id="promo-wait"></span></div><button type="button" class="promo-x" id="promo-x" aria-label="Close ad">×</button><div id="promo-body"></div></div></div>
<script type="application/json" id="game-data">${safeJson(data)}</script>`;
  return themeShell({ title: single ? single.name : 'Play', body, css: CSS, bodyClass: 'is-game', scripts: ['/assets/game.js', ...(voice.enabled ? ['/assets/voice.js'] : [])] });
}

export { naira };
