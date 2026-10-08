# Tap Am

Tap Am (formerly NAK AM) is a mobile-first competitive tapping game powered by Ferrn Agency.

## Live architecture

- Cloudflare Workers: website + API
- Cloudflare Durable Objects: one live `GameRoom` per game for active scores, boosters and leaderboards
- Cloudflare D1: users, sessions, game definitions, settled scores, store, wallets, suggestions and long-term records
- Batched tap submission: physical taps are grouped before reaching the server
- Durable Object alarm settlement: final live scores are persisted to D1 when a game closes

This keeps rapid live tapping out of the main relational database and gives the game a straightforward path beyond the first 1,000 users.

## Current features

**Accounts and tiers**
- Lapo babies (free), Nepo babies (₦13,000/month or ₦120,000/year — prices set by the admin), Sponsors (sign up at `/signup?type=sponsor`) and one Super admin
- Sign-up with emailed 6-digit code, 18+ check, strong passwords; login by nickname or email; 30-day sliding sessions
- 100 ranks (20 named tiers × 5) unlocked by lifetime taps, games and wins; admin can rename, re-threshold and add ranks
- Referral links: every 10 sign-ups (setting) gives the referrer a free booster; starter boosters for new players, bonus boosters on Nepo upgrade

**Game**
- One `GameRoom` Durable Object per pool: live scores, anti-cheat token bucket (25 taps/sec), boosters (one per pool), leaderboard, settlement by alarm (plus a 5-minute cron sweep)
- Game screen: big animated tap card, +1/+2 bursts, combos with vibration, score and position milestones, boosters, mute, live board, VS team bar, landscape/desktop layout with the tap area on the right, end screen
- Nepo babies play up to 10 pools at once (one tap counts in all), create pools, gift boosters (Nepo boosters only to Nepo babies), use the booster calculator, change tap colours/shapes/skins
- Pools: free, paid (entry fees form the prize) or sponsored; winner-takes-all or top 3/5/10 split; tie rule chosen by the creator; Lapo-only / Nepo-only / everybody; private pools with a generated password; VS pools with two sides
- Pools can't be deleted by their creator; the admin can cancel (refunds every entry fee)

**Money** (Paystack, test mode on the preview)
- Wallet (money added — spend only, never withdrawable, with a clear notice) and Winnings (withdrawable)
- Withdrawals from ₦10,000 (Lapo) / ₦5,000 (Nepo); one pending request at a time; admin pays via Paystack transfer or marks paid / rejects with refund

**Sponsors and ads**
- Sponsor dashboard: players reached, ad views and clicks, sponsored pools, brand profile
- Ads (picture or YouTube) shown as closable pop-ups before games, in the lobby and after games; sponsor ads need admin approval

**Super admin** (`/admin`)
- Overview numbers and all settings; users (search, tier, suspend, gift boosters/skins, adjust money, see taps and games, delete); pools (create any type, pay out, cancel); store (skins/shapes/boosters with Lapo/Nepo availability and rank); ranks; ads; payouts; suggestions

**Site**
- One-screen landing page with the 10-second tap challenge, rotating pools, people online and total visits; installable app, offline banner/page; How to play, Rules, Merch, FAQ, About, Terms, Privacy, Disclaimer, 404/500 pages

## Secrets and switches

| Name | What it does |
| --- | --- |
| `PAYSTACK_SECRET_KEY` (secret) | Real card payments, bank lookup and transfers. Without it the preview simulates payments (`PAYMENTS_TEST_MODE=1`). |
| `RESEND_API_KEY` or Cloudflare Email | Real sign-up emails. Without it the preview shows the code on screen (`OTP_DEV_MODE=1`). |
| `CALLS_APP_ID`, `CALLS_APP_TOKEN` (secrets) | Live voice in games (Cloudflare Realtime). The mic button only shows once these are set. |
| `ADMIN_SETUP_KEY` (secret) | Lets you create the first super admin at `/admin/setup`. |
| R2 bucket `MEDIA` | Picture uploads for ads, skins and logos. Turn on R2 in the dashboard, create the bucket and uncomment it in `wrangler.preview.jsonc`. |

## Local development

```bash
npm install
npm run db:local
npm run dev
```

## UI assets

The Tap Am logo and backgrounds live in `public/assets` and are served as Workers static assets. The shared theme (colours from the Figma reference) is in `src/ui/theme.js`.

## Preview link for testing the UI

`wrangler.preview.jsonc` deploys this code to a separate Worker, `tap-am-ui-preview`, with its own D1 database (`tap-am-ui-preview`, schema already applied). It never touches the live `nak-am` Worker or its data.

```bash
npm install
npx wrangler login      # once, if not already logged in
npm run preview:deploy  # prints https://tap-am-ui-preview.<your-subdomain>.workers.dev
```

## Email codes

Sign-up and password reset email a 6-digit code. Connect one sender (the code picks the first that is set):

1. **Cloudflare Email Service** — onboard your domain under Compute → Email Service, then add to `wrangler.jsonc`:
   `"send_email": [{ "name": "EMAIL" }]` and `"vars": { "EMAIL_FROM": "no-reply@yourdomain.com" }`.
   Sending to any address needs the Workers Paid plan.
2. **Resend** — `npx wrangler secret put RESEND_API_KEY` and set the `EMAIL_FROM` var to an address on a domain verified in Resend.

Optionally set a random `OTP_PEPPER` secret. The preview Worker sets `OTP_DEV_MODE = "1"`, which shows the code on screen while no sender is connected. Never set it on the live Worker.

## Upgrading an existing database

The sign-up form made email optional and added `date_of_birth`, `terms_accepted_at` and `terms_version` to `users`. New databases get this from `schema.sql`. A database created before 8 Oct 2026 needs a one-time upgrade (it rebuilds `users` and keeps all existing rows):

```bash
npm run db:upgrade        # remote
npm run db:upgrade:local  # local dev
npm run db:upgrade:2        # then the email-code tables (remote)
npm run db:upgrade:2:local  # local dev
npm run db:upgrade:3        # visitors, merch waitlist; clears old sessions
npm run db:upgrade:3:local
npm run db:upgrade:4        # full game: tiers, ranks, pools v2, money, store, ads, voice
npm run db:upgrade:4:local
```

## Deploy

```bash
npm run db:migrate
npm run deploy
```

The D1 binding is `DB` and the live-game Durable Object binding is `GAME_ROOMS`.
