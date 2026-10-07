# Tap Am — Demo MVP

Tap Am is a mobile-first competitive tapping game demo running on Cloudflare Workers with a Cloudflare D1 database.

## Live demo scope

- One-page landing page with Free vs Mega account explanation and rules
- Shared user signup/login with hashed passwords and secure HttpOnly sessions
- Free and Mega plans, with an in-demo Mega upgrade
- Timed tap pools with start/end dates, entry amount, prize seed, creator, booster rules, join/leave/rejoin/share flows
- Per-pool player count and tap totals
- Standard and Mega-only boosters
- Referral links that reward the inviter with a booster
- Daily, monthly and lifetime tap stats
- Separate funded and earned wallet balances
- Mobile-first tap console
- Free users tap one pool at a time; Mega users can link up to four pools to one tap box
- Spaces feed where only the current top 10 Mega tappers can post
- Super-admin dashboard with users, pools, taps, official pool creation and booster creation

## Demo payments

Funding is simulated in this demo. Real deposits, withdrawals and cash prize settlement are intentionally disabled until production payment, fraud, KYC/AML, age-control, chargeback, terms/privacy and applicable gaming/promotion compliance work is complete.

## Cloudflare

D1 database: `tap-am-demo`

Worker binding: `DB`

## Local deploy

```bash
npm install
npx wrangler d1 execute tap-am-demo --remote --file=schema.sql
npx wrangler deploy
```

Open `/admin` and use **First setup** once to create the super-admin account.
