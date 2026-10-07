# NAK AM

NAK AM is a competitive tapping game powered by Ferrn Agency.

## Current MVP

- Real user signup/login sessions
- Free and Odogwo account tiers
- Admin pool creation
- Pool joining
- Server-verified batched tapping
- Live leaderboard polling
- Lifetime tap totals
- Suggestions
- How to Play and Policy pages
- Advertising placements
- D1-backed persistence
- Cloudflare Workers deployment

## Architecture

- Cloudflare Workers: website + API
- Cloudflare D1: users, sessions, pools, scores, wallet ledger, ads and suggestions
- Client-side tap batching to reduce server/database traffic

For higher sustained concurrency, the next scaling layer is a Durable Object per live pool so live scores stay out of D1 until settlement.

## Local development

```bash
npm install
npm run db:local
npm run dev
```

## Deploy

```bash
npm run db:migrate
npm run deploy
```

The D1 database binding is configured in `wrangler.jsonc` as `DB`.

## Important

Real-money deposits, withdrawals and prize settlement are intentionally not enabled in this gameplay-first MVP. The wallet tables exist for the later payment phase.
