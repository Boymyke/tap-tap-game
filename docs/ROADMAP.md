# Tap Am build roadmap

Source: the product brief of 8 Oct 2026 (Lapo babies, Nepo babies, sponsors, super admin).
Decisions so far: build on this GitHub codebase; payments via **Paystack**; tiers Lapo (free) / Mapo **₦3,500/month** / Nepo **₦50,000/month** (Oct 2026; was ₦13,000);
ties are set **per pool** (first to reach the score wins, or tied players split).

## Phase 1 — look, landing, app shell ✅ (this release)
- Design system from the references: patterned playing cards, VS stickers, 7-segment displays, logo unchanged.
- One-screen landing: 10-second tap challenge (big random +1s, combos, vibration, sound toggle), rotating sponsored
  pools (real pools only; demo pools were removed), people online + total visits.
- Installable app (manifest, icons, service worker), offline banner and offline page, tilt → tap area on the right.
- Hashed session tokens, 30-day sliding sessions. How to play, Rules, Merch (notify me), FAQ, About, 404/500.

## Phases 2–5 ✅ built (Oct 2026) — waiting on keys: Paystack, email, Cloudflare Realtime (voice), R2 (uploads)

## Phase 2 — accounts, ranks and the super admin
- Roles: `LAPO` (free), `NEPO` (paid), `SPONSOR` (separate sign-up + dashboard), `ADMIN`.
- 100 generated ranks (name, tap threshold, games-played requirement, unlocks) — editable/addable in admin.
- Admin: users (taps, games, rank, wallet), remove/suspend accounts, gift boosters/skins to any account,
  create skins (who can use them: Lapo/Nepo/both), create ads, create every pool type.
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

## Phase 6 — tiers, redesign, sponsors v2, operations ✅ built (9 Oct 2026)
- New "sticker pop" look (bitmoji avatars, badges), brand guide (`docs/BRAND.md`).
- Instant page switching (prefetch + swap, ring loader). No text selection anywhere; no zoom on game screens.
- Three tiers: Lapo / Mapo / Nepo — fingers 1/3/unlimited, pools at once 1/3/10, server tap-rate cap per tier.
- Home rebuilt (slideshow, winnings, join by code, create, sponsored → live → coming-up, invite + QR share card).
- Create form: info tips, comma money inputs, up to 100 winners, VS per-side pots, paid-only / VS-only fields.
- Store sections and quantities, more boosters, many boosters per game (queued). Wallet CSV, one withdrawal a day.
- Me: settings (archive account), top tappers by period, ranks, plan comparison, suggest a pool.
- Sponsors: pool with/without ad, ad preview, home-slot requests, lead capture (per-sponsor switch + consent), pool colours.
- Admin: bulk gifting, health page + email alerts, automatic payouts (optional) + CSV, slides, backgrounds, tap limits switch.
- Legal pages rewritten for the above; open questions in `docs/LEGAL_REVIEW.md`.

## Next
- Switch on real keys: Paystack live + Transfers, email sender, R2, Realtime.
- Lawyer review of `docs/LEGAL_REVIEW.md` before real-money paid pools go live.
- Copy the `TAP_METER` binding to `wrangler.jsonc` and run `npm run db:upgrade:5` before shipping this to the live `nak-am` Worker.

## Oct 10 update
- New logo, logo mark and favicon from the brand pack; Barlow / Barlow Condensed type and the earlier corner sizes.
- Landing: looping background video (fast posters first, skipped on data saver), new copy, "Teach me", no demo pools.
- Plain gradient backgrounds (no stars), animated gradient on login/sign-up, patterned cards.
- Tap areas are patterns + colour. Mapo/Nepo set their own; pool creators (sponsors, admin, Nepo) can set the pool's tap area and choose whether players may use their own.
- Back button on every page for every role. Invite page (players and sponsors), also in the menu.
- Game: scrollable top-5 board, booster tips that slide in (tap to use), ad countdown line, YouTube ads autoplay muted, ads last 5/10/30 seconds, pools at least 60 seconds.
- Admin: merch upload, special badges, name emoji (meaning only the owner sees), ad approval queue with reasons, delete ads, slide button text + picture or colour slides, payout rejection reasons.
- Player: taps by day / month / year with a picker, badge tap counts, bag filters, emoji removed everywhere.
