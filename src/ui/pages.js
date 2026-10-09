// Info pages (how to play, rules hub, merch, FAQ, about), offline page and error pages.
import { themeShell, esc, topBar, menuSheet, FERRN_URL, LOGO_IMG } from './theme.js';
import { STICKERS, HAND_MARK, rankAvatar, badgeSvg } from './avatar.js';

export function docLayout({ user, title, h1, intro, tabs = null, current = '', cards, foot = '', script = '', css = '', description }) {
  const tabNav = tabs ? `<nav class="doc-tabs" aria-label="${esc(h1)} sections">${tabs.map(([href, label]) => `<a href="${href}" ${href === current ? 'aria-current="page"' : ''}>${esc(label)}</a>`).join('')}</nav>` : '';
  const body = `${topBar(user, { back: true })}
<main class="doc" id="main">
  <div class="doc-head"><h1>${esc(h1)}</h1>${intro ? `<p>${intro}</p>` : ''}</div>
  ${tabNav}
  ${cards}
  ${foot}
</main>
${menuSheet(user)}`;
  return themeShell({ title, body, script, css, description });
}

const ARTS = [() => STICKERS.sparkle(), () => STICKERS.bolt(), () => STICKERS.coin(), () => STICKERS.fire(), () => STICKERS.sparkle('#FF4FA3')];
const card = (inner, i = 0) => `<section class="doc-card"><div class="doc-art" aria-hidden="true">${ARTS[i % ARTS.length]()}</div>${inner}</section>`;
export const LEGAL_TABS = [['/rules', 'Game rules'], ['/fair-play', 'Fair play'], ['/prizes', 'Prizes & withdrawals'], ['/account-rules', 'Suspensions'], ['/terms', 'Terms'], ['/privacy', 'Privacy'], ['/disclaimer', 'Disclaimer']];

// ── How to play ──────────────────────────────────────────────────────────────
export function howToPlayPage(user) {
  const sections = [
    ['Pick your pool', `<p>A pool na one tapping battle with a start time and an end time. Join from your home page, the Pools tab, or with a pool code wey your person send you.</p>
<ul><li><strong>Free pools</strong> — no entry fee. Just tap.</li>
<li><strong>Paid pools</strong> — everybody pays the same entry fee and the fees make up the prize.</li>
<li><strong>Sponsored pools</strong> — a brand puts up the prize and you join free. Some are only for certain tiers.</li>
<li><strong>VS pools</strong> — pick a side. Each side has its own pot, and the top tappers on each side share it.</li>
<li><strong>Private pools</strong> — locked with a password Tap Am makes. Share it with who you want.</li></ul>`],
    ['Wait for the whistle', `<p>Before a pool starts you sit in the lobby with a countdown. The tap card stays locked until the exact start time. Taps before the start or after the end no count.</p>`],
    ['Tap like your life depend on am', `<p>The tap card is one big box. Tap anywhere inside it, as fast as you fit. Fast taps in a row build a <strong>combo</strong> — your phone vibrates and the screen goes mad on big combos and milestones. The live board above the card shows who dey lead and where you stand.</p>
<p>Turn your phone sideways and the tap card moves to the right, with the board on the left. Mute the sound any time.</p>`],
    ['Fingers and speed', `<p><strong>Lapo babies</strong> tap with one finger at a time, <strong>Mapo babies</strong> with three, <strong>Nepo babies</strong> with as many as they like. Every tier also has a top speed our server counts — taps faster than that are dropped, so bots and scripts can’t win.</p>`],
    ['Boosters', `<p>Boosters multiply every tap for some seconds (like 2× for 20 seconds). Use <strong>as many as you like in a game</strong> — they run one after the other, and a stronger one jumps the queue. A few big Nepo boosters are one per game. Mapo and Nepo babies get live tips like “use this one to enter the top 10”.</p>`],
    ['Who wins', `<p>The highest tappers when the pool closes win. Every pool shows how the prize is shared before you join — winner takes all, or up to 100 winners. If players tie, the pool’s rule decides: the player who reached the score first wins, or tied players split the prize.</p>`],
    ['Ranks and badges', `<p>There are 100 ranks in 20 tiers, each with its own character. You climb by tapping, playing and winning, and some ranks unlock boosters, skins, sounds and live voice. The top tapper of every day, week, month and year gets a badge forever.</p>`],
    ['Lapo, Mapo, Nepo', `<p><strong>Lapo babies</strong> play free. <strong>Mapo babies</strong> pay a small monthly fee for 3 fingers, 3 pools at once, creating pools, the booster calculator and tap sounds. <strong>Nepo babies</strong> get everything: unlimited fingers, 10 pools at once, every booster, 10 app themes, backgrounds, gifting and live voice. <a href="/plans">Compare the plans</a>.</p>`],
    ['Wallet and winnings', `<p>Your account has two balances:</p>
<ul><li><strong>Wallet</strong> — money you add to pay entry fees, boosters, skins and plans. Money you add <strong>can’t be withdrawn</strong>.</li>
<li><strong>Winnings</strong> — money you win. Withdraw to your bank once a day, from the minimum for your tier.</li></ul>
<p>Paid pools, adding money and withdrawals are for people aged 18 and over — we ask you to confirm once.</p>`],
    ['Share and get boosters', `<p>Share your invite link or QR card. For every 10 people who sign up with it, we gift you a booster.</p>`]
  ];
  const cards = sections.map(([h, b], i) => card(`<h2>${i + 1}. ${esc(h)}</h2>${b}`, i)).join('');
  return docLayout({ user, title: 'How to play', h1: 'How to play', intro: 'Everything you need to know before you start tapping.', cards,
    foot: `<div class="doc-foot"><a class="btn btn--green btn--shine" href="${user ? '/dashboard' : '/signup'}">${user ? 'Go play' : 'Oya, create my account'}</a><a class="btn btn--white" href="/rules">Read the rules</a></div>` });
}

