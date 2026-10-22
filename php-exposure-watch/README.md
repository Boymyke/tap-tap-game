# PHP Exposure Watch — Nigeria

A single-file, self-contained public-interest **awareness** dashboard about outdated /
end-of-life PHP across the Nigerian web, with a **check-your-own-site** helper and real
remediation guidance.

Open `index.html` in any browser — no build step, no dependencies.

## Deploy to Vercel
No build config needed — it's a static file.

**Option A — dashboard (no merge required):**
1. vercel.com → **Add New → Project** → import `Boymyke/tap-tap-game`.
2. Under **Git Branch**, pick `claude/sweet-galileo-aok7g4` (or merge to `main` first).
3. **Root Directory** → set to `php-exposure-watch`.
4. Framework preset: **Other**. Leave build/output empty. **Deploy**.

**Option B — CLI:** `cd php-exposure-watch && npx vercel --prod`

## Visits counter
The green **LIVE** pill in the header shows a pulsing dot always, and upgrades to a real
visit count when it can reach a counter endpoint. It counts **page loads** ("visits"), not
unique visitors, and if the request fails it silently stays as "LIVE" — it never shows a
fabricated number.

- **Default:** a free, no-signup, CORS-enabled hit counter (`abacus.jasoncameron.dev`).
  The namespace is public, so change the key in `index.html` (`ENDPOINT=...`) to a private
  random string if you want your count kept separate.
- **Own the data instead:** point `ENDPOINT` at your own Vercel Serverless Function backed
  by Vercel KV / Upstash Redis (a few lines: `INCR` a key, return `{"value": n}` with
  `Access-Control-Allow-Origin`). Ask and I'll scaffold `api/count.js` + `vercel.json`.

## What it is
- Plain-language explanation of why unsupported PHP = unpatched PHP.
- **Factual** PHP branch support dates (verify against php.net/supported-versions).
- A self-service helper that builds copy-paste `curl` / `php -v` checks for a domain
  **you own**, plus links to passive fingerprinting services.
- Step-by-step migration and mitigation guidance.
- Neobrutalist design, responsive, light/dark aware.

## What it deliberately is NOT
- It is **not** a scanner and runs no exploit code.
- It does **not** publish a searchable directory of named organisations and their live
  vulnerabilities. A per-organisation vulnerability index is a targeting aid, not a public
  good — so this tool stays on the awareness + self-help side of that line.

## Every figure is sourced and dated
All quantitative claims are backed by primary sources and carry an inline citation plus a
`Sources` section. Verified on **2026-10-22**:

- **PHP usage + version split** — [W3Techs](https://w3techs.com/technologies/details/pl-php)
  (global: PHP = 69.3% of sites with a known server-side language; of PHP sites, v8 65.3% /
  v7 26.9% / v5 7.7% / v4 0.1%).
- **Support / end-of-life dates** — [php.net/supported-versions](https://www.php.net/supported-versions.php)
  and [php.net/eol](https://www.php.net/eol.php), cross-checked against
  [endoflife.date/php](https://endoflife.date/php).

The usage data is **global**, not a Nigeria-specific measurement, and is labelled as such on
the page. W3Techs updates daily, so re-verify before citing. Any Nigeria-specific figure
added later must be **aggregate percentages only** (never a per-organisation index) and must
carry its own source and date.

## Ethics
Only test infrastructure you own or are explicitly authorised to assess. Version banners can
be wrong (hidden headers, backported distro security patches), so confirm on the server
itself before acting.
