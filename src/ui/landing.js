// Landing page: exactly one screen tall, no scrolling.
// Portrait: bar → tap card → buttons → rotating sponsored pools.
// Landscape / desktop: info + pools on the left, tap card on the right.
import { themeShell, esc, TAGLINE, ICONS, menuSheet } from './theme.js';

const CSS = `
html,body{height:100%;overflow:hidden}
.lp{height:100vh;height:100dvh;display:grid;grid-template-rows:auto 1fr;overflow:hidden}
.lp-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:calc(env(safe-area-inset-top) + 8px) 12px 6px}
.lp-bar .ta-logo{width:86px;flex:none}
.lp-stats{display:flex;gap:6px;min-width:0}
.lp-stats .segbox{padding:4px 8px;gap:6px;border-radius:9px}
.lp-stats .seg{font-size:15px}
.live-dot{width:8px;height:8px;border-radius:50%;background:var(--neon);box-shadow:0 0 0 0 rgba(0,255,110,.6);animation:live 1.6s infinite}
@keyframes live{70%{box-shadow:0 0 0 7px rgba(0,255,110,0)}100%{box-shadow:0 0 0 0 rgba(0,255,110,0)}}
.lp-tools{display:flex;gap:6px}
.lp-tools .iconbtn{width:38px;height:38px;border-radius:10px}
.lp-tools .iconbtn svg{width:20px;height:20px}
.snd .x{display:none}.snd[aria-pressed="true"] .w{display:none}.snd[aria-pressed="true"] .x{display:inline}

.lp-main{display:grid;grid-template-rows:1fr auto;gap:10px;min-height:0;padding:4px 14px calc(env(safe-area-inset-bottom) + 10px)}
.lp-play{min-height:0;display:flex;padding:4px 10px 12px 0}
.lp-side{display:flex;flex-direction:column;gap:10px;min-height:0}
.lp-hello{display:none}

/* tap card */
.pad{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-between;padding:20px 20px 18px;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:manipulation;outline:none;overflow:hidden;contain:layout paint}
.pad:focus-visible{box-shadow:0 0 0 4px var(--neon),5px 6px 0 -1px var(--cd)}
.pad-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;position:relative;z-index:2;pointer-events:none}
.pad-top .seg{font-size:clamp(26px,7vh,46px)}
.pad-top .segbox{flex-direction:column;align-items:flex-start;gap:3px;padding:7px 11px 6px}
.pad-mid{flex:1;display:grid;place-items:center;text-align:center;position:relative;z-index:2;pointer-events:none}
.pad-code{display:block;font:800 italic clamp(64px,19vw,150px)/.85 var(--display);letter-spacing:-1px;color:#fff;text-shadow:0 5px 0 rgba(0,0,0,.18)}
.pad-hint{display:block;margin-top:10px;font:700 clamp(15px,4vw,20px)/1.2 var(--body);color:rgba(255,255,255,.92)}
.pad-tag{display:block;margin-top:6px;font:600 italic 14px/1.2 var(--body);color:rgba(255,255,255,.75)}
.pad-bottom{display:flex;justify-content:space-between;align-items:center;gap:8px;position:relative;z-index:2;pointer-events:none;font:600 13px var(--body);color:rgba(255,255,255,.85)}
.pad-fx{position:absolute;inset:0;pointer-events:none;z-index:3;overflow:hidden;border-radius:18px}
.fx-plus{position:absolute;left:0;top:0;font:800 italic 40px/1 var(--display);color:#fff;-webkit-text-stroke:2.5px #06140b;paint-order:stroke fill;text-shadow:0 4px 0 rgba(0,0,0,.35);will-change:transform,opacity;opacity:0;white-space:nowrap}
.fx-ring{position:absolute;left:0;top:0;width:70px;height:70px;margin:-35px 0 0 -35px;border-radius:50%;border:4px solid rgba(255,255,255,.85);opacity:0;will-change:transform,opacity}
.fx-bit{position:absolute;left:0;top:0;width:10px;height:14px;border-radius:2px;opacity:0;will-change:transform,opacity}
.fx-combo{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);padding:8px 18px;border-radius:12px;background:linear-gradient(180deg,#3b4bea,var(--sticker));border:3px solid #9fb0ff;box-shadow:0 5px 0 var(--sticker-d),0 12px 26px rgba(0,0,0,.45);font:800 italic clamp(30px,9vw,54px)/1 var(--display);color:#fff;white-space:nowrap;opacity:0;will-change:transform,opacity}
.pad.shake{animation:shake .32s}
@keyframes shake{20%{transform:translate(-5px,2px) rotate(-.6deg)}40%{transform:translate(5px,-2px) rotate(.6deg)}60%{transform:translate(-3px,1px)}80%{transform:translate(3px,0)}}
.pad.flash::after{content:"";position:absolute;inset:0;border-radius:18px;background:rgba(255,255,255,.35);animation:flash .35s forwards;pointer-events:none;z-index:4}
@keyframes flash{to{opacity:0}}
.pad-result{position:absolute;inset:14px;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px;border-radius:12px;background:rgba(4,19,10,.9);text-align:center;cursor:default;animation:pop-in .25s cubic-bezier(.2,1.4,.4,1)}
@keyframes pop-in{from{transform:scale(.85);opacity:0}}
.pad-result .seg{font-size:clamp(40px,12vh,72px)}
.res-title{font:800 clamp(28px,8vw,44px)/1 var(--display);text-transform:uppercase;color:var(--card-gold)}
.res-sub{font:500 15px/1.4 var(--body);color:var(--muted)}
.res-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:4px}
.res-actions .btn{height:48px;font-size:19px}

/* buttons row */
.lp-cta{display:grid;grid-template-columns:1.6fr 1fr;gap:10px}
.lp-cta .btn{height:52px;padding:0 12px;font-size:21px}

/* sponsored pools carousel (a stack of cards) */
.pools{position:relative}
.pools-head{display:flex;justify-content:space-between;align-items:baseline;margin:0 2px 6px}
.pools-head h2{margin:0;font:800 19px/1 var(--display);text-transform:uppercase;color:#fff}
.pools-head span{font:600 12px var(--body);color:var(--dim)}
.deck{position:relative;height:126px}
.pcard{position:absolute;inset:0 10px 0 0;padding:14px 16px 12px;display:grid;grid-template-rows:auto 1fr auto;gap:4px;text-decoration:none;transition:transform .45s cubic-bezier(.2,.8,.2,1),opacity .45s;will-change:transform}
.pcard::before{inset:6px;border-width:2px;border-radius:10px}
.pcard>*{position:relative}
.pcard[data-pos="0"]{z-index:3;transform:none}
.pcard[data-pos="1"]{z-index:2;transform:translate(8px,6px) rotate(2deg);opacity:.95}
.pcard[data-pos="2"]{z-index:1;transform:translate(14px,10px) rotate(4deg);opacity:.85}
.pcard[data-pos="out"]{z-index:4;transform:translate(-115%,-4px) rotate(-10deg);opacity:0}
.pcard[data-pos="hide"]{z-index:0;opacity:0;transform:translate(14px,10px) rotate(4deg)}
.pc-top{display:flex;justify-content:space-between;align-items:center;gap:6px;font:600 12.5px/1.2 var(--body);color:rgba(255,255,255,.95);min-width:0}
.pc-top span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pc-mid{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0}
.pc-name{font:800 26px/1 var(--display);text-transform:uppercase;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pc-vs{display:flex;align-items:center;gap:8px}
.pc-vs .code{font-size:32px}
.pc-vs .vs{min-width:42px;height:32px;font-size:18px}
.pc-prize{font:800 28px/1 var(--display);color:#fff;white-space:nowrap;text-shadow:0 2px 0 rgba(0,0,0,.2)}
.pc-bot{display:flex;justify-content:space-between;align-items:center;gap:8px}
.pc-players{display:inline-flex;align-items:center;gap:6px;font:700 14px var(--body);color:#fff}
.pc-players svg{width:16px;height:16px}
.pc-bot .segbox{padding:3px 7px;border-radius:8px;gap:5px}
.pc-bot .seg{font-size:15px}
.dots{display:flex;gap:6px;justify-content:center;margin-top:8px}
.dots button{width:8px;height:8px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.3);cursor:pointer}
.dots button[aria-current="true"]{width:20px;border-radius:5px;background:var(--neon)}

/* small phones */
@media (max-height:700px) and (orientation:portrait){.pad{padding:16px 16px 14px}.pad-tag{display:none}.deck{height:112px}.pc-name,.pc-prize{font-size:23px}.pc-vs .code{font-size:27px}.lp-cta .btn{height:48px}}
@media (max-height:600px) and (orientation:portrait){.pools-head{display:none}.dots{display:none}.lp-stats .segbox:nth-child(2){display:none}.pad-bottom{display:none}}
@media (max-width:359px){.lp-stats .segbox:nth-child(2){display:none}.lp-cta .btn{font-size:18px}}

/* landscape phones + desktop: info left, tap area right */
@media (orientation:landscape) and (max-height:560px),(min-width:900px){
  .lp-main{grid-template-rows:1fr;grid-template-columns:minmax(260px,.9fr) 1.3fr;grid-template-areas:"side play";gap:18px;padding-left:max(14px,env(safe-area-inset-left));padding-right:max(14px,env(safe-area-inset-right))}
  .lp-play{grid-area:play;padding-bottom:12px}
  .lp-side{grid-area:side;justify-content:center;overflow:hidden}
  .lp-cta{order:2}
  .pools{order:3}
}
@media (orientation:landscape) and (max-height:560px){
  .lp-bar{padding-top:calc(env(safe-area-inset-top) + 4px);padding-bottom:2px}
  .pad{padding:14px 16px}
  .pad-code{font-size:clamp(54px,17vh,110px)}
  .pad-top .seg{font-size:clamp(22px,8vh,36px)}
  .pad-tag,.pad-bottom{display:none}
  .deck{height:104px}.pc-name,.pc-prize{font-size:22px}.pc-vs .code{font-size:26px}
  .lp-cta .btn{height:44px;font-size:18px}
  .pools-head{margin-bottom:4px}.dots{margin-top:4px}
}
@media (min-width:900px){
  .lp{max-width:1280px;margin:0 auto;width:100%}
  .lp-bar{padding:18px 28px 10px}.lp-bar .ta-logo{width:120px}
  .lp-stats .seg{font-size:18px}
  .lp-main{padding:10px 28px 28px;gap:36px}
  .lp-hello{display:block}
  .lp-hello h1{margin:0;font:800 clamp(48px,4.6vw,72px)/.9 var(--display);text-transform:uppercase;color:#fff}
  .lp-hello p{margin:14px 0 0;max-width:38ch;font-size:18px;line-height:1.5;color:var(--muted)}
  .lp-hello .lp-tagline{margin-top:10px;font:600 italic 18px var(--body);color:var(--neon-soft)}
  .lp-side{gap:22px}
  .lp-cta .btn{height:58px;font-size:23px}
  .deck{height:140px}
}
@media (prefers-reduced-motion:reduce){.live-dot{animation:none}}
`;