// ── Merch ────────────────────────────────────────────────────────────────────
const MERCH = [
  ['tee-classic', 'Tap Am classic tee', 'Black tee, neon-green logo on the chest.', '#150B33'],
  ['cap-nepo', 'Nepo baby cap', 'Gold embroidered cap for the premium crew.', '#FFB800'],
  ['tee-lapo', 'Lapo baby tee', 'Proud free player. Soft cotton.', '#2E8BFF'],
  ['hoodie-para', 'Para para boy hoodie', 'Only wear am if you reach the rank.', '#FF4FA3'],
  ['grip', 'Tap finger phone grip', 'Hold your phone steady while you tap.', '#21D4C8'],
  ['stickers', 'Sticker pack', 'The hand, the logo and the rank characters.', '#FF8A2A']
];
export function merchPage(user) {
  const items = MERCH.map(([id, name, desc, color], i) => `<article class="doc-card merch-item">
  <div class="merch-art" style="background:${color}" aria-hidden="true">${i === 3 ? rankAvatar(56, { size: 92 }) : i === 5 ? `<div style="width:90px">${HAND_MARK}</div>` : `<span class="code">${esc(name.split(' ').slice(0, 2).join(' '))}</span>`}</div>
  <h2>${esc(name)}</h2><p>${esc(desc)}</p><span class="doc-updated" style="align-self:flex-start;margin:0">Coming soon</span>
  <button type="button" class="btn btn--green merch-notify" data-item="${id}">Notify me</button>
</article>`).join('');
  const css = `.merch-grid{display:grid;gap:16px;padding:0 4px 6px}
.merch-item{display:flex;flex-direction:column;gap:8px;margin:0}
.merch-art{height:130px;border-radius:18px;display:grid;place-items:center;text-align:center;padding:10px;border:3px solid #fff;box-shadow:0 5px 0 rgba(0,0,0,.2)}
.merch-art .code{font-size:30px}
.merch-item h2{margin:6px 0 0;font:900 22px/1.05 var(--display)}
.merch-item p{margin:0;font-size:15px;line-height:1.5}
.merch-item .btn{margin-top:6px}
@media (min-width:640px){.merch-grid{grid-template-columns:1fr 1fr}}
@media (min-width:960px){.merch-grid{grid-template-columns:1fr 1fr 1fr}}`;
  const script = `
(function(){
document.querySelectorAll('.merch-notify').forEach(function(b){b.addEventListener('click',function(){
  var item=b.getAttribute('data-item'),name=b.parentNode.querySelector('h2').textContent;
  var d=TA.dialog('<h3></h3><p>Drop your email and we go tell you once e land.</p><form novalidate><label class="ta-label" for="nm-email">Email</label><input class="ta-input" id="nm-email" type="email" autocomplete="email" maxlength="254" required><p class="ta-error" aria-live="polite"></p><div class="actions"><button type="button" class="btn btn--soft" data-x>Cancel</button><button class="btn btn--green">Notify me</button></div></form>',function(e,close){if(e&&e.target.closest('[data-x]'))close();});
  d.querySelector('h3').textContent=name;var f=d.querySelector('form'),inp=f.querySelector('input'),er=f.querySelector('.ta-error');inp.focus();
  f.addEventListener('submit',function(e){e.preventDefault();er.textContent='';var v=inp.value.trim();
    if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(v)){er.textContent='That email no look correct.';inp.focus();return;}
    var btn=f.querySelector('.btn--green');btn.classList.add('is-loading');
    TA.api('/api/merch/notify',{email:v,item:item}).then(function(j){btn.classList.remove('is-loading');if(j._ok){d.querySelector('.dlg-in').innerHTML='<h3>You don enter!</h3><p>We go email you when e drop.</p><div class="actions"><button type="button" class="btn btn--green" data-x>Nice</button></div>';d.querySelector('[data-x]').addEventListener('click',function(){d.remove();});}else er.textContent=j.error||'Something no work. Try again.';});});
})});
})();`;
  return docLayout({ user, title: 'Merch', h1: 'Merch', intro: 'Wear the tap. The first drop is coming — tap “Notify me” on anything you want and we’ll email you when it’s ready.',
    cards: `<div class="merch-grid">${items}</div>`, css, script });
}

