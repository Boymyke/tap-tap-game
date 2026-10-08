// Terms, Privacy Policy and Disclaimer pages.
// NOTE: these are plain-language drafts written for the current build of the game.
// Have them reviewed by a Nigerian lawyer before real-money features or prizes go live.
import { themeShell, logoBlock, poweredBy } from './theme.js';
import { MIN_AGE } from '../auth-rules.js';

export const LEGAL_UPDATED = '8 October 2026';

const contact = `<a href="/suggest">Suggest page</a>`;

const DOCS = {
  terms: {
    nav: 'Terms',
    title: 'Terms of Use',
    description: 'The rules for playing Tap Am.',
    lede: `Short version: be ${MIN_AGE}+, play fair, no bots, and respect other players. Break the rules and we fit reset your score or close your account.`,
    sections: [
      ['Who we are', `<p>Tap Am (“the game”, “we”, “us”) is a competitive tapping game operated by <strong>Ferrn Agency</strong>. These Terms apply whenever you create an account, play a game or use any part of Tap Am. If you no agree with them, please don’t use the game.</p>`],
      ['Who can play', `<p>You must be at least <strong>${MIN_AGE} years old</strong> to create an account or play. When you sign up you confirm your date of birth is true. If we learn an account belongs to someone under ${MIN_AGE}, we will close it and delete its data.</p>`],
      ['Your account', `<ul>
<li>You need a real email address that you own. We confirm it with a 6-digit code before your account is created.</li>
<li>One account per person. Don’t share, sell or transfer your account.</li>
<li>Keep your password secret. Anything done with your login is treated as done by you.</li>
<li>Your nickname is public on leaderboards. No impersonation, hate, insults or offensive names. We may change or remove a name that breaks this rule.</li>
<li>If you think someone is using your account, tell us quickly through the ${contact}.</li></ul>`],
      ['Your data', `<p>To run Tap Am we store the details you give us when you sign up — your <strong>nickname, email address and date of birth</strong> — plus your password (scrambled with a one-way hash, so nobody can read it), your game activity and basic security records such as IP addresses. We use your email to send sign-up and password-reset codes and important account messages. The full details are in our <a href="/privacy">Privacy Policy</a>.</p>`],
      ['How games work', `<ul>
<li>Each game has a start and end time. Taps only count while a game is live.</li>
<li>Your taps are sent to our servers in batches and checked there. <strong>The score recorded on our server is the official score</strong>, even if your screen showed something different.</li>
<li>Leaderboards update live but can lag a few seconds. Final results are settled after the game closes.</li>
<li>We may pause, extend, cancel or re-run a game if something goes wrong (for example an outage or a bug).</li></ul>`],
      ['Fair play', `<p>Tap Am is about real people tapping with their own fingers. You must not:</p>
<ul>
<li>use auto-clickers, bots, scripts, macros or any tool that taps for you;</li>
<li>modify the app, tamper with requests or send fake tap data;</li>
<li>run multiple accounts, or team up to manipulate results;</li>
<li>exploit bugs instead of reporting them.</li></ul>
<p>Our systems can reject suspicious taps automatically. If we believe you cheated, we may remove taps, reset scores, disqualify you from a game, or suspend or close your account.</p>`],
      ['Tiers, boosters and virtual items', `<p>Accounts start on the standard <strong>Civil Servant</strong> tier. <strong>Odogwu</strong> is a premium tier with extra access and perks. Boosters and other in-game items are virtual: they have no cash value, cannot be exchanged for money, cannot be transferred, and may be changed or retired as the game evolves.</p>`],
      ['Payments and prizes', `<p>Right now Tap Am does <strong>not</strong> accept real-money deposits, process withdrawals or pay cash prizes. If we introduce paid features or prizes later, we will publish extra rules and ask you to accept them before you pay or take part.</p>`],
      ['Ads and sponsors', `<p>We show adverts and sponsored placements to keep Tap Am running. Advertisers and sponsors do not control or influence game results. Links to other websites are provided for convenience and we are not responsible for their content.</p>`],
      ['Your feedback', `<p>If you send us ideas or suggestions, you allow us to use them to improve Tap Am without owing you anything for them.</p>`],
      ['Availability', `<p>We work hard to keep Tap Am running smoothly, but the game is provided “as is” and “as available”. Network problems, device issues or maintenance can interrupt play, and we can change or remove features at any time.</p>`],
      ['Our liability', `<p>To the extent allowed by Nigerian law, we are not liable for indirect or consequential losses, lost opportunities or lost in-game progress. Nothing in these Terms limits any liability that cannot legally be limited.</p>`],
      ['Ending your account', `<p>You can stop playing at any time and ask us to delete your account through the ${contact}. We may suspend or close accounts that break these Terms or the law.</p>`],
      ['Changes to these Terms', `<p>We may update these Terms as Tap Am grows. We will change the date at the top of this page, and for important changes we will ask you to accept the new Terms in the game.</p>`],
      ['Law', `<p>These Terms are governed by the laws of the Federal Republic of Nigeria. Any dispute will be handled by the courts of Lagos State, unless the law says otherwise.</p>`],
      ['Contact', `<p>Questions? Reach us through the ${contact}.</p>`]
    ]
  },

  privacy: {
    nav: 'Privacy',
    title: 'Privacy Policy',
    description: 'What data Tap Am collects and how it is used.',
    lede: `We store your nickname, email, date of birth and game activity so Tap Am can work. We use your email for sign-up and password-reset codes and account messages. We don’t sell your data.`,
    sections: [
      ['Who is responsible', `<p>Tap Am is operated by <strong>Ferrn Agency</strong>, which decides how your personal data is used for the game. We handle personal data in line with the <strong>Nigeria Data Protection Act 2023</strong>.</p>`],
      ['What we collect', `<ul>
<li><strong>Account details:</strong> your nickname, your <strong>email address</strong>, your date of birth, your password (stored only as a salted, one-way hash, so we can’t read it), when you confirmed your email and when you accepted our Terms.</li>
<li><strong>Email codes:</strong> the 6-digit codes we email you for sign-up and password resets. We keep them only as one-way hashes, they expire after 10 minutes, and we delete the records within an hour. While you’re confirming a new sign-up, we hold your details (with the password already hashed) until the code is confirmed.</li>
<li><strong>Gameplay data:</strong> games you join, your taps and scores, booster inventory and use, tier, and timestamps.</li>
<li><strong>Login session:</strong> a single cookie (<code>nakam_session</code>) that keeps you signed in for up to 14 days. It is strictly necessary and is not used for advertising.</li>
<li><strong>Security records:</strong> your IP address and counts of sign-up, login and code attempts, used to block spam and password guessing. These counters reset automatically (within an hour).</li>
<li><strong>Technical data:</strong> browser and device information and request logs, processed by our hosting provider for security and to keep the service running.</li>
<li><strong>Messages you send us</strong> through the Suggest page, including any name or email you add.</li></ul>`],
      ['Why we use it', `<ul>
<li>To create your account, run games, count taps and show leaderboards (to provide the service you signed up for).</li>
<li>To email you sign-up and password-reset codes and important messages about your account. We don’t send marketing emails unless you agree to them.</li>
<li>To check you are ${MIN_AGE}+ (legal obligation and protecting minors).</li>
<li>To detect cheating, abuse and security threats (legitimate interests).</li>
<li>To read and act on your feedback (legitimate interests).</li></ul>
<p>We do not use your data for automated decisions that have legal effects on you, apart from automatic rejection of suspicious taps during games.</p>`],
      ['Who can see it', `<ul>
<li><strong>Other players</strong> see your nickname, tier and scores on leaderboards. They never see your email or date of birth.</li>
<li><strong>Service providers</strong> that host and run Tap Am for us process data on our instructions: Cloudflare (hosting and databases) and our email delivery provider, which receives your email address and the code so it can deliver the message.</li>
<li><strong>Authorities</strong>, if the law requires us to share it.</li></ul>
<p>Advertisers do not receive your personal data from us. We don’t sell your data.</p>`],
      ['Where it is stored', `<p>Tap Am runs on Cloudflare’s global network, so your data may be processed outside Nigeria. Where that happens, we rely on the safeguards required by the Nigeria Data Protection Act.</p>`],
      ['How long we keep it', `<p>We keep your account data while your account is active. When you ask us to delete your account, we delete or anonymise your personal data within a reasonable time, except anything we must keep to meet legal obligations or to deal with fraud or cheating. Login sessions expire after 14 days.</p>`],
      ['Your rights', `<p>Under Nigerian law you can ask to:</p>
<ul>
<li>see the personal data we hold about you;</li>
<li>correct data that is wrong;</li>
<li>delete your data or your account;</li>
<li>restrict or object to how we use it;</li>
<li>get a copy of your data in a portable format;</li>
<li>withdraw consent where we rely on it.</li></ul>
<p>Send your request through the ${contact}. If you are not happy with our answer, you can complain to the <strong>Nigeria Data Protection Commission (NDPC)</strong>.</p>`],
      ['Children', `<p>Tap Am is not for anyone under ${MIN_AGE}. We do not knowingly collect data from minors, and we delete it if we find out.</p>`],
      ['Security', `<p>Passwords are hashed, connections use HTTPS, and the login cookie is HttpOnly and Secure. No system is perfect, so please use a strong password you don’t use anywhere else.</p>`],
      ['Changes', `<p>If we change this policy we will update the date at the top. If the change is significant we will tell you in the game.</p>`],
      ['Contact', `<p>Privacy questions or requests: use the ${contact}.</p>`]
    ]
  },

  disclaimer: {
    nav: 'Disclaimer',
    title: 'Disclaimer',
    description: 'Important things to know before you play Tap Am.',
    lede: `Tap Am is for fun. “Make you chop am” na vibes, not a promise of money.`,
    sections: [
      ['Entertainment only', `<p>Tap Am is a casual, competitive game made for entertainment. Our slogans, Pidgin jokes and taglines are part of the fun and are not promises of income, food, prizes or anything else.</p>`],
      ['Not betting or gambling', `<p>Tap Am is not a betting or gambling platform and you cannot stake money on games. Winning depends on your own tapping speed and stamina. We make no promise that you will win anything.</p>`],
      ['Scores and connectivity', `<p>Only taps that reach our servers while a game is live are counted. Slow or unstable internet, low battery, device performance or browser settings can affect how many of your taps are recorded. We are not responsible for taps lost to these issues.</p>`],
      ['Look after yourself', `<p>Fast, repeated tapping can strain your fingers, hands and wrists. Take breaks, stop if you feel pain or discomfort, and don’t play while driving or doing anything that needs your full attention.</p>`],
      ['Ads and other websites', `<p>Adverts and sponsored content on Tap Am come from third parties. Showing an advert is not an endorsement, and we are not responsible for products, services or websites we link to.</p>`],
      ['No official affiliation', `<p>Tap Am is an independent game by Ferrn Agency. It is not affiliated with, or endorsed by, any government body or any brand mentioned in the game unless we clearly say so.</p>`],
      ['Information on Tap Am', `<p>We try to keep game information, schedules and leaderboards accurate, but everything is provided “as is” and can change without notice.</p>`],
      ['Contact', `<p>Something here no clear? Reach us through the ${contact}.</p>`]
    ]
  }
};

export const LEGAL_PATHS = Object.keys(DOCS);

export function legalPage(key) {
  const doc = DOCS[key];
  if (!doc) return null;
  const tabs = LEGAL_PATHS.map(k => `<a class="ta-tab" href="/${k}" aria-current="${k === key ? 'page' : 'false'}" aria-selected="${k === key}">${DOCS[k].nav}</a>`).join('');
  const sections = doc.sections.map(([h, html]) => `<h2>${h}</h2>${html}`).join('');
  const body = `<main class="ta-page ta-page--doc">
${logoBlock({ tagline: false })}
<article class="ta-doc">
  <nav class="ta-tabs" aria-label="Legal pages">${tabs}</nav>
  <div class="ta-doc-body">
    <h1>${doc.title}</h1>
    <p class="ta-updated">Last updated ${LEGAL_UPDATED}</p>
    <p class="ta-lede">${doc.lede}</p>
    ${sections}
    <div class="ta-doc-foot"><a href="/signup">← Back to sign up</a><a href="/login">Login</a></div>
  </div>
</article>
${poweredBy()}
</main>`;
  return themeShell({ title: doc.title, description: doc.description, body });
}