const PEOPLE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 19c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6v1h-13z"/><circle cx="17" cy="9" r="2.8"/><path d="M15.6 13.3c3.4-.5 6.2 1.7 6.2 5v1.7h-4.6v-1c0-2.3-.6-4.2-1.6-5.7z"/></svg>';
const naira = n => '₦' + Number(n).toLocaleString('en-NG');
const pad = (n, w) => String(Math.max(0, Math.floor(n))).padStart(w, '0').slice(-w);

function poolCard(p, i) {
  const vs = p.vs && p.vs.length === 2;
  return `<a class="tcard pcard tcard--${esc(p.color || 'green')}" href="${esc(p.href)}" data-pos="${i === 0 ? 0 : i < 3 ? i : 'hide'}" data-ends="${esc(p.endsAt)}" aria-label="${esc(p.name)}, ${p.players} players${p.prize ? ', prize ' + naira(p.prize) : ''}">
  <div class="pc-top"><span>${p.sponsor ? 'Sponsored by ' + esc(p.sponsor) : 'Tap Am pool'}${p.tier ? ' · ' + esc(p.tier) : ''}</span>${p.demo ? '<span class="tag">Demo</span>' : ''}</div>
  <div class="pc-mid">${vs
    ? `<div class="pc-vs"><span class="code">${esc(p.vs[0])}</span><span class="vs">VS</span><span class="code">${esc(p.vs[1])}</span></div>`
    : `<div class="pc-name">${esc(p.name)}</div>`}${p.prize ? `<div class="pc-prize">${naira(p.prize)}</div>` : ''}</div>
  <div class="pc-bot"><span class="pc-players">${PEOPLE}${Number(p.players).toLocaleString('en-NG')} <span style="font-weight:500">players</span></span><span class="segbox"><span class="seg" data-countdown data-label="Time left"></span></span></div>
</a>`;
}

