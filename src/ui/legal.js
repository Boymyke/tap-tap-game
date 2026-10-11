// Legal and policy pages: Game Rules, Fair Play, Prizes & Withdrawals, Account suspension rules,
// Terms, Privacy, Disclaimer and the consent notices. Plain-language drafts that describe what the
// app actually does today. Items marked `flag` need a Nigerian lawyer's review before real money
// goes live; they are shown to the super admin only (and listed in docs/LEGAL_REVIEW.md).
import { docLayout, LEGAL_TABS } from './pages.js';
import { esc } from './theme.js';

export const LEGAL_UPDATED = '9 October 2026';
const contact = `<a href="/suggest">Suggest page</a>`;
const FLAG = t => ({ flag: t });

const DOCS = {
  rules: {
    title: 'Game Rules', h1: 'Game rules', description: 'How Tap Am pools, scores, boosters and prizes work.',
    lede: 'Tap as fast as you can while a pool is live. The server counts every tap, and the highest tappers share the prize the pool shows before you join.',
    sections: [
      ['Pools', `<ul><li>Every pool has a start time, an end time, a prize (or none), an entry fee (or none), the number of winners, a tie rule and who can join (everybody, Lapo only, Mapo + Nepo, or Nepo only). All of this is shown on the pool before you join.</li>
<li><strong>Free pools</strong> cost nothing. <strong>Paid pools</strong> take the entry fee from your wallet when you join; every fee is added to the prize. <strong>Sponsored pools</strong> are funded by a sponsor and are free to join.</li>
<li><strong>Private pools</strong> need the password Tap Am generates for the creator.</li>
<li>Once created, a pool can’t be deleted by its creator. Only Tap Am can cancel a pool; when that happens every entry fee goes back to the players’ wallets and any starting prize goes back to whoever funded it.</li></ul>`],
      ['Taps and scores', `<ul><li>Taps only count while a pool is live, and only when they reach our server. Your app sends taps in small batches.</li>
<li>Each tier has a top tapping speed our server counts (Lapo, Mapo and Nepo; the numbers are on the <a href="/plans">plans page</a>). Taps above that speed are dropped. Lapo babies tap with one finger at a time, Mapo babies with three, Nepo babies with any number.</li>
<li>When a pool is set to count the same taps in many pools (Mapo up to 3, Nepo up to 10), one tap adds to every live pool you joined.</li>
<li><strong>The score on our server is the official score</strong>, even if your screen showed something different.</li>
<li>If daily or monthly tap limits are switched on, taps over the limit don’t count. They are currently off.</li></ul>`],
      ['Boosters', `<ul><li>A booster multiplies every tap you make for a number of seconds. You can use as many boosters as you own in a game: they run one after the other, and a stronger booster starts straight away while the rest of the weaker one waits.</li>
<li>Some boosters can only be used a set number of times per game (shown on the booster). A booster used before a pool starts begins when the pool starts.</li>
<li>Boosters are virtual items with no cash value. Used boosters are not refunded.</li></ul>`],
      ['Winning', `<ul><li>When a pool ends, players are ranked by score. Prize places (1 to 100) share the prize using the split shown on the pool.</li>
<li>If fewer people score than there are prize places, the places that exist share the whole prize in the same proportions.</li>
<li><strong>Ties</strong>: each pool says whether the player who reached the score first wins, or tied players share the prizes for the places they cover.</li>
<li><strong>VS pools</strong>: each side has its own pot (its players’ entry fees plus half of any starting prize). The top tappers on each side share their side’s pot. If one side has no scores, its half goes to the other side.</li>
<li>If nobody taps at all, entry fees are refunded and any starting prize goes back to whoever funded it.</li>
<li>Tap Am may keep a service fee on paid pools. If a pool has one, its percentage is shown on the pool before you join.</li>
<li>Prizes are paid into your Winnings within moments of the pool ending. See <a href="/prizes">Prizes &amp; Withdrawals</a>.</li></ul>`, FLAG('Paid entry + cash prize contests may be regulated as gaming or promotional competitions by Nigerian state regulators (e.g. LSLGA in Lagos; FSGRN reciprocity). Confirm the licence or permit needed before enabling real-money paid pools and sponsored prizes.')],
      ['Ranks and badges', `<p>Your rank goes up with lifetime taps, games played and wins. Top tappers of each day, week, month and year (Lagos time) get a badge when the period ends. Ranks, badges and leaderboards have no cash value.</p>`],
      ['Ads', `<p>Sponsors’ ads may pop up when you open a game, while you wait in the lobby, and when a game ends before your result. You can close each ad after 5 seconds. Ads never affect scores or results.</p>`],
      ['Live voice', `<p>Nepo babies at the required rank who are in the top 5 of a pool can talk; anyone in the pool can listen. Keep it clean: no hate, threats, harassment, private information or adverts. We don’t record voice.</p>`],
      ['Related rules', `<p>These rules work together with the <a href="/fair-play">Fair Play Policy</a>, <a href="/prizes">Prizes &amp; Withdrawals</a>, <a href="/account-rules">Account Suspension Rules</a> and our <a href="/terms">Terms</a>.</p>`]
    ]
  },
  'fair-play': {
    title: 'Fair Play & Anti-Cheating Policy', h1: 'Fair play', description: 'How Tap Am keeps games fair.',
    lede: 'Real fingers only. No bots, scripts, auto-clickers or tricks. We check every tap on our servers.',
    sections: [
      ['What is not allowed', `<ul><li>Auto-clickers, bots, scripts, macros, emulators set to tap for you, or any tool that taps instead of you.</li>
<li>Changing the app, editing requests, replaying or faking tap data, or calling our API directly.</li>
<li>Playing in many browser tabs or devices to get more taps than your tier allows.</li>
<li>More than one account per person, sharing accounts, or teaming up with others to fix results (including in VS pools).</li>
<li>Using referral links with fake or self-made accounts.</li>
<li>Exploiting bugs instead of reporting them.</li></ul>`],
      ['How we check', `<ul><li>Our server — not your phone — decides your score. It only accepts taps while a pool is live and caps the taps it counts per second for your tier.</li>
<li>Taps above your tier’s speed are dropped automatically. Repeated over-speed tapping is flagged for review.</li>
<li>Money, prizes, boosters, ranks and rewards are only ever changed by our server, and important admin actions are logged.</li>
<li>Login, sign-up, code and money actions are rate limited to stop guessing and spam.</li></ul>`],
      ['What happens if you cheat', `<ul><li>We may remove taps, reset your score, disqualify you from a pool and take back prizes won by cheating.</li>
<li>We may hold a withdrawal while we review flagged play.</li>
<li>Serious or repeated cheating leads to suspension or closing the account. See <a href="/account-rules">Account Suspension Rules</a>.</li></ul>`, FLAG('Confirm that withholding or reversing prizes after an anti-cheat review is enforceable under the Terms and Nigerian consumer law (FCCPA 2018).')],
      ['Report cheating', `<p>Seen something wrong? Tell us through the ${contact} with the pool name or code.</p>`]
    ]
  },
  prizes: {
    title: 'Prizes & Withdrawal Rules', h1: 'Prizes & withdrawals', description: 'How Tap Am prizes, wallets and withdrawals work.',
    lede: 'Money you add is for spending inside Tap Am. Money you win can be withdrawn to a Nigerian bank account, once a day.',
    sections: [
      ['Two balances', `<ul><li><strong>Wallet</strong>: money you add (through Paystack). You spend it on entry fees, boosters, skins and plans. <strong>Wallet money can’t be withdrawn or refunded</strong>, except when a pool is cancelled or nobody taps (entry fees go back to the wallet).</li>
<li><strong>Winnings</strong>: prizes you win. You can withdraw them, or spend them on entry fees and plans.</li></ul>`],
      ['Age', `<p>Adding money, joining paid pools, buying with money and withdrawing are only for people aged <strong>18 or older</strong>. We ask you to confirm this once before your first money action and record when you did.</p>`, FLAG('Self-confirmation of age is the only age check in place. Ask counsel whether KYC/age verification (e.g. BVN or ID) is required for paid entry, payouts and payment-provider rules.')],
      ['Withdrawals', `<ul><li>Minimum withdrawal depends on your tier: Lapo ₦10,000, Mapo ₦7,500, Nepo ₦5,000 (current settings).</li>
<li>You can make <strong>one withdrawal a day</strong> (Lagos time), and only one can be in progress at a time.</li>
<li>Withdrawals go to a Nigerian bank account in your name. We check every withdrawal; small withdrawals from established accounts with no fair-play flags may be paid automatically, others are paid after a manual check.</li>
<li>If a withdrawal is rejected or the bank transfer fails, the money goes back to your winnings and we tell you why where we can.</li>
<li>We may ask you to confirm your identity before paying, and hold payouts linked to fair-play reviews.</li></ul>`, FLAG('Check payout KYC obligations, tax treatment of prizes (including any withholding) and the right to hold payouts pending investigation.')],
      ['Paying for things', `<ul><li>Card payments are handled by Paystack. We never see or store your full card details; we store the payment reference, amount and result.</li>
<li>Plans (Mapo and Nepo) last 30 days (monthly) or 365 days (yearly) and do not renew by themselves. Upgrading from Mapo to Nepo turns your remaining Mapo days into Nepo days of the same value.</li>
<li>Store items and plans are not refundable once used or started, unless the law says otherwise.</li></ul>`],
      ['Sponsored prizes', `<p>Sponsors fund sponsored prizes in advance from their sponsor wallet. Tap Am pays winners from those funds. Sponsors don’t decide who wins.</p>`, FLAG('Sponsored free-entry prize competitions may need a sales promotion approval (FCCPC) and/or a state promotional permit.')]
    ]
  },
  'account-rules': {
    title: 'Account Suspension Rules', h1: 'Account rules', description: 'When Tap Am may suspend or close an account, and how to appeal.',
    lede: 'We suspend accounts to protect players and keep games fair. You can always ask us to look again.',
    sections: [
      ['Why we may suspend', `<ul><li>Cheating or attempting to cheat (see <a href="/fair-play">Fair Play</a>).</li>
<li>More than one account per person, or using someone else’s account or payment method.</li>
<li>Fraud, chargebacks, money laundering or suspicious payments.</li>
<li>Offensive nicknames, hate, threats or harassment (including in live voice).</li>
<li>Breaking the <a href="/terms">Terms</a> or the law, or when the law requires it.</li></ul>`],
      ['What happens', `<ul><li>A suspended account is logged out everywhere and can’t log in or play.</li>
<li>Pending withdrawals may be held while we review. Prizes from cheating may be removed.</li>
<li>For serious cases we may close the account permanently. Wallet money from a closed account is handled as the law requires.</li></ul>`, FLAG('Decide the policy for wallet balances and winnings on permanently closed accounts (refund, forfeiture, or hold) and confirm it is lawful.')],
      ['Appeals', `<p>If you think we got it wrong, write to us through the ${contact} with your nickname. A person will review it.</p>`],
      ['Archiving your own account', `<p>You can archive your account in <strong>Settings</strong>. It logs you out and hides your profile. Log in again within 30 days to bring it back; after that, contact us. To delete your data completely, ask us through the ${contact}.</p>`]
    ]
  },
  terms: {
    title: 'Terms of Use', h1: 'Terms of use', description: 'The agreement for using Tap Am.',
    lede: 'By making an account you agree to these Terms, the Game Rules, the Fair Play Policy and the Prizes & Withdrawal Rules.',
    sections: [
      ['Who we are', `<p>Tap Am (“the game”, “we”, “us”) is a competitive tapping game operated by <strong>Ferrn Agency</strong>. These Terms apply whenever you create an account, play or use any part of Tap Am.</p>`, FLAG('Insert the registered legal entity name, RC number and address once CAC registration is complete.')],
      ['Who can use Tap Am', `<p>Anyone can create an account and play free pools. If you are under 18, you confirm a parent or guardian has agreed to you using Tap Am. Money features (adding money, paid pools, buying with money and withdrawals) are only for people aged 18 or older.</p>`, FLAG('Under the NDPA 2023 a child is under 18 and processing a child’s data needs a parent’s or guardian’s consent. Sign-up no longer asks for date of birth. Confirm whether the current self-declaration is enough or an age gate / parental consent flow is needed.')],
      ['Your account', `<ul><li>Use a real email you own; we confirm it with a 6-digit code.</li>
<li>One account per person. Don’t share, sell or transfer it. Keep your password secret.</li>
<li>Your nickname is public on leaderboards. No impersonation, hate or offensive names.</li>
<li>Tell us quickly through the ${contact} if you think someone is using your account.</li></ul>`],
      ['Tiers and plans', `<p>Accounts start on the free <strong>Lapo</strong> tier. <strong>Mapo</strong> and <strong>Nepo</strong> are paid tiers with the features listed on the <a href="/plans">plans page</a>. Plans don’t renew automatically. We may change features or prices for future periods; we won’t take away what you already paid for in the current period.</p>`],
      ['Virtual items', `<p>Boosters, skins, themes, sounds, ranks and badges are virtual. They have no cash value, can’t be exchanged for money or transferred (except gifting where the game allows), and may be changed or retired.</p>`],
      ['Money and prizes', `<p>The <a href="/prizes">Prizes &amp; Withdrawal Rules</a> explain wallets, winnings, withdrawals and refunds. Money you add can’t be withdrawn.</p>`],
      ['Pools you create', `<p>If you create a pool you must describe it honestly. You can’t delete it once created. Prize money you put in is locked into the pool. Tap Am may cancel any pool (with refunds) to protect players.</p>`],
      ['Ads and sponsors', `<p>Sponsors fund prizes and show ads. Sponsors don’t control results. If you choose to send your details to a sponsor from an ad, that sponsor uses them under its own privacy terms.</p>`],
      ['Fair play and suspension', `<p>See the <a href="/fair-play">Fair Play Policy</a> and <a href="/account-rules">Account Suspension Rules</a>.</p>`],
      ['Availability', `<p>Tap Am is provided “as is” and “as available”. Networks, devices or maintenance can interrupt play. If a fault on our side ruins a pool, we may cancel it with refunds or re-run it.</p>`],
      ['Our liability', `<p>To the extent allowed by Nigerian law, we are not liable for indirect losses, lost opportunities or lost in-game progress. Nothing in these Terms limits liability that can’t legally be limited.</p>`, FLAG('Review liability limits and consumer rights under the FCCPA 2018.')],
      ['Changes', `<p>We may update these Terms. We’ll change the date at the top and, for important changes, ask you to accept them in the app.</p>`],
      ['Law', `<p>These Terms are governed by the laws of the Federal Republic of Nigeria. Disputes go to the courts of Lagos State unless the law says otherwise.</p>`]
    ]
  },
  privacy: {
    title: 'Privacy Policy', h1: 'Privacy policy', description: 'What data Tap Am collects and how it is used.',
    lede: 'We collect what we need to run your account and the game, keep money safe and stop cheating. We don’t sell your data.',
    sections: [
      ['Who is responsible', `<p>Tap Am is operated by <strong>Ferrn Agency</strong>, which decides how your personal data is used for the game, in line with the <strong>Nigeria Data Protection Act 2023</strong>.</p>`, FLAG('Confirm whether Tap Am must register with the NDPC as a data controller of major importance, appoint a DPO and file an annual compliance audit.')],
      ['What we collect', `<ul>
<li><strong>Account:</strong> nickname, email, password (stored only as a salted one-way hash), gender, country, when you confirmed your email, when you accepted the Terms, and — if you use money — when you confirmed you are 18+. Sponsors also give a company name, website and logo.</li>
<li><strong>Email codes:</strong> 6-digit sign-up and reset codes, stored only as hashes; they expire after 10 minutes.</li>
<li><strong>Game data:</strong> pools you join or create, taps, scores, boosters used, ranks, badges, top-tapper totals, and fair-play flags.</li>
<li><strong>Money:</strong> wallet and winnings balances and history, Paystack payment references and results (not your card details), and for withdrawals your bank, account number and account name.</li>
<li><strong>Settings:</strong> theme, background, tap sound, vibration and sound preferences.</li>
<li><strong>Ads:</strong> how many times ads are shown and tapped (not linked to you). If you choose to send your details to a sponsor from an ad, we store your name, email and/or phone and your consent, and share them with that sponsor.</li>
<li><strong>Login session:</strong> one cookie (<code>nakam_session</code>) that keeps you signed in for up to 30 days after you last open Tap Am. We store only a hash of it.</li>
<li><strong>Security:</strong> your IP address is used briefly to count sign-up, login and other attempts to stop spam and guessing; these counters reset automatically.</li>
<li><strong>On your device:</strong> a random visitor ID (to count visits and people online), your sound setting, best practice score and rank-up marker. When you install the app, some public pages are saved on your device; logging out clears saved pages.</li>
<li><strong>Messages</strong> you send through the Suggest pages.</li></ul>`],
      ['Why we use it', `<ul><li>To run your account, games, leaderboards, ranks and badges (contract).</li>
<li>To process payments, prizes and withdrawals and keep records (contract and legal obligation).</li>
<li>To detect cheating, fraud and abuse and keep Tap Am secure (legitimate interests).</li>
<li>To share your details with a sponsor <strong>only when you tick the consent box</strong> on that sponsor’s ad (consent — you can withdraw it by contacting the sponsor and us).</li>
<li>To send codes and important account messages. We don’t send marketing emails unless you agree.</li></ul>
<p>Automatic decisions: our server automatically drops taps above your tier’s speed and flags unusual play for a person to review. Small withdrawals may be paid automatically when there are no flags.</p>`],
      ['Who can see it', `<ul><li><strong>Other players</strong> see your nickname, tier, rank character, badges and scores. Never your email, gender or country.</li>
<li><strong>Sponsors</strong> see total views, taps and players for their pools and ads, and the contact details of players who chose to send them.</li>
<li><strong>Service providers</strong> working for us: Cloudflare (hosting, database, live voice), Paystack (payments and payouts), our email provider (codes and alerts) and YouTube (when an ad is a YouTube video, YouTube receives your IP when the video loads).</li>
<li><strong>Authorities</strong>, when the law requires it.</li></ul>`, FLAG('Sponsor lead sharing: confirm the consent wording, the sponsor’s status as an independent controller, and whether a data-sharing agreement with each sponsor is needed.')],
      ['Where it is stored', `<p>Tap Am runs on Cloudflare’s global network, so your data may be processed outside Nigeria.</p>`, FLAG('Cross-border transfer: confirm the NDPA basis (adequacy, contract clauses or consent) for processing on Cloudflare outside Nigeria.')],
      ['How long we keep it', `<p>Account data stays while your account exists. Archived accounts can be restored for 30 days. Login sessions end after 30 days without use. Payment and withdrawal records are kept as long as the law requires. Ask us to delete your account and we delete or anonymise your data, except what we must keep for legal, fraud or fair-play reasons.</p>`],
      ['Your rights', `<p>You can ask to see, correct, delete or get a copy of your data, object to or restrict how we use it, and withdraw consent. Write to us through the ${contact}. You can also complain to the <strong>Nigeria Data Protection Commission (NDPC)</strong>.</p>`],
      ['Children', `<p>Players under 18 can play free pools if a parent or guardian agrees. They can’t use money features.</p>`],
      ['Security', `<p>Passwords and codes are hashed, connections use HTTPS, the login cookie is HttpOnly and Secure, and money changes happen only on our server with records kept. No system is perfect — use a strong password you don’t use anywhere else.</p>`],
      ['Changes', `<p>If we change this policy we will update the date at the top and tell you in the app when the change is significant.</p>`]
    ]
  },
  disclaimer: {
    title: 'Disclaimer', h1: 'Disclaimer', description: 'Important things to know before you play Tap Am.',
    lede: 'Tap Am is for fun. “Make you chop am” na vibes, not a promise of money.',
    sections: [
      ['Entertainment first', `<p>Tap Am is a competitive game made for entertainment. Our slogans and Pidgin jokes are part of the fun and are not promises of income or prizes.</p>`],
      ['Skill, not chance', `<p>Results depend on how fast you tap within the rules. We make no promise that you will win anything. Never spend money you can’t afford to lose on entry fees.</p>`, FLAG('Whether paid-entry tapping contests are “gaming” under state law is a legal question — do not describe Tap Am as “not gambling” in marketing until counsel confirms.')],
      ['Scores and connectivity', `<p>Only taps that reach our servers while a pool is live are counted. Slow internet, device performance or browser settings can affect how many of your taps are recorded.</p>`],
      ['Look after yourself', `<p>Fast, repeated tapping can strain your fingers, hands and wrists. Take breaks, stop if you feel pain, and don’t play while driving.</p>`],
      ['Ads and other websites', `<p>Ads come from third parties. Showing an ad is not an endorsement, and we are not responsible for products or websites we link to.</p>`],
      ['No official affiliation', `<p>Tap Am is an independent game by Ferrn Agency, not affiliated with any government body or brand unless we clearly say so.</p>`]
    ]
  },
  consent: {
    title: 'Consent notices', h1: 'Consent notices', description: 'Every place Tap Am asks for your agreement, and what it means.',
    lede: 'Here is every box we ask you to tick, word for word, and what happens when you do.',
    sections: [
      ['When you sign up', `<p>“I agree to the Terms, Privacy Policy and Game Rules. Tap Am stores my nickname, email, gender and country and game activity to run my account. If I’m under 18, a parent or guardian agrees.” We record the date and version you accepted.</p>`],
      ['Before your first money action', `<p>“I confirm I am 18 or older.” Shown once, before you add money, join a paid pool, buy with money, create a pool with a prize or withdraw. We record the date.</p>`],
      ['Adding money', `<p>“I understand money I add can’t be withdrawn.” Shown every time you add money.</p>`],
      ['Creating a pool', `<p>“I understand the pool can’t be deleted until it ends.” Prize money you add is locked into the pool.</p>`],
      ['Sending your details to a sponsor', `<p>“I agree to share my name, email and phone with [sponsor] so they can contact me about this offer.” Only shown when Tap Am has switched lead collection on for that sponsor. Nothing is shared unless you tick it and press send.</p>`],
      ['Cookies and storage', `<p>We use one strictly necessary login cookie and a few items in your browser storage (see the <a href="/privacy">Privacy Policy</a>). We don’t use advertising cookies. YouTube ads load from youtube-nocookie.com.</p>`, FLAG('Confirm that no cookie banner is required given only strictly necessary cookies are used.')]
    ]
  }
};
DOCS['game-rules'] = DOCS.rules;

