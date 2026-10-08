// Info pages (how to play, rules, merch, FAQ, about), offline page and error pages.
import { themeShell, esc, topBar, menuSheet, FERRN_URL } from './theme.js';

const CARD_COLORS = ['', 'tcard--orange', 'tcard--gold', 'tcard--mustard', 'tcard--ink'];

export function docLayout({ user, title, h1, intro, tabs = null, current = '', cards, foot = '', script = '', css = '' }) {
  const tabNav = tabs ? `<nav class="doc-tabs" aria-label="${esc(h1)} sections">${tabs.map(([href, label]) => `<a href="${href}" ${href === current ? 'aria-current="page"' : ''}>${esc(label)}</a>`).join('')}</nav>` : '';
  const body = `${topBar(user, { back: true })}
<main class="doc">
  <div class="doc-head"><h1>${esc(h1)}</h1>${intro ? `<p>${intro}</p>` : ''}</div>
  ${tabNav}
  ${cards}
  ${foot}
</main>
${menuSheet(user)}`;
  return themeShell({ title, body, script, css });
}

const card = (inner, i = 0, extra = '') => `<section class="tcard doc-card ${CARD_COLORS[i % CARD_COLORS.length]} ${extra}">${inner}</section>`;

// ── How to play ──────────────────────────────────────────────────────────────
export function howToPlayPage(user) {
  const sections = [
    ['Pick your pool', `<p>A pool na one tapping battle with a start time and an end time. Join from the home page, your dashboard, or with a pool code wey your guy send you.</p>
<ul><li><strong>Free pools</strong> — no entry fee. Just tap.</li>
<li><strong>Paid pools</strong> — everybody pays the same entry fee and the fees make up the prize.</li>
<li><strong>Sponsored pools</strong> — a brand puts up the prize. Some are only for Lapo babies, some only for Nepo babies.</li>
<li><strong>Private pools</strong> — locked with a password that Tap Am generates. Share it with who you want.</li></ul>`],
    ['Wait for the whistle', `<p>Before a pool starts you sit in the lobby with a countdown. The tap area stays locked until the exact start time, then e wake up. Taps before the start or after the end no count.</p>`],
    ['Tap like your life depend on am', `<p>The tap area is one big box. Tap anywhere inside it, as fast as you fit. Fast taps in a row build a <strong>combo</strong> — your phone vibrates and the screen goes mad when you hit big combos and milestones.</p>
<p>Turn your phone sideways and the tap area moves to the right, with your scores and the leaderboard on the left. You can mute the sound anytime.</p>`],
    ['Boosters', `<p>Boosters multiply your taps for a few seconds (like 2× for 30 seconds). You can use <strong>one booster per pool</strong>, so pick your moment. New accounts get some free boosters to start.</p>`],
    ['Who wins', `<p>The highest tapper when the pool closes wins. Each pool shows how the prize is shared before you join — winner takes all, or split among the top players.</p>
<p>If players tie, the pool's own rule decides: either <strong>the player who reached that score first wins</strong>, or <strong>the tied players split the prize</strong>. You'll see which one before you join.</p>`],
    ['Ranks', `<p>There are 100 ranks. You climb by tapping and by playing games. Some ranks also need milestones, like playing 100 games. Higher ranks unlock perks — for example, Nepo babies who reach <strong>Para para boy</strong> or higher can talk in live games.</p>`],
    ['Lapo babies and Nepo babies', `<p><strong>Lapo babies</strong> play free: free pools, some paid pools, two tap skins (boy or girl), starter boosters and the store.</p>
<p><strong>Nepo babies</strong> pay <strong>₦13,000 a month</strong>, or <strong>₦120,000 a year</strong> (that's ₦10,000 a month). They get everything Lapo babies get, plus: play up to 10 pools at once (one tap counts in all of them), create pools, gift boosters, more skins and tap-box shapes, the booster calculator, custom colours and live voice in games.</p>`],
    ['Wallet and winnings', `<p>Your account has two balances:</p>
<ul><li><strong>Wallet</strong> — money you add to pay entry fees and buy boosters or skins. Money you add <strong>can't be withdrawn</strong>; you spend it inside Tap Am.</li>
<li><strong>Winnings</strong> — money you win. You can withdraw it to your bank once it reaches the minimum: <strong>₦10,000 for Lapo babies</strong>, <strong>₦5,000 for Nepo babies</strong>.</li></ul>`],
    ['Share and get boosters', `<p>Share your invite link. For every 10 people who sign up with it, we gift you a booster.</p>`]
  ];
  const cards = `<div class="doc-lede tcard--flat" style="margin:0 6px 18px">Tap Am is in early access. Paid pools, wallets, boosters and Nepo features are rolling out in stages — you'll see them appear in the app as they go live.</div>`
    + sections.map(([h, b], i) => card(`<h2>${i + 1}. ${esc(h)}</h2>${b}`, i)).join('');
  return docLayout({ user, title: 'How to play', h1: 'How to play', intro: 'Everything you need to know before you start tapping.', cards,
    foot: `<div class="doc-foot"><a class="btn btn--shine" href="${user ? '/dashboard' : '/signup'}">${user ? 'Go play' : 'Oya, create my account'}</a><a class="btn btn--ghost" href="/rules">Read the rules</a></div>` });
}

