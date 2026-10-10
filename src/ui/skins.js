// Tap-area skins: a colour plus a pattern (see patterns.js). No illustrations.
// Who decides the look, in order:
//   1. the pool's own tap area (sponsors, the admin, Nepo creators), unless the pool lets players use their own;
//   2. a Mapo/Nepo player's own colour + pattern (Bag → Your tap area);
//   3. the equipped skin.
import { esc } from './theme.js';
import { patternBg, isPattern } from './patterns.js';

const HEX = /^#[0-9a-fA-F]{6}$/;

// pool: { theme, padPattern, allowOwnPad } (from poolPublic) or null.  paid: Mapo/Nepo player.
export function resolvePad(skinConfig = {}, prefs = {}, pool = null, paid = false) {
  const poolSet = pool && (HEX.test(pool.theme || '') || isPattern(pool.padPattern));
  if (poolSet && !pool.allowOwnPad) return { bg: HEX.test(pool.theme || '') ? pool.theme : '#2E8BFF', pattern: isPattern(pool.padPattern) ? pool.padPattern : null, glow: false, from: 'pool' };
  let bg = HEX.test(skinConfig.bg || '') ? skinConfig.bg : '#2E8BFF';
  let pattern = isPattern(skinConfig.pattern) ? skinConfig.pattern : null;
  if (paid && prefs) {
    if (HEX.test(prefs.padColor || '')) bg = prefs.padColor;
    if (prefs.padPattern === 'none') pattern = null;
    else if (isPattern(prefs.padPattern)) pattern = prefs.padPattern;
  }
  return { bg, pattern, glow: !!skinConfig.glow, image: /^\/media\/[A-Za-z0-9/_.-]+$/.test(skinConfig.image || '') ? skinConfig.image : null, from: 'own' };
}

export function padLook(skinConfig = {}, prefs = {}, pool = null, paid = false) {
  const r = resolvePad(skinConfig, prefs, typeof pool === 'string' ? { theme: pool, allowOwnPad: false } : pool, paid);
  const style = [`--c:${r.bg}`, `--cd:color-mix(in srgb, ${r.bg} 62%, #000)`];
  if (r.image) style.push(`background:linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.35)),url('${esc(r.image)}') center/cover`);
  else style.push(`background:${patternBg(r.pattern, r.bg)}`);
  return { style: style.join(';'), cls: r.glow ? 'glow' : '', art: '', pattern: r.pattern, bg: r.bg, from: r.from };
}

export function skinPreview(cfg = {}) {
  const look = padLook(cfg, {});
  return `<div class="tcard skin-prev ${look.cls}" style="${look.style}"><span>TAP</span></div>`;
}
