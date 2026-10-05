# Lagos Mode

Mobile-first Lagos life/tapping game MVP.

## Included

- One-page landing page with rules and admin login link
- Mobile-first virtual-phone game UI inspired by Lagos road/danfo visual language
- PostgreSQL database via Neon/Postgres + Drizzle ORM
- Player creation, unique life seeds and persisted story state foundation
- Server-authoritative tap batches, adjustable tap zone and basic anti-cheat limits
- Secure admin authentication with bcrypt password hashing
- 5 failed admin logins -> 30-minute lockout
- HTTP-only SameSite admin session with 8-hour expiry
- Optional admin IP allowlist
- Admin audit log with hashed IPs
- Paystack public/secret key settings in admin
- Paystack secret encrypted at rest with AES-256-GCM and never returned to the browser
- CSP/security headers

## Setup

1. Copy `.env.example` to `.env.local` and fill in the values.
2. Create a PostgreSQL database (Neon is a good fit for serverless deployments) and set `DATABASE_URL`.
3. Install dependencies: `npm install`
4. Create database tables: `npm run db:push`
5. Create the first super admin: `npm run db:seed`
6. Start locally: `npm run dev`

## Admin

Open `/admin/login`. Use the email/password supplied through `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` when seeding.

For additional protection in production set `ADMIN_IP_ALLOWLIST` to one or more comma-separated trusted IP addresses. Use a password manager-generated admin password and separate random values for `ADMIN_SESSION_SECRET`, `SETTINGS_ENCRYPTION_KEY`, and `AUDIT_PEPPER`.

## Payment safety

The admin UI stores the Paystack secret key encrypted. Do not commit real Paystack keys to GitHub or expose the secret key to client-side code. This MVP treats real-money payments as purchases only. Cash wagering/paid-entry prize competition should remain disabled until the appropriate legal/compliance review and age controls are in place.

## Next build phases

The schema is ready to expand into shops, player businesses, jobs, housing, phone upgrades, billboard auctions, social/chat, Vibe feed, Telegram integration, moderated user uploads, and Paystack purchase flows.