// ── Rules & policies hub ─────────────────────────────────────────────────────
export function rulesPage(user) {
  const sections = [
    ['Fair play', `<ul><li>Only your own fingers. No auto-clickers, bots, scripts, macros or modified apps.</li>
<li>One account per person. No playing with someone else's account.</li>
<li>Our system checks every tap. Suspicious taps are removed and cheaters can be disqualified or banned, and any winnings from cheating are cancelled.</li></ul>`],
    ['Pools', `<ul><li>Entry fees are taken when you join a paid pool and are not refunded once the pool starts.</li>
<li>A pool can't be deleted by its creator once it is created — it runs until it ends. Creators see this before they create one.</li>
<li>Private pools use a password that Tap Am generates. Anyone with the password can join.</li>
<li>The prize split and the tie rule are shown on every pool before you join.</li></ul>`],
    ['Wallet and withdrawals', `<ul><li>Money you add to your wallet can only be spent in Tap Am. It can't be withdrawn or refunded.</li>
<li>Only winnings can be withdrawn. Minimum withdrawal: ₦10,000 for Lapo babies, ₦5,000 for Nepo babies.</li>
<li>We may ask you to confirm your identity before paying out, to protect you and stop fraud.</li></ul>`],
    ['Talking in games', `<p>Voice in games is for Nepo babies at Para para boy rank or higher who are in the top 5 of that game. Keep it clean: no hate, threats, harassment, sharing private info or adverts. Breaking these rules can get your mic or account removed.</p>`],
    ['Sponsors and ads', `<p>Sponsors fund prizes and show ads before and after games and in the lobby. You can close every ad. Sponsors never decide who wins.</p>`],
    ['The legal pages', `<p>The full rules are in our <a href="/terms">Terms of Use</a>, <a href="/privacy">Privacy Policy</a> and <a href="/disclaimer">Disclaimer</a>. If anything here and those pages disagree, those pages win.</p>`]
  ];
  return docLayout({ user, title: 'Rules', h1: 'Rules & policies', intro: 'The short version of how we keep Tap Am fair for everybody.',
    tabs: [['/rules', 'Rules'], ['/terms', 'Terms'], ['/privacy', 'Privacy'], ['/disclaimer', 'Disclaimer']], current: '/rules',
    cards: sections.map(([h, b], i) => card(`<h2>${esc(h)}</h2>${b}`, i)).join('') });
}