export function landingPage({ user, pools, stats }) {
  const playHref = user ? (user.role === 'ADMIN' ? '/admin' : '/dashboard') : '/signup';
  const body = `<div class="lp">
<header class="lp-bar">
  <a class="ta-logo" href="/" aria-label="Tap Am home"><img src="/assets/logo-tapam.svg" width="179" height="48" alt="tap am"></a>
  <div class="lp-stats">
    <div class="segbox" title="People online now"><span class="live-dot" aria-hidden="true"></span><span class="seg" id="st-online" data-seg="${pad(stats.online, 4)}" data-label="People online"></span></div>
    <div class="segbox" title="Total visits"><span class="seglabel">visits</span><span class="seg" id="st-visits" data-seg="${pad(stats.visits, 6)}" data-label="Total visits"></span></div>
  </div>
  <div class="lp-tools">
    <button type="button" class="iconbtn snd" id="snd" aria-pressed="false" aria-label="Sound on. Tap to mute">${ICONS.sound}</button>
    <button type="button" class="iconbtn" data-menu-open aria-label="Open menu" aria-controls="menu">${ICONS.menu}</button>
  </div>
</header>
<main class="lp-main">
  <section class="lp-play" aria-label="Tap challenge">
    <div class="tcard pad" id="pad" role="button" tabindex="0" aria-describedby="pad-hint">
      <div class="pad-top">
        <div class="segbox"><span class="seglabel">taps</span><span class="seg" id="taps" data-seg="0000" data-label="Taps"></span></div>
        <div class="segbox" style="align-items:flex-end"><span class="seglabel">seconds</span><span class="seg" id="time" data-seg="10.0" data-label="Seconds left"></span></div>
      </div>
      <div class="pad-mid"><div><span class="pad-code">TAP AM</span><span class="pad-hint" id="pad-hint">Tap anywhere on this card to start · 10 seconds</span><span class="pad-tag">${esc(TAGLINE)}</span></div></div>
      <div class="pad-bottom"><span id="best">Your best: —</span><span>Combo: <b id="combo">0</b></span></div>
      <div class="pad-fx" id="fx" aria-hidden="true"></div>
      <div class="pad-result" id="result" hidden></div>
    </div>
  </section>
  <aside class="lp-side">
    <div class="lp-hello"><h1>Who get the fastest finger?</h1><p class="lp-tagline">${esc(TAGLINE)}</p><p>Join live tap pools, tap pass everybody and climb the leaderboard. Free to start.</p></div>
    <div class="lp-cta">
      <a class="btn btn--shine" href="${playHref}">${user ? 'Go play' : 'Oya, join a pool'}</a>
      ${user ? '<a class="btn btn--ghost" href="/how-to-play">How to play</a>' : '<a class="btn btn--ghost" href="/login">Login</a>'}
    </div>
    <section class="pools" aria-label="Sponsored pools" aria-roledescription="carousel">
      <div class="pools-head"><h2>Sponsored pools</h2><span>Lagos time</span></div>
      <div class="deck" id="deck" aria-live="off">${pools.map(poolCard).join('')}</div>
      <div class="dots" id="dots">${pools.map((p, i) => `<button type="button" aria-label="Show ${esc(p.name)}" aria-current="${i === 0}"></button>`).join('')}</div>
    </section>
  </aside>
</main>
</div>
${menuSheet(user)}`;

  const script = `
(function(){
'use strict';
function seg(el,v){var T=window.TA;if(T&&T.seg)T.seg(el,v);else el.setAttribute('data-seg',v);}
var $=function(id){return document.getElementById(id)};
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var store={get:function(k){try{return localStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
var signedIn=${user ? 'true' : 'false'},playHref=${JSON.stringify(playHref)};

/* ── sound ── */
var snd=$('snd'),muted=store.get('ta-muted')==='1',ac=null;
function paintSnd(){snd.setAttribute('aria-pressed',String(muted));snd.setAttribute('aria-label',muted?'Sound off. Tap to unmute':'Sound on. Tap to mute');}
paintSnd();snd.addEventListener('click',function(){muted=!muted;store.set('ta-muted',muted?'1':'0');paintSnd();});
function blip(f,d,type){if(muted)return;try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();var o=ac.createOscillator(),g=ac.createGain();o.type=type||'square';o.frequency.value=f;g.gain.value=.035;o.connect(g);g.connect(ac.destination);var t=ac.currentTime;o.start(t);g.gain.exponentialRampToValueAtTime(.0001,t+(d||.06));o.stop(t+(d||.06)+.01);}catch(e){}}
function buzz(p){if(navigator.vibrate){try{navigator.vibrate(p)}catch(e){}}}

/* ── tap challenge ── */
var padEl=$('pad'),fx=$('fx'),tapsEl=$('taps'),timeEl=$('time'),comboEl=$('combo'),bestEl=$('best'),hint=$('pad-hint'),result=$('result');
var DUR=10000,state='idle',taps=0,combo=0,lastTap=0,t0=0,raf=0,lastShown='';
var best=+(store.get('ta-best')||0);if(best)bestEl.textContent='Your best: '+best;
var COLORS=['#ffffff','#00ff6e','#efc032','#e2802a','#9fb0ff','#59ffb4'];
function make(cls,n){var a=[];for(var i=0;i<n;i++){var e=document.createElement('span');e.className=cls;fx.appendChild(e);a.push(e);}return a;}
var pluses=make('fx-plus',36),rings=make('fx-ring',8),bits=make('fx-bit',30),comboEl2=make('fx-combo',1)[0];
var pi=0,ri=0,bi=0;
function rnd(a,b){return a+Math.random()*(b-a)}
function shootPlus(x,y,label){
  var el=pluses[pi++%pluses.length],r=padEl.getBoundingClientRect(),reach=Math.min(r.width,r.height);
  var ang=rnd(0,Math.PI*2),dist=rnd(.22,.48)*reach,dx=Math.cos(ang)*dist,dy=Math.sin(ang)*dist-reach*.08;
  var s=rnd(1,1.9)+Math.min(combo,40)/40,rot=rnd(-35,35);
  el.textContent=label||'+1';el.style.color=COLORS[(Math.random()*COLORS.length)|0];el.style.fontSize=(rnd(38,58)|0)+'px';
  var dur=rnd(700,1000);
  el.animate([{transform:'translate('+x+'px,'+y+'px) translate(-50%,-50%) scale(.4) rotate(0deg)'},
    {transform:'translate('+(x+dx*.7)+'px,'+(y+dy*.7)+'px) translate(-50%,-50%) scale('+s+') rotate('+rot*.6+'deg)',offset:.35},
    {transform:'translate('+(x+dx)+'px,'+(y+dy)+'px) translate(-50%,-50%) scale('+(s*.85)+') rotate('+rot+'deg)'}],
    {duration:dur,easing:'cubic-bezier(.15,.85,.25,1)'});
  el.animate([{opacity:1},{opacity:1,offset:.7},{opacity:0}],{duration:dur,easing:'linear'});
}
function ring(x,y){var el=rings[ri++%rings.length];el.animate([{transform:'translate('+x+'px,'+y+'px) scale(.3)',opacity:.9},{transform:'translate('+x+'px,'+y+'px) scale(2.2)',opacity:0}],{duration:420,easing:'ease-out'});}
function confetti(x,y,n){for(var i=0;i<n;i++){var el=bits[bi++%bits.length],a=rnd(0,Math.PI*2),d=rnd(80,240),c=COLORS[(Math.random()*COLORS.length)|0];el.style.background=c;
  el.animate([{transform:'translate('+x+'px,'+y+'px) rotate(0deg)',opacity:1},{transform:'translate('+(x+Math.cos(a)*d)+'px,'+(y+Math.sin(a)*d+120)+'px) rotate('+rnd(-540,540)+'deg)',opacity:0}],{duration:rnd(800,1300),easing:'cubic-bezier(.2,.7,.3,1)'});}}
function banner(text){comboEl2.textContent=text;comboEl2.animate([{transform:'translate(-50%,-50%) scale(.3) rotate(-12deg)',opacity:0},{transform:'translate(-50%,-50%) scale(1.15) rotate(-4deg)',opacity:1,offset:.25},{transform:'translate(-50%,-50%) scale(1) rotate(-4deg)',opacity:1,offset:.75},{transform:'translate(-50%,-70%) scale(.9) rotate(-4deg)',opacity:0}],{duration:900,easing:'linear'});}
function kick(cls){padEl.classList.remove(cls);void padEl.offsetWidth;padEl.classList.add(cls);}
function tick(){var left=Math.max(0,DUR-(performance.now()-t0)),s=(left/1000).toFixed(1);if(s.length<4)s='0'+s;if(s!==lastShown){seg(timeEl,s);lastShown=s;}if(left<=0){finish();return;}raf=requestAnimationFrame(tick);}
function start(){state='run';taps=0;combo=0;t0=performance.now();hint.textContent='Go go go!';result.hidden=true;tick();}
function hit(x,y){
  if(state==='done')return;
  if(state==='idle')start();
  var now=performance.now();combo=(now-lastTap<260)?combo+1:1;lastTap=now;taps++;
  seg(tapsEl,('000'+taps).slice(-4));comboEl.textContent=combo;
  padEl.animate([{transform:'scale(.985)'},{transform:'scale(1)'}],{duration:110});
  if(!reduce){shootPlus(x,y);if(combo>15&&Math.random()<.5)shootPlus(x,y,combo>30?'+1':'+1');ring(x,y);}
  blip(220+Math.min(combo,40)*18,.05);
  if(combo>0&&combo%10===0){banner('COMBO x'+combo);kick('shake');buzz(30);blip(660,.12,'sawtooth');if(!reduce)confetti(x,y,10);}
  if(taps===25||taps===50||taps===75||taps===100||taps===150){var r=padEl.getBoundingClientRect();banner(taps+' TAPS!');kick('flash');buzz([30,40,30]);blip(880,.18,'triangle');if(!reduce)confetti(r.width/2,r.height/2,30);}
}
function title(n){return n>=120?'Finger of the year':n>=100?'Odogwu finger':n>=80?'Para para boy':n>=60?'Sharp finger':n>=40?'Lapo starter':n>=20?'Slow whine':'Warm up small'}
function finish(){
  state='done';cancelAnimationFrame(raf);seg(timeEl,'00.0');hint.textContent='Time up!';buzz(60);
  var newBest=taps>best;if(newBest){best=taps;store.set('ta-best',String(best));bestEl.textContent='Your best: '+best;}
  result.innerHTML='';
  var t=document.createElement('div');t.className='res-title';t.textContent=title(taps);
  var box=document.createElement('div');box.className='segbox';var s=document.createElement('span');s.className='seg';box.appendChild(s);
  var sub=document.createElement('div');sub.className='res-sub';sub.textContent=taps+' taps in 10 seconds ('+(taps/10).toFixed(1)+' per second)'+(newBest&&taps>0?' · New best!':'');
  var act=document.createElement('div');act.className='res-actions';
  var again=document.createElement('button');again.type='button';again.className='btn btn--ghost';again.textContent='Tap again';
  var go=document.createElement('a');go.className='btn btn--shine';go.href=playHref;go.textContent=signedIn?'Tap for real':'Join a pool for real';
  act.appendChild(again);act.appendChild(go);
  [t,box,sub,act].forEach(function(n){result.appendChild(n)});
  result.hidden=false;seg(s,('000'+taps).slice(-4));
  if(newBest&&taps>0&&!reduce){var r=padEl.getBoundingClientRect();confetti(r.width/2,r.height/3,30);}
  again.addEventListener('click',function(e){e.stopPropagation();reset();});
  go.addEventListener('pointerdown',function(e){e.stopPropagation();});
  setTimeout(function(){if(state==='done')state='shown';},400);
}
function reset(){state='idle';taps=0;combo=0;seg(tapsEl,'0000');seg(timeEl,'10.0');lastShown='';comboEl.textContent='0';hint.textContent='Tap anywhere on this card to start · 10 seconds';result.hidden=true;padEl.focus();}
padEl.addEventListener('pointerdown',function(e){
  if(result.contains(e.target))return;
  if(state==='shown'){return;}
  e.preventDefault();var r=padEl.getBoundingClientRect();hit(e.clientX-r.left,e.clientY-r.top);
},{passive:false});
padEl.addEventListener('keydown',function(e){if((e.key===' '||e.key==='Enter')&&!result.contains(e.target)){e.preventDefault();if(state==='shown')return;var r=padEl.getBoundingClientRect();hit(r.width/2,r.height/2);}});
padEl.addEventListener('contextmenu',function(e){e.preventDefault()});

/* ── sponsored pools deck ── */
var cards=[].slice.call(document.querySelectorAll('.pcard')),dots=[].slice.call(document.querySelectorAll('#dots button')),cur=0,timer=0,n=cards.length;
function layout(){cards.forEach(function(c,i){var p=(i-cur+n)%n;c.setAttribute('data-pos',p<3?String(p):'hide');c.tabIndex=p===0?0:-1;c.setAttribute('aria-hidden',String(p!==0));});dots.forEach(function(d,i){d.setAttribute('aria-current',String(i===cur))});}
function next(){if(n<2)return;var out=cards[cur];out.setAttribute('data-pos','out');cur=(cur+1)%n;setTimeout(layout,0);setTimeout(function(){layout()},460);}
function go(i){cur=i;layout();restart();}
function restart(){clearInterval(timer);if(n>1&&!reduce)timer=setInterval(next,4500);}
dots.forEach(function(d,i){d.addEventListener('click',function(){go(i)})});
var deck=$('deck'),sx=0;
deck.addEventListener('pointerdown',function(e){sx=e.clientX;clearInterval(timer);});
deck.addEventListener('pointerup',function(e){var dx=e.clientX-sx;if(Math.abs(dx)>40){e.preventDefault();go(dx<0?(cur+1)%n:(cur-1+n)%n);}else restart();});
deck.addEventListener('click',function(e){if(Math.abs(e.clientX-sx)>40)e.preventDefault();});
document.addEventListener('visibilitychange',function(){if(document.hidden)clearInterval(timer);else restart();});
layout();restart();

/* countdowns (one shared timer) */
var cds=[].slice.call(document.querySelectorAll('[data-countdown]'));
function fmt(ms){if(ms<=0)return'00:00:00';var s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60);s=s%60;return('0'+Math.min(h,99)).slice(-2)+':'+('0'+m).slice(-2)+':'+('0'+s).slice(-2);}
function tickCd(){var now=Date.now();cds.forEach(function(el){var end=Date.parse(el.closest('.pcard').getAttribute('data-ends'));seg(el,fmt(end-now));});}
tickCd();setInterval(tickCd,1000);

/* ── online + visits ── */
var vid=store.get('ta-vid');if(!vid){vid=(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));store.set('ta-vid',vid);}
function ping(){if(document.hidden)return;fetch('/api/presence',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({vid:vid})}).then(function(r){return r.ok?r.json():null}).then(function(j){if(!j)return;seg($('st-online'),('000'+j.online).slice(-4));seg($('st-visits'),('00000'+j.visits).slice(-6));}).catch(function(){if(window.TA&&window.TA.netFailed)window.TA.netFailed();});}
ping();setInterval(ping,45000);document.addEventListener('visibilitychange',function(){if(!document.hidden)ping();});document.addEventListener('ta:online',ping);
})();`;

  return themeShell({ title: 'Tap fast, climb the board', description: 'Tap Am: live tapping games for the people. Tap pass everybody, climb the leaderboard and win sponsored pools.', body, script, css: CSS, bodyClass: 'is-landing' });
}

// Demo sponsored pools shown until real ones are switched on in settings.
export function demoPools(now = Date.now()) {
  const inMin = m => new Date(now + m * 60000).toISOString();
  return [
    { name: 'Team Jollof vs Team Fried Rice', sponsor: 'Mama Put Kitchen', vs: ['JOL', 'FRD'], prize: 50000, players: 1284, endsAt: inMin(134), color: 'orange', demo: true },
    { name: 'Friday Night Tap', sponsor: 'Chop Life Drinks', prize: 100000, players: 842, endsAt: inMin(302), color: 'gold', demo: true },
    { name: 'Lagos vs Abuja', sponsor: 'Eko Data', vs: ['LAG', 'ABJ'], prize: 75000, players: 2310, endsAt: inMin(47), color: 'green', demo: true },
    { name: 'Lapo babies only', sponsor: 'Kampe Fintech', tier: 'Lapo only', prize: 20000, players: 356, endsAt: inMin(90), color: 'mustard', demo: true }
  ];
}
