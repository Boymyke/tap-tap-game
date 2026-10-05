# Lagos Mode

Mobile-first Lagos life/tapping game MVP.

## Live Cloudflare deployment

- Landing page: https://lagos-mode.aiwebcourse.workers.dev/
- Game: https://lagos-mode.aiwebcourse.workers.dev/play
- Admin: https://lagos-mode.aiwebcourse.workers.dev/admin
- Production database: Cloudflare D1 database `lagos-mode-prod`

The live test deployment uses Cloudflare Workers + D1 so player creation, taps, story stage, shop data, billboard data, admin accounts/sessions and payment settings persist in a real database.

On the first visit to `/admin`, create the first super-admin. After that the one-time setup is disabled. Admin passwords are PBKDF2-hashed, five failed attempts trigger a 30-minute lockout, sessions use Secure/HttpOnly/SameSite cookies, and the Paystack secret is AES-GCM encrypted before database storage.

## Included

- One-page landing page with rules and admin login link
- Mobile-first virtual-phone game UI inspired by Lagos road/danfo visual language
- Cloudflare D1 production database for the live Worker deployment
- PostgreSQL/Drizzle application source for the Next.js build path
- Player creation, unique life seeds and persisted story state foundation
- Server-authoritative tap batches, adjustable tap zone and basic anti-cheat limits
- Secure admin authentication and session handling
- 5 failed admin logins -> 30-minute lockout
- Paystack public/secret key settings in admin
- Paystack secret encrypted at rest and never returned to the browser
- Shops, phone upgrade inventory foundation and billboard inventory

## Local Next.js setup

1. Copy `.env.example` to `.env.local` and fill in the values.
2. Create a PostgreSQL database and set `DATABASE_URL`.
3. Install dependencies: `npm install`
4. Create database tables: `npm run db:push`
5. Create the first super admin: `npm run db:seed`
6. Start locally: `npm run dev`

## Payment safety

Do not commit real Paystack keys to GitHub or expose the secret key to client-side code. Enter the keys through the secure admin UI. The current MVP treats real-money payments as purchases only; payment initialization, webhook verification, receipts/refunds and production reconciliation still need to be completed before accepting public payments.

## Next build phases

Expand the live build into player businesses, jobs, housing, deeper phone upgrades, interactive billboard bidding/upload approval, social/chat, Vibe feed, Telegram integration, moderated user uploads, and complete Paystack purchase flows.
