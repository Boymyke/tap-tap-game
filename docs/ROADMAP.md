# Tap Am build roadmap

Source: the product brief of 8 Oct 2026 (Lapo babies, Nepo babies, sponsors, super admin).
Decisions so far: build on this GitHub codebase; payments via **Paystack**; Nepo = **₦13,000/month or ₦120,000/year**;
ties are set **per pool** (first to reach the score wins, or tied players split).

## Phase 1 — look, landing, app shell ✅ (this release)
- Design system from the references: patterned playing cards, VS stickers, 7-segment displays, logo unchanged.
- One-screen landing: 10-second tap challenge (big random +1s, combos, vibration, sound toggle), rotating sponsored
  pools (demo until `settings.landing_demo_pools = '0'`), people online + total visits.
- Installable app (manifest, icons, service worker), offline banner and offline page, tilt → tap area on the right.
- Hashed session tokens, 30-day sliding sessions. How to play, Rules, Merch (notify me), FAQ, About, 404/500.

## Phase 2 — accounts, ranks and the super admin
- Roles: `LAPO` (free), `NEPO` (paid), `SPONSOR` (separate sign-up + dashboard), `ADMIN`.
- 100 generated ranks (name, tap threshold, games-played requirement, unlocks) — editable/addable in admin.
- Admin: users (taps, games, rank, wallet), remove/suspend accounts, gift boosters/skins to any account,
  create skins (who can use them: Lapo/Nepo/both), create ads, create every pool type, switch off demo pools.
- New game screen: big responsive tap rectangle, lobby with countdown and ads, live leaderboard over WebSocket
  (Durable Object per pool), combo/milestone/rank-up animations, vibration, mute, landscape layout.

## Phase 3 — money (Paystack)
- Wallet (funded money, **non-withdrawable**, warning shown before funding) and Winnings (withdrawable).
- Withdrawal minimums: Lapo ₦10,000, Nepo ₦5,000; bank payout via Paystack Transfers; basic KYC before payout.
- Nepo subscription: monthly ₦13,000 or yearly ₦120,000 via Paystack subscriptions; upgrade tops up boosters.
- Paid pools: entry fee into prize; payout rules (winner-takes-all or top-N split); tie rule chosen at creation.
- Sponsor pools: sponsor funds the prize from their wallet, chooses Lapo-only / Nepo-only / everyone.
- ⚠ Legal check before switching real money on: paid-entry cash-prize contests may need a gaming licence in Nigeria.

## Phase 4 — store, skins, boosters, referrals
- Store: boosters, tap skins (Lapo: boy/girl only), tap-box shapes and colours (Nepo, some rank-gated).
- Starter boosters at sign-up; one booster per pool; Nepo gifting (no Nepo-only boosters to Lapo babies).
- Referral links: every 10 sign-ups → booster gift.
- Booster calculator for Nepo: "use this booster twice → top 3 in pool X".
- Nepo multi-pool: join up to 10 pools; one tap counts in all joined pools.
- Nepo pool creation (can't delete until it ends), private pools with system passwords, custom pool skins/colours.

## Phase 5 — live voice and sponsor ads
- Voice in games (Cloudflare Realtime): Nepo, rank ≥ Para para boy, top 5 in that pool; one room at a time.
- Sponsor ads: image or YouTube video, link, shown before/after games and in the lobby; always closable.
