// Tap-pad skins (colour + character art). Tap shapes were retired: the pad is always a rounded card.
import { esc } from './theme.js';
import { avatarSvg } from './avatar.js';

const INK = '#150B33';
const ART = {
  boy: () => avatarSvg({ hair: 'fade', skin: '#8D5524', shirt: '#FFD23F', bg: 'transparent', mood: 'grin' }, { size: 120, title: 'Boy' }),
  girl: () => avatarSvg({ hair: 'puffs', skin: '#7A4A2A', shirt: '#00FF6E', bg: 'transparent', mood: 'grin', extras: ['earrings'] }, { size: 120, title: 'Girl' }),
  star: () => `<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M60 8l15 33 36 4-27 24 8 36-32-19-32 19 8-36L9 45l36-4z" fill="#FFF3B0" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/></svg>`,
  bolt: () => `<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M70 6L24 68h30l-8 46 50-64H64z" fill="#5dff4a" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/></svg>`
};
const KENTE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect width='48' height='48' fill='%23FFB800'/%3E%3Crect width='48' height='8' y='0' fill='%2300A84D'/%3E%3Crect width='48' height='4' y='12' fill='%23FF8A2A'/%3E%3Crect width='8' height='48' x='20' fill='%23E2263F' fill-opacity='.6'/%3E%3Crect width='48' height='8' y='28' fill='%2300A84D'/%3E%3Crect width='4' height='48' x='40' fill='%23150B33' fill-opacity='.6'/%3E%3C/svg%3E\")";
const HEX = /^#[0-9a-fA-F]{6}$/;

// The pool's tap colour wins over the player's skin colour.
export function padLook(skinConfig = {}, prefs = {}, poolTheme = null) {
  const bg = HEX.test(poolTheme || '') ? poolTheme : HEX.test(skinConfig.bg || '') ? skinConfig.bg : '#2E8BFF';
  const image = /^\/media\/[A-Za-z0-9/_.-]+$/.test(skinConfig.image || '') ? skinConfig.image : null;
  const style = [`--c:${bg}`, `--cd:color-mix(in srgb, ${bg} 62%, #000)`];
  if (skinConfig.pattern === 'kente' && !poolTheme) style.push(`background:${KENTE} 0 0/48px 48px`);
  if (image && !poolTheme) style.push(`background:linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.35)),url('${esc(image)}') center/cover`);
  return {
    style: style.join(';'),
    cls: skinConfig.glow ? 'glow' : '',
    art: !image && ART[skinConfig.art] ? `<div class="pad-art">${ART[skinConfig.art]()}</div>` : ''
  };
}

export function skinPreview(cfg = {}) {
  const look = padLook(cfg, {});
  return `<div class="tcard skin-prev ${look.cls}" style="${look.style}">${look.art}<span>TAP</span></div>`;
}
