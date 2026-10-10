# Tap Am brand guidelines

The source of truth for every logo file is `scripts/brand.mjs` (`npm run brand` regenerates them all).
Files live in `public/assets/brand/` (SVG + PNG) and `public/assets/icons/` (app icons).

## Personality
Loud, playful, Naija. Patterned playing cards, condensed type, hard drop shadows, bright flat colours.
Copy is light Pidgin — friendly, short, never mocking. Money copy is always plain English and exact.

## Logo suite

The three source files from the brand pack live in `public/assets/brand/src/` and everything else is made from them.

| File | Use |
| --- | --- |
| `src/logo-main.svg` | Master logo: "TAP" + green "AM" box. |
| `src/mark.svg` | Master logo mark: the green tapping finger. |
| `src/favicon.svg` | Master app icon: white finger on a green rounded square. |
| `logo.svg` / `logo.png` | "TAP" black. For white and light backgrounds. |
| `logo-white.svg` / `logo-white.png` | "TAP" white. Default on dark or coloured backgrounds (used across the app). |
| `logo-mono-white.svg` | One-colour white version (print, embossing). |
| `mark.svg` / `mark-white.svg` | The finger on its own. Share cards, error and offline pages, watermarks. |
| `app-icon.svg`, `/favicon.svg` | App icon and browser icon. |
| `og.svg` → `icons/og-1200x630.png` | Social share image. |
| `icons/maskable-*.png`, `monochrome-512.png`, `badge-96.png` | Android adaptive/monochrome icons and notification badge. |

**Rules**
- Clear space around the logo = the height of the "AM" box. Minimum logo width 72px; app icon 16px.
- Don't recolour, stretch, rotate, outline again or add effects. Don't put the white-"TAP" logo on light backgrounds.
- Never flip or rotate the finger.

## Colour

| Token | Hex | Role |
| --- | --- | --- |
| Grape | `#6A35FF` | Primary brand, default background |
| Tap green | `#00FF6E` | Main buttons, live state, "Ends in / Starts in" pills, money won |
| Ink | `#150B33` | Outlines, text on light, dark buttons |
| Sunny | `#FFD23F` | Highlights, Nepo badge, warnings |
| Pink | `#FF4FA3` | Notifications, playful accents |
| Sky | `#2E8BFF` | Info, Team 2 in VS pools |
| Tangerine | `#FF8A2A` | Sponsored, Team 1 in VS pools |

Ten Nepo app themes (Grape, Ocean, Lagoon, Jungle, Sunset, Bubblegum, Gold, Cocoa, Crimson, Midnight) are defined in `src/tiers.js`.
The landing page plays a short looping video behind everything (posters load first) and picks a random tap-card colour and pattern on each visit.
In-app backgrounds are a plain gradient (no stars); Nepo babies can change it. Login and sign-up use a slowly moving gradient.

## Type
- **Barlow Condensed** for headlines, buttons and numbers (600–900, italic 800–900); **Barlow** for body text (400–800). Google Fonts, with system fallbacks.
- Headlines: Barlow Condensed 900, tight leading (0.92–1.05). Body: Barlow 400/600, 16px, leading 1.45.
- White text on colour always gets a hard black shadow with no blur: `0 1.5px 0 rgba(0,0,0,.6)` (big text: `0 3px 0 rgba(0,0,0,.45)`).
- Numbers: short form in tight spaces (`2m`, `25k`), full form with commas in money fields (`₦250,000`).
- 7-segment green digits are reserved for live counters (timer, taps, people online).
- No emoji in the interface. The only emoji is a player's name emoji, given by the super admin.

## Shapes and components
- Corners: cards 18px, small cards 12px, buttons 12px, inputs 10px, tags 6px. Buttons have a 4–6px hard bottom shadow and press down on tap.
- Cards are flat colour with a tone-on-tone diamond texture and a 3px white border; no gradients on text.
- Tap areas are a colour plus a pattern (waves, flowers, swirl, checker, stripes, ripple, cow, leopard, zebra, kente), drawn in code in `src/ui/patterns.js`. Boy pad = blue waves, girl pad = pink flowers.
- "VS" is a tilted ink sticker with sunny text.

## Characters and badges
- Bitmoji-style avatars are generated in code (`src/ui/avatar.js`) — 20 rank looks, one per rank tier, growing more flashy at higher ranks.
- Tapper-of-the-period badges: Day (sky), Week (green), Month (pink), Year (gold) and All-time "G.O.A.T" (grape) — a star rosette with ribbons.
- Stickers: coin, bolt, fire, lock. Use one or two per screen, never as body copy. No stars or sparkles on backgrounds.
- Special badges: made by the super admin (name, 1–3 letter label, colour, meaning) and shown on the player's profile.

## Rank names
Ranks use Nigerian slang only (Fresh Finger → JJC → Danfo Tapper → … → Odogwu → Tap Am Legend). The words Lapo, Mapo and Nepo are reserved for membership tiers and can't be used as rank names (enforced by the admin API).

## Motion and sound
- Animations use transform/opacity only; respect `prefers-reduced-motion`.
- Tap sounds are synthesised in the browser (no audio files). Every screen with sound has a mute button.
