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
- Sign up: name (username), password (8+ chars, common passwords blocked), optional email, date of birth (18+ only) and Terms/Privacy/Disclaimer acceptance
- Login with username or email
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

## Upgrading an existing database

The sign-up form made email optional and added `date_of_birth`, `terms_accepted_at` and `terms_version` to `users`. New databases get this from `schema.sql`. A database created before 8 Oct 2026 needs a one-time upgrade (it rebuilds `users` and keeps all existing rows):

```bash
npm run db:upgrade        # remote
npm run db:upgrade:local  # local dev
```

## Deploy

```bash
npm run db:migrate
npm run deploy
```

The D1 binding is `DB` and the live-game Durable Object binding is `GAME_ROOMS`.
