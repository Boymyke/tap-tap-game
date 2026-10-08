// Home page — mobile first. The one loud element is the live "try am" tap disc in the hero;
// everything else stays quiet so the game itself is the pitch.
import { themeShell, esc, TAGLINE, FERRN_URL } from './theme.js';

const CSS = `
.hm{min-height:100dvh;display:flex;flex-direction:column}
.hm-bar{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:calc(env(safe-area-inset-top) + 12px) 16px 12px;background:rgba(0,19,12,.82);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid rgba(89,255,180,.08)}
.hm-bar .ta-logo{width:104px}
.hm-nav{display:flex;align-items:center;gap:6px}
.hm-nav a,.hm-nav button{font-family:inherit;font-size:14px;font-weight:500;text-decoration:none;border-radius:8px;padding:9px 12px;border:0;cursor:pointer;background:none;color:var(--label)}
.hm-nav a:hover,.hm-nav button:hover{color:var(--accent)}
.hm-nav .hm-cta{background:var(--accent);color:var(--ink);box-shadow:inset 0 -3px 3px -2px #002f03}
.hm-nav .hm-cta:hover{color:var(--ink);filter:brightness(1.06)}
.hm-main{flex:1;width:100%;max-width:1080px;margin:0 auto;padding:0 16px}

.hm-hero{display:grid;gap:28px;padding:36px 0 40px;text-align:center}
.hm-hero h1{margin:0;font-size:clamp(38px,11vw,64px);line-height:.98;font-weight:900;font-style:italic;letter-spacing:-.02em;color:#fff;text-wrap:balance}
.hm-tag{margin:14px 0 0;font-size:15px;color:var(--tagline);font-style:italic}
.hm-lede{margin:16px auto 0;max-width:34ch;font-size:16px;line-height:1.55;color:var(--body)}
.hm-actions{display:grid;gap:10px;margin:24px auto 0;max-width:340px}
.hm-actions .ta-btn{margin:0;display:flex;align-items:center;justify-content:center;text-decoration:none}
.hm-actions .hm-secondary{display:flex;align-items:center;justify-content:center;height:46px;border-radius:8px;border:1px solid rgba(89,255,180,.3);color:var(--label);text-decoration:none;font-weight:500}
.hm-actions .hm-secondary:hover{border-color:var(--accent);color:var(--accent)}

.hm-try{display:flex;flex-direction:column;align-items:center;gap:14px;padding:24px 16px 28px;border-radius:20px;background:radial-gradient(120% 90% at 50% 40%,rgba(0,255,110,.10),rgba(0,19,12,.0) 65%),linear-gradient(180deg,var(--card-top),var(--card-bot));box-shadow:0 24px 60px rgba(0,0,0,.35)}
.hm-try-head{font-size:15px;color:var(--label)}
.hm-try-head b{color:#fff}
.hm-disc{position:relative;width:min(64vw,230px);aspect-ratio:1;border-radius:50%;border:0;cursor:pointer;touch-action:manipulation;user-select:none;-webkit-user-select:none;
  background:radial-gradient(circle at 50% 38%,#6bffab 0%,#00ff6e 38%,#00c957 72%,#008a3c 100%);color:var(--ink);font:900 italic clamp(34px,10vw,46px)/1 Roboto,system-ui,sans-serif;letter-spacing:-.02em;
  box-shadow:0 0 0 10px rgba(0,255,110,.08),0 0 0 22px rgba(0,255,110,.04),0 18px 60px rgba(0,255,55,.45),inset 0 -10px 18px rgba(0,47,3,.45),inset 0 8px 14px rgba(255,255,255,.35);transition:transform .06s}
.hm-disc:active,.hm-disc.is-hit{transform:scale(.955)}
.hm-disc[disabled]{cursor:default;filter:saturate(.5) brightness(.75)}
.hm-disc small{display:block;margin-top:6px;font-size:13px;font-style:normal;font-weight:500;letter-spacing:0}
.hm-pop{position:absolute;left:50%;top:18%;transform:translateX(-50%);font:800 18px/1 Roboto,system-ui,sans-serif;color:#fff;pointer-events:none;animation:hm-pop .5s ease-out forwards}
@keyframes hm-pop{to{transform:translate(-50%,-38px);opacity:0}}
.hm-meter{display:flex;gap:22px;font-variant-numeric:tabular-nums}
.hm-meter div{text-align:center}
.hm-meter b{display:block;font-size:30px;font-weight:800;color:#fff;line-height:1}
.hm-meter span{font-size:12px;color:var(--hint)}
.hm-try-result{max-width:30ch;text-align:center;font-size:14px;line-height:1.5;color:var(--body);min-height:42px}
.hm-try-result a{color:var(--accent)}
@media (prefers-reduced-motion:reduce){.hm-pop{display:none}}

.hm-sec{padding:34px 0}
.hm-sec h2{margin:0 0 6px;font-size:24px;font-weight:800;font-style:italic;color:#fff;letter-spacing:-.01em}
.hm-sec>p.hm-sub{margin:0 0 18px;font-size:14px;color:var(--hint)}

.hm-games{display:grid;gap:12px}
.hm-game{display:grid;gap:8px;padding:16px;border-radius:14px;background:linear-gradient(180deg,rgba(0,39,25,.92),rgba(0,19,12,.92));border:1px solid rgba(89,255,180,.08)}
.hm-game-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
.hm-status{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:4px 9px;border-radius:999px;background:rgba(89,255,180,.08);color:var(--tagline)}
.hm-status.is-live{background:rgba(0,255,110,.14);color:var(--accent)}
.hm-status.is-live::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 0 rgba(0,255,110,.6);animation:hm-live 1.6s infinite}
.hm-status.is-ended{color:#8aa79a;background:rgba(255,255,255,.05)}
@keyframes hm-live{70%{box-shadow:0 0 0 7px rgba(0,255,110,0)}100%{box-shadow:0 0 0 0 rgba(0,255,110,0)}}
@media (prefers-reduced-motion:reduce){.hm-status.is-live::before{animation:none}}
.hm-odogwu{font-size:12px;font-weight:600;color:#ffd23f}
.hm-game h3{margin:0;font-size:18px;color:#fff}
.hm-game p{margin:0;font-size:14px;line-height:1.5;color:var(--body)}
.hm-game-meta{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:13px;color:var(--hint)}
.hm-game a{justify-self:start;margin-top:4px;font-size:14px;font-weight:600;color:var(--accent);text-decoration:none}
.hm-game a:hover{text-decoration:underline;text-underline-offset:3px}
.hm-empty{padding:22px 18px;border-radius:14px;border:1px dashed rgba(89,255,180,.25);text-align:center;color:var(--body);font-size:15px;line-height:1.55}
.hm-empty a{color:var(--accent)}

.hm-steps{display:grid;gap:10px;margin:0;padding:0;list-style:none;counter-reset:s}
.hm-steps li{counter-increment:s;display:grid;grid-template-columns:38px 1fr;gap:12px;align-items:start;padding:14px;border-radius:12px;background:rgba(0,19,12,.7)}
.hm-steps li::before{content:counter(s);display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:var(--tab-active);color:#fff;font-weight:800;font-style:italic;font-size:17px}
.hm-steps b{display:block;color:#fff;font-size:16px;margin-bottom:2px}
.hm-steps span{font-size:14px;line-height:1.5;color:var(--body)}

.hm-tiers{display:grid;gap:12px}
.hm-tier{padding:20px 18px;border-radius:16px;background:linear-gradient(180deg,var(--card-top),var(--card-bot))}
.hm-tier h3{margin:0;font-size:20px;font-style:italic;font-weight:800;color:#fff}
.hm-tier .hm-price{margin:4px 0 12px;font-size:14px;color:var(--tagline)}
.hm-tier ul{margin:0;padding:0;list-style:none;display:grid;gap:8px}
.hm-tier li{display:flex;gap:10px;font-size:14px;line-height:1.45;color:var(--body)}
.hm-tier li::before{content:"";flex:none;width:16px;height:16px;margin-top:1px;border-radius:50%;background:var(--accent) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4.5 8.2l2.2 2.2 4.8-4.8' fill='none' stroke='%23000100' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/16px no-repeat}
.hm-tier--odogwu{background:linear-gradient(160deg,#2b2400,#0d0a00 70%);border:1px solid rgba(255,210,63,.35)}
.hm-tier--odogwu h3{color:#ffd23f}
.hm-tier--odogwu .hm-price{color:#ffe28a}
.hm-tier--odogwu li::before{background-color:#ffd23f}

.hm-ad{display:block;margin:6px 0 0;padding:16px;border-radius:14px;border:1px dashed rgba(89,255,180,.25);text-align:center;color:var(--body);text-decoration:none}
.hm-ad small{display:block;margin-bottom:6px;font-size:11px;color:var(--hint)}
.hm-ad img{max-width:100%;max-height:140px;border-radius:8px}

.hm-foot{margin-top:24px;padding:28px 16px calc(28px + env(safe-area-inset-bottom));border-top:1px solid rgba(89,255,180,.1);background:rgba(0,19,12,.8)}
.hm-foot-in{max-width:1080px;margin:0 auto;display:grid;gap:18px;justify-items:center;text-align:center}
.hm-foot .ta-logo{width:96px}
.hm-foot nav{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 18px;font-size:14px}
.hm-foot nav a{color:var(--body);text-decoration:none}
.hm-foot nav a:hover{color:var(--accent)}
.hm-foot .ta-powered{margin:0}

@media (min-width:760px){
  .hm-bar{padding-left:max(24px,calc((100vw - 1080px)/2));padding-right:max(24px,calc((100vw - 1080px)/2))}
  .hm-bar .ta-logo{width:120px}
  .hm-main{padding:0 24px}
  .hm-hero{grid-template-columns:1.1fr .9fr;align-items:center;gap:40px;padding:64px 0 56px;text-align:left}
  .hm-lede{margin-left:0}
  .hm-actions{grid-template-columns:auto auto;justify-content:start;margin-left:0;max-width:none}
  .hm-actions .ta-btn{padding:0 26px}
  .hm-actions .hm-secondary{padding:0 22px;height:50px}
  .hm-games{grid-template-columns:repeat(2,1fr)}
  .hm-tiers{grid-template-columns:1fr 1fr}
  .hm-steps{grid-template-columns:repeat(2,1fr)}
  .hm-sec h2{font-size:30px}
}
@media (min-width:1020px){.hm-games{grid-template-columns:repeat(3,1fr)}.hm-steps{grid-template-columns:repeat(4,1fr)}.hm-steps li{grid-template-columns:1fr}}
`;