// ── Merch ────────────────────────────────────────────────────────────────────
const MERCH = [
  ['tee-classic', 'Tap Am classic tee', 'Black tee, neon-green logo on the chest.', ''],
  ['cap-nepo', 'Nepo baby cap', 'Gold embroidered cap for the paid crew.', 'tcard--gold'],
  ['tee-lapo', 'Lapo baby tee', 'Proud free player. Soft cotton.', 'tcard--orange'],
  ['hoodie-para', 'Para para boy hoodie', 'Only fit wear am if you reach the rank.', 'tcard--ink'],
  ['grip', 'Tap finger phone grip', 'Hold your phone steady while you tap.', 'tcard--mustard'],
  ['stickers', 'Sticker pack', 'Flags, VS badges and the logo.', '']
];
export function merchPage(user) {
  const items = MERCH.map(([id, name, desc, color]) => `<article class="tcard merch-item ${color}">
  <div class="merch-art" aria-hidden="true"><span class="code">${esc(name.split(' ').slice(0, 2).join(' '))}</span></div>
  <h2>${esc(name)}</h2><p>${esc(desc)}</p><span class="tag">Coming soon</span>
  <button type="button" class="btn btn--ghost merch-notify" data-item="${id}">Notify me</button>
</article>`).join('');
  const css = `.merch-grid{display:grid;gap:18px;padding:0 6px 6px}
.merch-item{padding:22px 22px 20px;display:flex;flex-direction:column;gap:8px}
.merch-item>*{position:relative}
.merch-art{height:120px;border-radius:10px;background:rgba(0,0,0,.22);display:grid;place-items:center;text-align:center;padding:10px}
.merch-art .code{font-size:34px}
.merch-item h2{margin:6px 0 0;font:800 26px/1 var(--display);text-transform:uppercase}
.merch-item p{margin:0;font-size:15px;line-height:1.5;color:rgba(255,255,255,.9)}
.merch-item .tag{align-self:flex-start}
.merch-item .btn{margin-top:6px;height:46px;font-size:18px}
.notify{position:fixed;inset:0;z-index:70;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.6)}
.notify form{width:100%;max-width:380px;padding:24px 22px}
.notify form>*{position:relative}
.notify h2{margin:0 0 6px;font:800 26px/1 var(--display);text-transform:uppercase}
.notify p{margin:0 0 14px;font-size:15px;color:rgba(255,255,255,.9)}
.notify .row{display:flex;gap:10px;margin-top:14px}
.notify .row .btn{flex:1;height:48px;font-size:18px}
@media (min-width:640px){.merch-grid{grid-template-columns:1fr 1fr}}
@media (min-width:960px){.merch-grid{grid-template-columns:1fr 1fr 1fr}}`;
  const script = `
(function(){
var modal=null;
function close(){if(modal){modal.remove();modal=null;}}
document.querySelectorAll('.merch-notify').forEach(function(b){b.addEventListener('click',function(){
  close();var item=b.getAttribute('data-item'),name=b.parentNode.querySelector('h2').textContent;
  modal=document.createElement('div');modal.className='notify';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
  modal.innerHTML='<form class="tcard" novalidate><h2></h2><p>Drop your email and we go tell you once e land.</p><label class="ta-label" for="nm-email">Email</label><input class="ta-input" id="nm-email" type="email" autocomplete="email" maxlength="254" required><p class="ta-error" aria-live="polite"></p><div class="row"><button type="button" class="btn btn--ghost" data-x>Cancel</button><button class="btn">Notify me</button></div></form>';
  modal.querySelector('h2').textContent=name;document.body.appendChild(modal);
  var f=modal.querySelector('form'),inp=f.querySelector('input'),er=f.querySelector('.ta-error');inp.focus();
  modal.addEventListener('click',function(e){if(e.target===modal||e.target.hasAttribute('data-x'))close();});
  f.addEventListener('submit',async function(e){e.preventDefault();er.textContent='';var v=inp.value.trim();
    if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(v)){er.textContent='That email no look correct.';inp.focus();return;}
    var btn=f.querySelector('.btn:not([data-x])');btn.disabled=true;
    try{var r=await fetch('/api/merch/notify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:v,item:item})});var j=await r.json();
      if(r.ok){f.innerHTML='<h2>You don enter!</h2><p>We go email you when the '+name.replace(/</g,'&lt;')+' drop.</p><div class="row"><button type="button" class="btn" data-x>Nice</button></div>';}
      else{er.textContent=j.error||'Something no work. Try again.';btn.disabled=false;}}
    catch(_){er.textContent='Network wahala. Check your connection.';btn.disabled=false;}});
})});
document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});
})();`;
  return docLayout({ user, title: 'Merch', h1: 'Merch', intro: 'Wear the tap. The first drop is coming — tap “Notify me” on anything you want and we’ll email you when it’s ready.',
    cards: `<div class="merch-grid">${items}</div>`, css, script });
}