// ── FAQ ──────────────────────────────────────────────────────────────────────
export function faqPage(user) {
  const qs = [
    ['Is Tap Am free?', 'Yes. Lapo babies play free pools and can join paid pools. Mapo and Nepo babies pay monthly or yearly for extra features — see the plans page.'],
    ['How do I win money?', 'Finish in a prize place in a paid or sponsored pool. The prize goes into your Winnings balance.'],
    ['When can I withdraw?', 'Once your winnings reach the minimum for your tier. You can withdraw once a day. Money you added to your wallet yourself can only be spent in Tap Am.'],
    ['How old do I need to be?', 'Anybody can make an account and play free pools. Paid pools, adding money and withdrawals are only for people aged 18 and over — we ask you to confirm once before you use money.'],
    ['What happens if two people tie?', 'Every pool shows its tie rule before you join: either the player who reached the score first wins, or the tied players split the prize.'],
    ['How many boosters can I use?', 'As many as you like in a game — they run one after the other. A few big Nepo boosters are limited to one per game.'],
    ['Why do some of my taps not count?', 'Each tier has a top speed our server counts (and Lapo babies tap with one finger at a time). Taps faster than that are dropped so bots can’t win.'],
    ['Can I use an auto-clicker?', 'No. Taps are checked on our servers and cheaters lose their taps, winnings and possibly their account. See the Fair Play Policy.'],
    ['Do I need to download anything?', 'No. Tap Am works in your browser. To put it on your home screen like an app, open the menu and tap “Install app” (on iPhone: Share → Add to Home Screen).'],
    ['Will I stay logged in?', 'Yes, until you log out — even if you close the app. If you don’t open Tap Am for 30 days, we log you out to keep your account safe.'],
    ['What if my internet cuts during a game?', 'The tap card shows it straight away. Taps made while offline can’t reach our servers, so they don’t count. Reconnect quickly and keep tapping.'],
    ['How do I sponsor a pool or advertise?', 'Sign up as a sponsor at /signup?type=sponsor. You can fund prize pools, choose who can play, and run picture or YouTube ads around games.']
  ];
  const css = `.faq details{border-top:1px solid var(--line)}.faq details:first-of-type{border-top:0}
.faq summary{list-style:none;cursor:pointer;padding:14px 34px 14px 0;position:relative;font:800 19px/1.2 var(--display);color:var(--ink)}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";position:absolute;right:2px;top:9px;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--ink);color:#fff;font:900 18px/1 var(--display)}
.faq details[open] summary::after{content:"–";background:var(--green);color:var(--ink)}
.faq details p{margin:0 0 14px}`;
  const inner = `<div class="faq">${qs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>`;
  return docLayout({ user, title: 'FAQ', h1: 'FAQ', intro: 'Questions wey people dey ask.', cards: card(inner, 0), css,
    foot: `<div class="doc-foot"><a class="btn btn--white" href="/suggest">Ask us something else</a></div>` });
}

