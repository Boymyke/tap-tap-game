// Builds every Tap Am logo file from the three source files in public/assets/brand/src:
//   logo-main.svg  "TAP" + green "AM" box
//   mark.svg       the green finger (logo mark)
//   favicon.svg    green rounded square with the white finger
//   node scripts/brand.mjs          (needs `sharp`: npm i -g sharp, or NODE_PATH to a global install)
// Writes SVGs to public/assets/brand/ and PNG icons to public/assets/icons/.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const ROOT = new URL('..', import.meta.url).pathname;
const SRC = ROOT + 'public/assets/brand/src/';
const BRAND = ROOT + 'public/assets/brand/';
const ICONS = ROOT + 'public/assets/icons/';
mkdirSync(BRAND, { recursive: true }); mkdirSync(ICONS, { recursive: true });

export const C = { green: '#006012', greenBright: '#00FF6E', ink: '#150B33', grape: '#6A35FF', grapeDeep: '#2A0F8F', white: '#FFFFFF' };

const read = name => readFileSync(SRC + name, 'utf8');
const pathsOf = svg => [...svg.matchAll(/<path([^>]*)\sd="([^"]+)"/g)].map(m => ({ cls: (m[1].match(/class="([^"]+)"/) || [])[1] || '', d: m[2] }));

// ── main logo ───────────────────────────────────────────────────────────────
const main = read('logo-main.svg');
const LOGO = { w: 119.79, h: 24.53 };
const box = (main.match(/<rect[^>]*>/) || [''])[0].replace(/class="[^"]*"/, '');
const mainPaths = pathsOf(main);
const logo = ({ tap = '#000', boxFill = C.green, am = '#fff' } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOGO.w} ${LOGO.h}" width="${LOGO.w * 2}" height="${LOGO.h * 2}">` +
  box.replace('<rect', `<rect fill="${boxFill}"`) +
  mainPaths.map(p => `<path fill="${p.cls === 'cls-2' ? am : tap}" d="${p.d}"/>`).join('') + '</svg>';

// ── mark (finger) ───────────────────────────────────────────────────────────
const MARK = { w: 35.22, h: 40.4 };
const markD = pathsOf(read('mark.svg'))[0].d;
const mark = (fill = C.green) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK.w} ${MARK.h}" width="${MARK.w * 4}" height="${MARK.h * 4}"><path fill="${fill}" d="${markD}"/></svg>`;

// ── app icon / favicon ──────────────────────────────────────────────────────
// Square tile with the finger centred. `pad` is the share of the tile left around the finger's height.
const tile = ({ size = 512, bg = C.green, fg = '#fff', rx = 0.166, fingerH = 0.62 } = {}) => {
  const h = size * fingerH, s = h / MARK.h, w = MARK.w * s;
  const x = (size - w) / 2 + w * 0.03, y = (size - h) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
    (bg ? `<rect width="${size}" height="${size}" rx="${size * rx}" fill="${bg}"/>` : '') +
    `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(4)})"><path fill="${fg}" d="${markD}"/></g></svg>`;
};
const favicon = read('favicon.svg');

// Social share image (1200×630): gradient, logo, finger and the landing line.
const inner = svg => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const og = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs><linearGradient id="ogbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7B45FF"/><stop offset=".55" stop-color="#4B1FD8"/><stop offset="1" stop-color="#2A0F8F"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#ogbg)"/>
  <svg x="90" y="150" width="520" height="${520 * LOGO.h / LOGO.w}" viewBox="0 0 ${LOGO.w} ${LOGO.h}">${inner(logo({ tap: '#fff' }))}</svg>
  <svg x="930" y="70" width="200" height="200" viewBox="0 0 512 512">${inner(tile())}</svg>
  <text x="94" y="380" font-family="Barlow Condensed, Arial Narrow, Arial, sans-serif" font-weight="900" font-style="italic" font-size="58" fill="#fff">Tap amm make you chop big moneyyy</text>
  <text x="96" y="446" font-family="Barlow, Arial, sans-serif" font-weight="600" font-size="32" fill="#E6DCFF">Tap and win big prizes. Free to start.</text>
  <text x="96" y="560" font-family="Barlow, Arial, sans-serif" font-weight="700" font-size="28" fill="#fff">www.tapammm.live</text></svg>`;

const files = {
  'logo.svg': logo({ tap: '#000' }),
  'logo-white.svg': logo({ tap: '#fff' }),
  'logo-mono-white.svg': logo({ tap: '#fff', boxFill: '#fff', am: C.ink }),
  'mark.svg': mark(C.green),
  'mark-white.svg': mark('#fff'),
  'app-icon.svg': favicon,
  'og.svg': og()
};
for (const [name, svg] of Object.entries(files)) writeFileSync(BRAND + name, svg);
writeFileSync(ROOT + 'public/favicon.svg', favicon);

const png = (svg, size, out) => sharp(Buffer.from(svg), { density: Math.max(72, Math.ceil(72 * size / 64)) }).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
await Promise.all([
  png(favicon, 512, ICONS + 'icon-512.png'),
  png(favicon, 192, ICONS + 'icon-192.png'),
  png(tile({ rx: 0, fingerH: 0.6 }), 180, ICONS + 'apple-touch-icon.png'),
  png(tile({ rx: 0, fingerH: 0.5 }), 512, ICONS + 'maskable-512.png'),
  png(tile({ rx: 0, fingerH: 0.5 }), 192, ICONS + 'maskable-192.png'),
  png(tile({ bg: null, fg: '#fff', fingerH: 0.8 }), 96, ICONS + 'badge-96.png'),
  png(tile({ bg: null, fg: '#fff', fingerH: 0.62 }), 512, ICONS + 'monochrome-512.png'),
  png(favicon, 48, ICONS + 'favicon-48.png'),
  png(favicon, 32, ICONS + 'favicon-32.png'),
  png(favicon, 16, ICONS + 'favicon-16.png'),
  sharp(Buffer.from(og()), { density: 144 }).resize(1200, 630).png({ compressionLevel: 9 }).toFile(ICONS + 'og-1200x630.png'),
  sharp(Buffer.from(files['logo.svg']), { density: 600 }).png().toFile(BRAND + 'logo.png'),
  sharp(Buffer.from(files['logo-white.svg']), { density: 600 }).png().toFile(BRAND + 'logo-white.png')
]);
console.log('brand files written:', Object.keys(files).length, 'svg + icons');
