# Tap Am brand guidelines

The source of truth for every logo file is `scripts/brand.mjs` (`npm run brand` regenerates them all).
Files live in `public/assets/brand/` (SVG + PNG) and `public/assets/icons/` (app icons).

## Personality
Loud, playful, Naija. "Sticker pop": chunky rounded shapes, thick ink outlines, hard drop shadows, bright flat colours.
Copy is light Pidgin — friendly, short, never mocking. Money copy is always plain English and exact.

## Logo suite

| File | Use |
| --- | --- |
| `icon.svg` | App icon — the white tapping hand on grape, with a green tap ring. Home screen, store listings. |
| `icon-flat.svg` | Same icon without the shine, for tiny sizes and print. |
| `mark-white.svg` / `mark-ink.svg` / `mark-green.svg` | The hand on its own (no tile). Stickers, loaders, watermarks. |
| `wordmark.svg` | "tap" white + "am" green. Default on dark or coloured backgrounds. |
| `wordmark-ink.svg` | Ink + grape, for white/light backgrounds. |
| `wordmark-white.svg` / `wordmark-black.svg` | One-colour versions (print, embossing, single-colour merch). |
| `wordmark-sticker.svg` | Wordmark in a white sticker outline, for busy photos and merch. |
| `lockup.svg` / `lockup-ink.svg` | Icon + wordmark side by side. |
| `lockup-stacked.svg` | Icon above wordmark, for square spaces. |
| `og.svg` → `icons/og-1200x630.png` | Social share image. |
| `icons/maskable-*.png`, `monochrome-512.png`, `badge-96.png` | Android adaptive/monochrome icons and notification badge. |

**Rules**
- Clear space around any logo = the height of the "a" in the wordmark. Minimum wordmark width 72px; icon 24px (use `icon-flat` below 48px).
- Don't recolour, stretch, rotate, outline again or add effects. Don't put the white wordmark on light backgrounds.
- Never flip or rotate the hand.

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
The landing page picks a random theme and tap-card colour on each visit.

## Type
- **Rubik** for everything (Google Fonts, weights 400–900, with system fallbacks).
- Headlines: Rubik 900, tight leading (0.95–1.05). Body: Rubik 400/600, 16px, leading 1.45.
- White text on colour always gets a hard black shadow with no blur: `0 1.5px 0 rgba(0,0,0,.6)` (big text: `0 3px 0 rgba(0,0,0,.45)`).
- Numbers: short form in tight spaces (`2m`, `25k`), full form with commas in money fields (`₦250,000`).
- 7-segment green digits are reserved for live counters (timer, taps, people online).

## Shapes and components
- Corners: 22–28px on cards, pills fully round. Buttons have a 4–6px hard bottom shadow and press down on tap.
- Cards are flat colour with a 3px white or ink border; no gradients on text.
- "VS" is a tilted ink sticker with sunny text.

## Characters and badges
- Bitmoji-style avatars are generated in code (`src/ui/avatar.js`) — 20 rank looks, one per rank tier, growing more flashy at higher ranks.
- Tapper-of-the-period badges: Day (sky), Week (green), Month (pink), Year (gold) and All-time "G.O.A.T" (grape) — a star rosette with ribbons.
- Stickers: sparkle, coin, bolt, fire, lock. Use one or two per screen, never as body copy.

## Rank names
Ranks use Nigerian slang only (Fresh Finger → JJC → Danfo Tapper → … → Odogwu → Tap Am Legend). The words Lapo, Mapo and Nepo are reserved for membership tiers and can't be used as rank names (enforced by the admin API).

## Motion and sound
- Animations use transform/opacity only; respect `prefers-reduced-motion`.
- Tap sounds are synthesised in the browser (no audio files). Every screen with sound has a mute button.