// ── About ────────────────────────────────────────────────────────────────────
export function aboutPage(user) {
  const cards = card(`<h2>Who we be</h2><p>Tap Am is a live tapping game made in Lagos for the people. One simple thing — tap fast — turned into pools, prizes, ranks and plenty noise.</p>
<p>Tap Am is built and run by <a href="${FERRN_URL}" target="_blank" rel="noopener">Ferrn Agency</a>.</p>`, 0)
    + card(`<h2>Sponsor a pool</h2><p>Brands can fund a prize pool, choose who can play, and show their ads when players open a game, in the lobby and before results. Players know exactly who made the moment happen.</p><p><a href="/signup?type=sponsor">Create a sponsor account</a>.</p>`, 2)
    + card(`<h2>Talk to us</h2><p>Ideas, problems, partnerships — send them through the <a href="/suggest">Suggest page</a>. We read everything.</p>`, 1);
  return docLayout({ user, title: 'About', h1: 'About Tap Am', intro: 'Tap ammm jor, make you chop ammm.', cards });
}

// ── Offline page (cached by the service worker) ──────────────────────────────
export function offlinePage() {
  const css = `.center{min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:20px}
.err{width:100%;max-width:420px;padding:28px 22px 24px;text-align:center;border-radius:28px;background:#fff;color:var(--ink);box-shadow:var(--sh-lg)}
.err .art{width:120px;margin:-70px auto 6px}
.err h1{margin:0 0 8px;font:900 34px/1 var(--display)}
.err p{margin:0 0 18px;font-size:16px;line-height:1.5;color:var(--ink-soft)}`;
  const body = `<main class="center"><section class="err"><div class="art">${HAND_MARK}</div>
<h1>Your internet don cut</h1><p>Check your data or Wi-Fi. This page go try again by itself once you come back online.</p>
<button type="button" class="btn btn--green btn--block" id="retry">Try again</button></section></main>`;
  const script = `document.getElementById('retry').addEventListener('click',function(){location.reload()});window.addEventListener('online',function(){location.reload()});`;
  return themeShell({ title: 'You are offline', body, css, script });
}

// ── Error pages ──────────────────────────────────────────────────────────────
export function errorPage(status, { user = null, ref = '' } = {}) {
  const info = {
    400: ['400', 'That request no make sense', 'Something for that link or form no correct. Go back and try again.'],
    404: ['404', 'This page don waka', 'We no fit find the page you dey find. Maybe the link old or the pool don close.'],
    500: ['500', 'Wahala dey o', 'Something break for our side. No be your fault. Try again in a moment.']
  }[status] || ['500', 'Wahala dey o', 'Something break for our side. Try again in a moment.'];
  const css = `.center{min-height:calc(100vh - 70px);min-height:calc(100dvh - 70px);display:grid;place-items:center;padding:30px 18px}
.err{position:relative;width:100%;max-width:440px;padding:30px 22px 24px;text-align:center;border-radius:28px;background:#fff;color:var(--ink);box-shadow:var(--sh-lg)}
.err .num{margin:-70px auto 8px;display:inline-block;padding:6px 22px;border-radius:22px;background:var(--pink);color:#fff;border:4px solid #fff;box-shadow:0 6px 0 var(--pink-d);font:900 italic 64px/1 var(--display);text-shadow:var(--ts-big);transform:rotate(-4deg)}
.err h1{margin:0 0 8px;font:900 32px/1 var(--display)}
.err p{margin:0 0 18px;font-size:16px;line-height:1.5;color:var(--ink-soft)}
.err small{display:block;margin-top:14px;font-size:12px;color:var(--ink-soft)}
.err .btns{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}`;
  const home = user ? (user.role === 'ADMIN' ? '/admin' : user.role === 'SPONSOR' ? '/sponsor' : '/dashboard') : '/';
  const body = `${topBar(user)}<main class="center"><section class="err">
<div class="num">${info[0]}</div>
<h1>${esc(info[1])}</h1><p>${esc(info[2])}</p>
<div class="btns">${status === 500 ? '<button type="button" class="btn btn--green" id="retry">Try again</button>' : ''}<a class="btn ${status === 500 ? 'btn--soft' : 'btn--green'}" href="${home}">Go home</a>${status === 404 ? '<a class="btn btn--soft" href="/how-to-play">How to play</a>' : ''}</div>
${ref ? `<small>Reference: ${esc(ref)}</small>` : ''}</section></main>${menuSheet(user)}`;
  const script = status === 500 ? `document.getElementById('retry').addEventListener('click',function(){location.reload()});` : '';
  return themeShell({ title: info[1], body, css: css + '.btn--soft{background:var(--cloud);color:var(--ink);box-shadow:inset 0 0 0 2px var(--line)}', script });
}

export { badgeSvg };