// ── FAQ ──────────────────────────────────────────────────────────────────────
export function faqPage(user) {
  const qs = [
    ['Is Tap Am free?', 'Yes. Lapo babies (free accounts) can play free pools and some paid pools. Nepo babies pay ₦13,000 a month or ₦120,000 a year for extra features.'],
    ['How do I win money?', 'Win a paid or sponsored pool by having the highest taps when it closes. The prize goes into your Winnings balance.'],
    ['When can I withdraw?', 'Once your winnings reach ₦10,000 (Lapo babies) or ₦5,000 (Nepo babies). Money you added to your wallet yourself can only be spent in Tap Am — it can’t be withdrawn.'],
    ['What happens if two people tie?', 'Every pool shows its tie rule before you join: either the player who reached the score first wins, or the tied players split the prize.'],
    ['Can I use an auto-clicker?', 'No. Taps are checked on our servers and cheaters lose their taps, winnings and possibly their account.'],
    ['Do I need to download anything?', 'No. Tap Am works in your browser. To get it on your home screen like an app, open the menu and tap “Install app” (on iPhone: Share → Add to Home Screen).'],
    ['Will I stay logged in?', 'Yes, until you log out — even if you close the app. If you don’t open Tap Am for 30 days, we log you out to keep your account safe.'],
    ['What if my internet cuts during a game?', 'We show you a message as soon as your connection drops. Taps made while offline can’t reach our servers, so they don’t count. Reconnect quickly and keep tapping.'],
    ['How old do I need to be?', 'You must be 18 or older.'],
    ['How do I sponsor a pool or advertise?', 'Sponsors get their own account to fund prizes, choose who can play (Lapo or Nepo babies) and add ads. Message us through the Suggest page and we’ll set you up.']
  ];
  const css = `.faq details{border-top:1px solid rgba(255,255,255,.2)}.faq details:first-of-type{border-top:0}
.faq summary{list-style:none;cursor:pointer;padding:14px 32px 14px 0;position:relative;font:800 22px/1.15 var(--display);color:#fff}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";position:absolute;right:2px;top:10px;font:800 28px/1 var(--display)}
.faq details[open] summary::after{content:"–"}
.faq details p{margin:0 0 14px}`;
  const inner = `<div class="faq">${qs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>`;
  return docLayout({ user, title: 'FAQ', h1: 'FAQ', intro: 'Questions wey people dey ask.', cards: card(inner, 0), css,
    foot: `<div class="doc-foot"><a class="btn btn--ghost" href="/suggest">Ask us something else</a></div>` });
}

// ── About ────────────────────────────────────────────────────────────────────
export function aboutPage(user) {
  const cards = card(`<h2>Who we be</h2><p>Tap Am is a live tapping game made in Lagos for the people. One simple thing — tap fast — turned into pools, prizes, ranks and plenty noise.</p>
<p>Tap Am is built and run by <a href="${FERRN_URL}" target="_blank" rel="noopener">Ferrn Agency</a>.</p>`, 0)
    + card(`<h2>Sponsor a pool</h2><p>Brands can fund a prize pool, choose who can play, and show their ads before and after the game and in the lobby. Players know exactly who made the moment happen.</p><p><a href="/suggest">Message us</a> to get a sponsor account.</p>`, 2)
    + card(`<h2>Talk to us</h2><p>Ideas, problems, partnerships — send them through the <a href="/suggest">Suggest page</a>. We read everything.</p>`, 1);
  return docLayout({ user, title: 'About', h1: 'About Tap Am', intro: 'Tap ammm jor, make you chop ammm.', cards });
}

