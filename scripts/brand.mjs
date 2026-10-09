// Builds every Tap Am logo file from one source: the wordmark paths (logo-tapam.svg)
// and the "tap hand" mark drawn below.
//   node scripts/brand.mjs          (needs `sharp`: npm i -g sharp, or NODE_PATH to a global install)
// Writes SVGs to public/assets/brand/ and PNG icons to public/assets/icons/.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const ROOT = new URL('..', import.meta.url).pathname;
const BRAND = ROOT + 'public/assets/brand/';
const ICONS = ROOT + 'public/assets/icons/';
mkdirSync(BRAND, { recursive: true }); mkdirSync(ICONS, { recursive: true });

export const C = {
  grape: '#6A35FF', grapeLight: '#9161FF', grapeDeep: '#4B1FD8', night: '#1B0B4D',
  green: '#00FF6E', greenDeep: '#00C957', greenInk: '#00A84D',
  ink: '#150B33', sunny: '#FFD23F', pink: '#FF4FA3', sky: '#2E8BFF', tangerine: '#FF8A2A', cloud: '#F4F0FF', white: '#FFFFFF'
};

// ── wordmark ────────────────────────────────────────────────────────────────
const logo = readFileSync(ROOT + 'public/assets/logo-tapam.svg', 'utf8');
const paths = [...logo.matchAll(/<path d="([^"]+)"[^>]*fill="([^"]+)"/g)].map(m => ({ d: m[1], green: m[2] !== 'white' }));
const WM = { w: 141, h: 38 };
const wordmarkPaths = (tap, am, extra = '') => paths.map(p => `<path d="${p.d}" fill="${p.green ? am : tap}"${extra}/>`).join('');
const wordmark = (tap, am) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WM.w} ${WM.h}" width="${WM.w}" height="${WM.h}">${wordmarkPaths(tap, am)}</svg>`;
// Sticker: a thick white outline behind the letters, for photos and busy backgrounds.
const sticker = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 ${WM.w + 12} ${WM.h + 14}" width="${WM.w + 12}" height="${WM.h + 14}">
<g transform="translate(0 3)">${wordmarkPaths(C.ink, C.ink, ` stroke="${C.ink}" stroke-width="7" stroke-linejoin="round"`)}</g>
${wordmarkPaths(C.white, C.white, ` stroke="${C.white}" stroke-width="7" stroke-linejoin="round"`)}${wordmarkPaths(C.ink, C.greenInk)}</svg>`;

// ── the tap hand ────────────────────────────────────────────────────────────
// Drawn on a 512 grid, pointing up with the fingertip on a ripple (the "tap").
function handShapes({ skin = 'url(#skin)', nail = '#E4DAFF', fold = '#DCD0FF', cuff = C.green, cuffTop = C.greenDeep, mono = false } = {}) {
  const f = mono ? 'currentColor' : skin;
  const cutStroke = mono ? '#000' : fold;
  return `
    <rect x="170" y="404" width="178" height="84" rx="24" fill="${mono ? 'currentColor' : cuff}"/>
    ${mono ? '' : `<rect x="170" y="404" width="178" height="26" rx="13" fill="${cuffTop}"/>`}
    <rect x="166" y="232" width="190" height="196" rx="66" fill="${f}"/>
    <rect x="196" y="100" width="78" height="214" rx="39" fill="${f}"/>
    ${mono ? '' : `<rect x="214" y="116" width="42" height="40" rx="18" fill="${nail}"/>`}
    <rect x="258" y="228" width="112" height="66" rx="33" fill="${f}"/>
    <rect x="266" y="286" width="108" height="64" rx="32" fill="${f}"/>
    <rect x="266" y="342" width="98" height="60" rx="30" fill="${f}"/>
    <path d="M262 292h96M268 348h88" stroke="${cutStroke}" stroke-width="${mono ? 10 : 6}" stroke-linecap="round"/>
    <path d="M160 352c-4-26 14-44 40-48l78-14c22-4 40 10 42 30s-12 34-32 38l-84 16c-22 4-40-4-44-22z" fill="${mono ? 'currentColor' : '#fff'}" ${mono ? '' : ''}/>
    ${mono ? '' : `<path d="M196 368c26-6 60-12 90-18" stroke="${nail}" stroke-width="6" stroke-linecap="round" fill="none"/>`}
    ${mono ? '<path d="M402 404H120" stroke="#000" stroke-width="10"/>' : ''}`;
}
const ripples = (ring = C.green, outer = '#FFFFFF', sparks = C.sunny) => `
  <g fill="none" stroke-linecap="round">
    <circle cx="236" cy="108" r="46" stroke="${ring}" stroke-width="15"/>
    <circle cx="236" cy="108" r="82" stroke="${outer}" stroke-opacity=".4" stroke-width="9" stroke-dasharray="70 40" transform="rotate(-30 236 108)"/>
    <path d="M338 62l26-18M352 112h30M330 22l10-20" stroke="${sparks}" stroke-width="13"/>
  </g>`;

const DEFS = `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.grapeLight}"/><stop offset="1" stop-color="${C.grapeDeep}"/></linearGradient>
  <radialGradient id="glow" cx=".45" cy=".2" r=".55"><stop offset="0" stop-color="#C4ABFF" stop-opacity=".6"/><stop offset="1" stop-color="#C4ABFF" stop-opacity="0"/></radialGradient>
  <linearGradient id="skin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#ECE5FF"/></linearGradient>
  <filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#25087A" flood-opacity=".45"/></filter>
