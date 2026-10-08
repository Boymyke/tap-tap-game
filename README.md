# NAK AM

NAK AM is a mobile-first competitive tapping game powered by Ferrn Agency.

## Live architecture

- Cloudflare Workers: website + API
- Cloudflare Durable Objects: one live `GameRoom` per game for active scores, boosters and leaderboards
- Cloudflare D1: users, sessions, game definitions, settled scores, store, wallets, suggestions and long-term records
- Batched tap submission: physical taps are grouped before reaching the server
- Durable Object alarm settlement: final live scores are persisted to D1 when a game closes

This keeps rapid live tapping out of the main relational database and gives the game a straightforward path beyond the first 1,000 users.

## Current features

- Civil Servant standard accounts
- Odogwu premium tier with admin-controlled price
- Super Admin management-only account (admin cannot play)
- Game creation with automatic `#NAK...` hashtag
- Join games by hashtag
- Start/end scheduling
- Disabled tap control before start and after end
- Combo feedback and tap sound
- Live leaderboards
- Booster store
- Admin-created booster products with multiplier and duration
- Booster inventory and activation in eligible games
- Mobile-first responsive interface
- Pinch/two-finger zoom prevention inside the game UI
- How to Play and Suggest pages
- Tap Am themed Login / Sign up screen (one page, two tabs) at `/login` and `/signup`
- Sign up (all fields required): nickname, email, password (8+ chars with small letter, capital letter and number; common passwords blocked), date of birth (18+ only) and Terms/Privacy/Disclaimer acceptance
- Email is confirmed with a 6-digit code before the account is created; forgot-password also works with an emailed code
- Login with nickname or email; rate limits on sign-up, codes and login; strict security headers
- One-screen landing page: 10-second tap challenge, rotating sponsored pools (demo until `landing_demo_pools` is set to `0`), people online and total visits
- Installable app (manifest + service worker), offline banner/page, landscape layout puts the tap area on the right
- How to play, Rules, Merch (notify me), FAQ, About, and themed 404/500 pages
- See `docs/ROADMAP.md` for the phased build plan
- Terms (`/terms`), Privacy Policy (`/privacy`) and Disclaimer (`/disclaimer`) pages — `/policy` redirects to `/privacy`
- Advertising placements
- Ferrn Agency attribution

## Payments

The wallet/store transaction model exists, but public wallet funding and withdrawals are intentionally not enabled yet. Odogwu and paid boosters should not be treated as cash-purchasable until a payment provider is connected and the payment/prize rules are finalized.

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
```

## Deploy

```bash
npm run db:migrate
npm run deploy
```

The D1 binding is `DB` and the live-game Durable Object binding is `GAME_ROOMS`.
