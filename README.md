# NAK AM

NAK AM is a competitive tapping game powered by Ferrn Agency.

## MVP goal

The first release prioritizes correct gameplay and backend structure over custom visual design. The application is being structured for an initial audience of roughly 1,000 users with a clear path to scale horizontally.

## Current MVP surface

- Single-page landing site
- Navigation to Play, How to Play, Policy and Suggestions
- Basic playable tap prototype
- Free and Odogwo account tiers
- Advertising placement placeholders
- PostgreSQL/Prisma production data model
- Server-authoritative tap batch model
- Wallet ledger foundation
- Pool and game-session foundation

## Stack

- Next.js + React + TypeScript
- PostgreSQL
- Prisma
- Redis planned for tap counters, rate limiting and live leaderboards
- Paystack planned for payments
- Cloudflare planned for CDN/WAF/rate limiting

## Required production services

1. PostgreSQL database
2. Redis instance
3. App hosting account
4. Domain/DNS access
5. Paystack API keys when wallet/payments are enabled
6. Transactional email provider credentials when account verification/reset flows are enabled

## Local setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run dev
```

## Scale model

The browser is not trusted as the game authority. Taps are displayed instantly on the client, batched, validated on the server, incremented in Redis, reflected in live leaderboards, and periodically persisted to PostgreSQL. This avoids one database write per tap and makes the platform practical to scale beyond the first 1,000 users.

## Next engineering milestones

- Authentication
- Pool admin CRUD and scheduling
- Server tap-session API
- Redis leaderboard
- Anti-cheat validation
- Odogwo subscription rules
- Wallet ledger services
- Paystack webhook verification
- Admin dashboard
- Real suggestion persistence
- Ad campaign management