const lagosTime = iso => {
  try {
    return new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
  } catch { return iso; }
};

function gameCard(p, user) {
  const now = Date.now(), start = Date.parse(p.starts_at), end = Date.parse(p.ends_at);
  const state = now < start ? 'soon' : now < end ? 'live' : 'ended';
  const label = { soon: 'Starting soon', live: 'Live now', ended: 'Ended' }[state];
  const when = state === 'soon' ? `Starts ${lagosTime(p.starts_at)}` : state === 'live' ? `Ends ${lagosTime(p.ends_at)}` : `Ended ${lagosTime(p.ends_at)}`;
  const fee = Number(p.entry_fee) > 0 ? `₦${Number(p.entry_fee).toLocaleString('en-NG')} entry` : 'Free entry';
  const odogwu = p.min_tier === 'ODOGWO' || p.min_tier === 'ODOGWU';
  const href = user ? '/dashboard' : '/signup';
  const action = state === 'ended' ? 'See results' : state === 'live' ? 'Join and tap' : 'Get ready';
  return `<article class="hm-game">
  <div class="hm-game-top"><span class="hm-status is-${state}">${label}</span>${odogwu ? '<span class="hm-odogwu">Odogwu only</span>' : ''}</div>
  <h3>${esc(p.name)}</h3>
  ${p.description ? `<p>${esc(p.description)}</p>` : ''}
  <div class="hm-game-meta"><span>${esc(when)}</span><span>${fee}</span></div>
  <a href="${href}">${action}</a>
</article>`;
}