</defs>`;

// Full app icon: rounded square (the shape is applied by the OS for maskable icons).
const appIcon = ({ rounded = true, scale = 1, shadow = true } = {}) => {
  const t = scale === 1 ? '' : `transform="translate(${256 - 256 * scale} ${256 - 256 * scale}) scale(${scale})"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${DEFS}
  <rect width="512" height="512" ${rounded ? 'rx="114"' : ''} fill="url(#bg)"/><rect width="512" height="512" ${rounded ? 'rx="114"' : ''} fill="url(#glow)"/>
  <g ${t}>${ripples()}<g ${shadow ? 'filter="url(#sh)"' : ''} transform="rotate(-8 256 300)">${handShapes()}</g></g></svg>`;
};
// Flat favicon: no filters or gradients, bigger hand so it reads at 16–32px.
const favicon = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="120" fill="${C.grape}"/>
  <g transform="translate(-14 -6) scale(1.06)"><circle cx="236" cy="108" r="50" fill="none" stroke="${C.green}" stroke-width="22"/>
  <g transform="rotate(-8 256 300)">${handShapes({ skin: '#fff', nail: '#E4DAFF', fold: '#D2C3FF' })}</g></g></svg>`;
// One-colour mark (notification badge, themed icons, stamps). Cut lines become see-through.
const monoMark = (color, { withRipple = true } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
    ${withRipple ? '<circle cx="236" cy="108" r="46" fill="none" stroke="#fff" stroke-width="18"/><circle cx="236" cy="108" r="66" fill="none" stroke="#000" stroke-width="14"/>' : ''}
    <g transform="rotate(-8 256 300)">${handShapes({ mono: true }).replace(/currentColor/g, '#fff')}</g>
  </mask></defs>
  <rect width="512" height="512" fill="${color}" mask="url(#m)"/></svg>`;

// Lockups: icon + wordmark.
const inner = svg => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const lockup = (tap, am) => {
  const h = 120, wmScale = 76 / WM.h, wmW = WM.w * wmScale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${h + 24 + wmW} ${h}" width="${h + 24 + wmW}" height="${h}">
  <svg x="0" y="0" width="${h}" height="${h}" viewBox="0 0 512 512">${inner(appIcon())}</svg>
  <g transform="translate(${h + 24} ${(h - 76) / 2}) scale(${wmScale})">${wordmarkPaths(tap, am)}</g></svg>`;
};
const lockupStacked = (tap, am) => {
  const w = 300, icon = 150, wmScale = (w - 20) / WM.w, wmH = WM.h * wmScale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${icon + 18 + wmH}" width="${w}" height="${icon + 18 + wmH}">
  <svg x="${(w - icon) / 2}" y="0" width="${icon}" height="${icon}" viewBox="0 0 512 512">${inner(appIcon())}</svg>
  <g transform="translate(10 ${icon + 18}) scale(${wmScale})">${wordmarkPaths(tap, am)}</g></svg>`;
};

// Social share image (1200×630).
const og = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">${DEFS}
  <defs><linearGradient id="ogbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7B45FF"/><stop offset=".55" stop-color="#4B1FD8"/><stop offset="1" stop-color="#2A0F8F"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#ogbg)"/>
  <circle cx="1040" cy="90" r="220" fill="${C.pink}" opacity=".18"/><circle cx="120" cy="590" r="260" fill="${C.sky}" opacity=".22"/>
  <path d="M120 120l10 24 24 10-24 10-10 24-10-24-24-10 24-10z M1080 480l8 18 18 8-18 8-8 18-8-18-18-8 18-8z M640 90l6 14 14 6-14 6-6 14-6-14-14-6 14-6z" fill="${C.sunny}"/>
  <svg x="820" y="170" width="300" height="300" viewBox="0 0 512 512">${inner(appIcon())}</svg>
  <g transform="translate(90 190) scale(${430 / WM.w})">${wordmarkPaths('#fff', C.green)}</g>
  <text x="96" y="420" font-family="Rubik, Arial, sans-serif" font-weight="800" font-style="italic" font-size="40" fill="#fff">tap ammm jor, make you chop ammm</text>
  <text x="96" y="480" font-family="Rubik, Arial, sans-serif" font-weight="600" font-size="30" fill="#E6DCFF">Live tapping games · win sponsored pools</text></svg>`;

const files = {
  'icon.svg': appIcon(),
  'icon-flat.svg': favicon(),
  'mark-white.svg': monoMark('#FFFFFF'),
  'mark-ink.svg': monoMark(C.ink),
  'mark-green.svg': monoMark(C.green),
  'wordmark.svg': wordmark('#FFFFFF', C.green),
  'wordmark-ink.svg': wordmark(C.ink, C.greenInk),
  'wordmark-white.svg': wordmark('#FFFFFF', '#FFFFFF'),
  'wordmark-black.svg': wordmark('#000000', '#000000'),
  'wordmark-sticker.svg': sticker(),
  'lockup.svg': lockup('#FFFFFF', C.green),
  'lockup-ink.svg': lockup(C.ink, C.greenInk),
  'lockup-stacked.svg': lockupStacked('#FFFFFF', C.green),
  'og.svg': og()
};
for (const [name, svg] of Object.entries(files)) writeFileSync(BRAND + name, svg);
writeFileSync(ROOT + 'public/favicon.svg', favicon());

const png = (svg, size, out, opts = {}) => sharp(Buffer.from(svg), { density: Math.max(72, Math.ceil(72 * size / 512) * 2) }).resize(size, size).png({ compressionLevel: 9, palette: opts.palette ?? false }).toFile(out);
await Promise.all([
  png(appIcon(), 512, ICONS + 'icon-512.png'),
  png(appIcon(), 192, ICONS + 'icon-192.png'),
  png(appIcon({ rounded: false }), 180, ICONS + 'apple-touch-icon.png'),
  png(appIcon({ rounded: false, scale: 0.78 }), 512, ICONS + 'maskable-512.png'),
  png(appIcon({ rounded: false, scale: 0.78 }), 192, ICONS + 'maskable-192.png'),
  png(monoMark('#FFFFFF'), 96, ICONS + 'badge-96.png'),
  png(monoMark('#FFFFFF', { withRipple: true }), 512, ICONS + 'monochrome-512.png'),
  png(favicon(), 32, ICONS + 'favicon-32.png'),
  png(favicon(), 16, ICONS + 'favicon-16.png'),
  png(favicon(), 48, ICONS + 'favicon-48.png'),
  sharp(Buffer.from(og()), { density: 144 }).resize(1200, 630).png({ compressionLevel: 9 }).toFile(ICONS + 'og-1200x630.png'),
  sharp(Buffer.from(lockup('#FFFFFF', C.green)), { density: 300 }).png().toFile(BRAND + 'lockup.png'),
  sharp(Buffer.from(wordmark('#FFFFFF', C.green)), { density: 600 }).png().toFile(BRAND + 'wordmark.png'),
  sharp(Buffer.from(wordmark(C.ink, C.greenInk)), { density: 600 }).png().toFile(BRAND + 'wordmark-ink.png'),
  sharp(Buffer.from(sticker()), { density: 600 }).png().toFile(BRAND + 'wordmark-sticker.png')
]);
console.log('brand files written:', Object.keys(files).length, 'svg + icons');
