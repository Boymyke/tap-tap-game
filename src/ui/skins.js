// Tap-pad skins and shapes, drawn in the flat-vector style.
import { esc } from './theme.js';

const ART = {
  boy: '<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="48" r="26" fill="#8a5a3c"/><path d="M34 44c0-18 12-28 26-28s26 10 26 28c-6-8-16-10-26-10s-20 2-26 10z" fill="#1a1a1a"/><circle cx="51" cy="50" r="3.2" fill="#111"/><circle cx="69" cy="50" r="3.2" fill="#111"/><path d="M51 61c5 4 13 4 18 0" stroke="#111" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M22 116c2-24 18-36 38-36s36 12 38 36z" fill="#2a39d1"/><path d="M48 82l12 12 12-12" fill="#fff"/></svg>',
  girl: '<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="32" cy="28" r="13" fill="#1a1a1a"/><circle cx="88" cy="28" r="13" fill="#1a1a1a"/><circle cx="60" cy="50" r="26" fill="#7a4a2c"/><path d="M34 46c0-18 12-26 26-26s26 8 26 26c-8-10-18-12-26-12s-18 2-26 12z" fill="#1a1a1a"/><circle cx="51" cy="52" r="3.2" fill="#111"/><circle cx="69" cy="52" r="3.2" fill="#111"/><path d="M51 63c5 4 13 4 18 0" stroke="#111" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="44" cy="60" r="4" fill="#ff8aa0" opacity=".6"/><circle cx="76" cy="60" r="4" fill="#ff8aa0" opacity=".6"/><path d="M22 116c2-24 18-36 38-36s36 12 38 36z" fill="#e2802a"/></svg>',
  star: '<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M60 8l15 33 36 4-27 24 8 36-32-19-32 19 8-36L9 45l36-4z" fill="#fff6c8" stroke="#b38b14" stroke-width="5" stroke-linejoin="round"/></svg>',
  bolt: '<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M70 6L24 68h30l-8 46 50-64H64z" fill="#5dff4a" stroke="#0d5226" stroke-width="5" stroke-linejoin="round"/></svg>'
};
const KENTE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect width='48' height='48' fill='%23d8a73a'/%3E%3Crect width='48' height='8' y='0' fill='%231c5a33'/%3E%3Crect width='48' height='4' y='12' fill='%23e2802a'/%3E%3Crect width='8' height='48' x='20' fill='%23ff2600' fill-opacity='.55'/%3E%3Crect width='48' height='8' y='28' fill='%231c5a33'/%3E%3Crect width='4' height='48' x='40' fill='%2306140b' fill-opacity='.6'/%3E%3C/svg%3E\")";

export const SHAPES = { rect: '18px', rounded: '44px', circle: '50%', hex: '18px', blob: '42% 58% 52% 48% / 45% 40% 60% 55%' };

export function padLook(skinConfig = {}, prefs = {}, poolTheme = null, poolSkin = null) {
  const bg = prefs.padColor || poolTheme || skinConfig.bg || '#1c5a33';
  const shape = SHAPES[prefs.shape] ? prefs.shape : 'rect';
  const image = poolSkin || skinConfig.image || null;
  const style = [`--c:${bg}`, `--cd:color-mix(in srgb, ${bg} 70%, #000)`, `border-radius:${SHAPES[shape]}`];
  if (skinConfig.pattern === 'kente') style.push(`background:${KENTE} 0 0/48px 48px`);
  if (image) style.push(`background:linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.35)),url('${esc(image)}') center/cover`);
  return {
    style: style.join(';'),
    cls: `shape-${shape}${skinConfig.glow ? ' glow' : ''}`,
    art: !image && ART[skinConfig.art] ? `<div class="pad-art">${ART[skinConfig.art]}</div>` : ''
  };
}

export function skinPreview(cfg = {}) {
  const look = padLook(cfg, {});
  return `<div class="tcard skin-prev ${look.cls}" style="${look.style}">${look.art}<span>TAP</span></div>`;
}