export function homePage({ user, pools = [], ad = null }) {
  const nav = user
    ? `${user.role === 'ADMIN' ? '<a href="/admin">Admin</a>' : ''}<button type="button" id="logout">Logout</button><a class="hm-cta" href="${user.role === 'ADMIN' ? '/admin' : '/dashboard'}">Play</a>`
    : `<a href="/login">Login</a><a class="hm-cta" href="/signup">Sign up</a>`;

  const games = pools.length
    ? `<div class="hm-games">${pools.map(p => gameCard(p, user)).join('')}</div>`
    : `<div class="hm-empty">No game dey run now. New games go drop soon${user ? ', we go show am for your dashboard.' : ` — <a href="/signup">create your account</a> so you go ready.`}</div>`;

  const adBlock = ad ? (() => {
    const inner = ad.image_url ? `<small>Sponsored</small><img src="${esc(ad.image_url)}" alt="${esc(ad.title)}" loading="lazy">` : `<small>Sponsored</small><strong>${esc(ad.title)}</strong>`;
    return ad.target_url ? `<a class="hm-ad" href="${esc(ad.target_url)}" target="_blank" rel="noopener sponsored">${inner}</a>` : `<div class="hm-ad">${inner}</div>`;
  })() : '';

  const body = `<div class="hm">
<header class="hm-bar">
  <a class="ta-logo" href="/" aria-label="Tap Am home"><img src="/assets/logo-tapam.svg" width="179" height="48" alt="tap am"></a>
  <nav class="hm-nav" aria-label="Main">${nav}</nav>
</header>
<main class="hm-main">
  <section class="hm-hero">
    <div>
      <h1>Who get the fastest finger?</h1>
      <p class="hm-tag">${esc(TAGLINE)}</p>
      <p class="hm-lede">Join live tap games, tap pass everybody and climb the leaderboard. E free to start.</p>
      <div class="hm-actions">
        ${user
          ? `<a class="ta-btn ta-btn--shine" href="${user.role === 'ADMIN' ? '/admin' : '/dashboard'}">Go play</a><a class="hm-secondary" href="/how-to-play">How to play</a>`
          : `<a class="ta-btn ta-btn--shine" href="/signup">Oya, create my account</a><a class="hm-secondary" href="/login">I get account, log me in</a>`}
      </div>
    </div>
    <div class="hm-try" aria-labelledby="try-head">
      <div class="hm-try-head" id="try-head"><b>Try am:</b> how many taps you fit do for 10 seconds?</div>
      <button type="button" class="hm-disc" id="disc" aria-describedby="try-result">TAP<small>Tap to start</small></button>
      <div class="hm-meter" aria-live="off"><div><b id="taps">0</b><span>taps</span></div><div><b id="secs">10.0</b><span>seconds</span></div></div>
      <p class="hm-try-result" id="try-result" aria-live="polite">Na practice be this. Real games dey count every tap on the leaderboard.</p>
    </div>
  </section>

  <section class="hm-sec" aria-labelledby="games-h">
    <h2 id="games-h">Games wey dey</h2>
    <p class="hm-sub">Times na Lagos time.</p>
    ${games}
    ${adBlock}
  </section>

  <section class="hm-sec" aria-labelledby="how-h">
    <h2 id="how-h">How e dey work</h2>
    <p class="hm-sub">From sign-up to leaderboard in four steps.</p>
    <ol class="hm-steps">
      <li><div><b>Create your account</b><span>Pick a nickname and confirm your email with the code we send.</span></div></li>
      <li><div><b>Join a game</b><span>Choose from the list or enter the game hashtag your guy send you.</span></div></li>
      <li><div><b>Tap when e open</b><span>The tap button wakes up when the game starts. Tap fast, build combo.</span></div></li>
      <li><div><b>Climb the board</b><span>Every tap counts live. Top fingers sit for the top when the game closes.</span></div></li>
    </ol>
  </section>

  <section class="hm-sec" aria-labelledby="tiers-h">
    <h2 id="tiers-h">Pick your level</h2>
    <p class="hm-sub">Everybody start as Civil Servant. Upgrade anytime.</p>
    <div class="hm-tiers">
      <div class="hm-tier"><h3>Civil Servant</h3><p class="hm-price">Free</p>
        <ul><li>Join all standard games</li><li>Live leaderboards</li><li>Booster store</li></ul></div>
      <div class="hm-tier hm-tier--odogwu"><h3>Odogwu</h3><p class="hm-price">Premium</p>
        <ul><li>Odogwu-only games</li><li>Odogwu badge on the leaderboard</li><li>Special boosters</li></ul></div>
    </div>
  </section>
</main>
<footer class="hm-foot">
  <div class="hm-foot-in">
    <a class="ta-logo" href="/" aria-label="Tap Am home"><img src="/assets/logo-tapam.svg" width="179" height="48" alt="tap am"></a>
    <nav aria-label="Footer"><a href="/how-to-play">How to play</a><a href="/suggest">Suggest something</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/disclaimer">Disclaimer</a></nav>
    <p class="ta-powered">Powered by <a href="${FERRN_URL}" target="_blank" rel="noopener">Ferrn Agency</a></p>
  </div>
</footer>
</div>`;

  const script = `
(function(){
'use strict';
var lo=document.getElementById('logout');
if(lo)lo.addEventListener('click',async function(){lo.disabled=true;try{await fetch('/api/logout',{method:'POST',credentials:'same-origin'})}catch(_){}location.href='/';});

var disc=document.getElementById('disc'),tapsEl=document.getElementById('taps'),secsEl=document.getElementById('secs'),res=document.getElementById('try-result');
var DUR=10000,state='idle',taps=0,t0=0,raf=0,signedIn=${user ? 'true' : 'false'};
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function label(main,sub){disc.innerHTML='';disc.appendChild(document.createTextNode(main));var s=document.createElement('small');s.textContent=sub;disc.appendChild(s);}
function tick(){var left=Math.max(0,DUR-(performance.now()-t0));secsEl.textContent=(left/1000).toFixed(1);if(left<=0){finish();return;}raf=requestAnimationFrame(tick);}
function finish(){state='done';cancelAnimationFrame(raf);secsEl.textContent='0.0';disc.disabled=true;label('DONE',taps+' taps');
  var rate=(taps/10).toFixed(1);
  res.innerHTML='';res.appendChild(document.createTextNode('You do '+taps+' taps ('+rate+' per second). '));
  var a=document.createElement('a');a.href=signedIn?'/dashboard':'/signup';a.textContent=signedIn?'Go tap for real':'Create account make you tap for real';res.appendChild(a);
  setTimeout(function(){disc.disabled=false;state='idle';label('AGAIN','Tap to restart');},1600);}
function pop(){if(reduce)return;var p=document.createElement('span');p.className='hm-pop';p.textContent='+1';disc.appendChild(p);setTimeout(function(){p.remove()},520);}
disc.addEventListener('pointerdown',function(e){
  e.preventDefault();
  if(state==='done')return;
  if(state==='idle'){state='run';taps=0;t0=performance.now();res.textContent='Go go go!';tick();}
  taps++;tapsEl.textContent=taps;label('TAP',taps>=50?'Odogwu finger!':taps>=25?'You dey try!':'Keep tapping');pop();
  disc.classList.add('is-hit');setTimeout(function(){disc.classList.remove('is-hit')},70);
});
disc.addEventListener('keydown',function(e){if(e.key===' '||e.key==='Enter'){e.preventDefault();disc.dispatchEvent(new PointerEvent('pointerdown'));}});
})();`;

  return themeShell({ title: 'Tap fast, climb the board', description: 'Tap Am: live tapping games for the people. Tap pass everybody and climb the leaderboard.', body, script, css: CSS });
}