// ── Offline page (cached by the service worker) ──────────────────────────────
export function offlinePage() {
  const css = `.center{min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:20px}
.err{width:100%;max-width:420px;padding:30px 24px 26px;text-align:center}
.err>*{position:relative}
.err .segbox{margin:6px auto 14px}
.err .seg{font-size:64px}
.err h1{margin:0 0 8px;font:800 40px/.95 var(--display);text-transform:uppercase}
.err p{margin:0 0 18px;font-size:16px;line-height:1.5;color:rgba(255,255,255,.92)}
.err .btns{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}`;
  const body = `<main class="center"><section class="tcard err tcard--orange">
<a class="ta-logo" href="/" style="width:110px;margin:0 auto 14px" aria-label="Tap Am home"><img src="/assets/logo-tapam.svg" width="179" height="48" alt="tap am"></a>
<div class="segbox"><span class="seg" data-seg="--:--" data-label="No connection"></span></div>
<h1>Your internet don cut</h1><p>Check your data or Wi-Fi. This page go try again by itself once you come back online.</p>
<div class="btns"><button type="button" class="btn" id="retry">Try again</button></div></section></main>`;
  const script = `document.getElementById('retry').addEventListener('click',function(){location.reload()});window.addEventListener('online',function(){location.reload()});`;
  return themeShell({ title: 'You are offline', body, css, script });
}

// ── Error pages ──────────────────────────────────────────────────────────────
export function errorPage(status, { user = null, ref = '' } = {}) {
  const info = {
    400: ['400', 'That request no make sense', 'Something for that link or form no correct. Go back and try again.', 'tcard--mustard'],
    404: ['404', 'This page don waka', 'We no fit find the page you dey find. Maybe the link old or the pool don close.', 'tcard--gold'],
    500: ['500', 'Wahala dey o', 'Something break for our side. No be your fault. Try again in a moment.', 'tcard--orange']
  }[status] || ['500', 'Wahala dey o', 'Something break for our side. Try again in a moment.', 'tcard--orange'];
  const css = `.center{min-height:calc(100vh - 70px);min-height:calc(100dvh - 70px);display:grid;place-items:center;padding:10px 18px 30px}
.err{width:100%;max-width:440px;padding:30px 24px 26px;text-align:center}
.err>*{position:relative}
.err .segbox{margin:0 auto 16px}
.err .seg{font-size:78px}
.err h1{margin:0 0 8px;font:800 42px/.95 var(--display);text-transform:uppercase}
.err p{margin:0 0 18px;font-size:16px;line-height:1.5;color:rgba(255,255,255,.95)}
.err small{display:block;margin-top:14px;font-size:12px;color:rgba(255,255,255,.75)}
.err .btns{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}`;
  const body = `${topBar(user)}<main class="center"><section class="tcard err ${info[3]}">
<div class="segbox"><span class="seg" data-seg="${info[0]}" data-label="Error"></span></div>
<h1>${esc(info[1])}</h1><p>${esc(info[2])}</p>
<div class="btns">${status === 500 ? '<button type="button" class="btn" id="retry">Try again</button>' : ''}<a class="btn ${status === 500 ? 'btn--ghost' : ''}" href="/">Go home</a>${status === 404 ? '<a class="btn btn--ghost" href="/how-to-play">How to play</a>' : ''}</div>
${ref ? `<small>Reference: ${esc(ref)}</small>` : ''}</section></main>${menuSheet(user)}`;
  const script = status === 500 ? `document.getElementById('retry').addEventListener('click',function(){location.reload()});` : '';
  return themeShell({ title: info[1], body, css, script });
}