export const LEGAL_PATHS = Object.keys(DOCS);
export function legalPage(key, user = null) {
  const doc = DOCS[key];
  if (!doc) return null;
  const admin = user?.role === 'ADMIN';
  const sections = doc.sections.map(([h, html, extra]) => `<h3>${esc(h)}</h3>${html}${admin && extra?.flag ? `<span class="flag">${esc(extra.flag)}</span>` : ''}`).join('');
  const inner = `<h2>${esc(doc.title)}</h2><span class="doc-updated">Last updated ${LEGAL_UPDATED}</span><p class="doc-lede">${doc.lede}</p>${sections}`;
  const path = key === 'game-rules' ? '/rules' : '/' + key;
  return docLayout({ user, title: doc.title, h1: doc.h1, description: doc.description, tabs: LEGAL_TABS, current: path,
    cards: `<article class="doc-card">${inner}</article>`,
    foot: user ? '' : `<div class="doc-foot"><a class="btn btn--green" href="/signup">Back to sign up</a><a class="btn btn--white" href="/login">Login</a></div>` });
}
// Every flagged item, for docs/LEGAL_REVIEW.md and the admin.
export const legalFlags = () => Object.entries(DOCS).filter(([k]) => k !== 'game-rules').flatMap(([k, d]) => d.sections.filter(s => s[2]?.flag).map(s => ({ page: d.title, section: s[0], note: s[2].flag })));
