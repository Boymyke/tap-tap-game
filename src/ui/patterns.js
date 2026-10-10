// Tap-area patterns. Each one is drawn here as a small SVG (no image files) and laid over a colour,
// so the colour stays changeable: patternBg('flowers', '#FF4FA3').
// Light patterns use see-through white, animal prints use see-through black.

// Small seeded random so every build draws the same pattern.
function rand(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const f1 = n => Number(n.toFixed(1));

// Smooth closed blob around (cx, cy).
function blob(cx, cy, r, rnd, points = 7, wobble = 0.35) {
  const pts = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2, rr = r * (1 - wobble / 2 + rnd() * wobble);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  let d = `M${f1((pts[0][0] + pts[1][0]) / 2)} ${f1((pts[0][1] + pts[1][1]) / 2)}`;
  for (let i = 1; i <= points; i++) {
    const p = pts[i % points], n = pts[(i + 1) % points];
    d += `Q${f1(p[0])} ${f1(p[1])} ${f1((p[0] + n[0]) / 2)} ${f1((p[1] + n[1]) / 2)}`;
  }
  return d + 'Z';
}
// A wavy band across a tile `w` wide: repeats seamlessly left to right.
function band(y, thick, amp, w, waves = 1, phase = 0) {
  const steps = 24, top = [], bot = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w, s = Math.sin((i / steps) * Math.PI * 2 * waves + phase) * amp;
    top.push(`${f1(x)} ${f1(y + s)}`); bot.unshift(`${f1(x)} ${f1(y + thick + s)}`);
  }
  return `M${top.join('L')}L${bot.join('L')}Z`;
}
// Swirl: curved arms from the centre (drawn once, centred, no repeat).
function swirl(arms = 12) {
  const c = 100, R = 150, out = [];
  for (let i = 0; i < arms; i += 2) {
    const a = (i / arms) * Math.PI * 2, b = ((i + 1) / arms) * Math.PI * 2, tw = 0.9;
    const P = (ang, r) => `${f1(c + Math.cos(ang) * r)} ${f1(c + Math.sin(ang) * r)}`;
    out.push(`M${c} ${c}Q${P(a + tw, R * 0.55)} ${P(a, R)}L${P(b, R)}Q${P(b + tw, R * 0.55)} ${c} ${c}Z`);
  }
  return out.join('');
}
function daisy(cx, cy, r) {
  let d = '';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2, px = cx + Math.cos(a) * r * 0.55, py = cy + Math.sin(a) * r * 0.55;
    d += `<ellipse cx="${f1(px)}" cy="${f1(py)}" rx="${f1(r * 0.36)}" ry="${f1(r * 0.5)}" transform="rotate(${f1(a * 180 / Math.PI + 90)} ${f1(px)} ${f1(py)})"/>`;
  }
  return d;
}

const svg = (w, h, inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
const uri = s => `url('data:image/svg+xml,${encodeURIComponent(s).replace(/'/g, '%27')}')`;

const W = 'fill="#fff"', K = 'fill="#000"';
const draw = {
  waves: () => { const w = 96; let p = ''; for (let i = 0; i < 3; i++) p += `<path d="${band(i * 32 + 6, 9, 4, w, 2, 0)}"/>`; return { s: svg(w, 96, `<g ${W} fill-opacity=".2">${p}</g>`), size: '96px 96px' }; },
  flowers: () => ({ s: svg(72, 72, `<g ${W}>${daisy(18, 18, 14)}${daisy(54, 54, 14)}</g><g fill="#FFE7A3"><circle cx="18" cy="18" r="4.2"/><circle cx="54" cy="54" r="4.2"/></g>`), size: '72px 72px' }),
  swirl: () => ({ s: svg(200, 200, `<path ${W} fill-opacity=".28" d="${swirl(16)}"/>`), size: 'cover', pos: 'center', rep: 'no-repeat' }),
  checker: () => ({ s: svg(40, 40, `<g ${W} fill-opacity=".4"><rect width="20" height="20"/><rect x="20" y="20" width="20" height="20"/></g>`), size: '40px 40px' }),
  stripes: () => ({ s: svg(40, 40, `<path ${W} fill-opacity=".32" d="M0 40L40 0H20L0 20zM40 40V20L20 40z"/>`), size: '40px 40px' }),
  ripple: () => { const w = 160; let p = ''; for (let i = 0; i < 5; i++) p += `<path d="${band(i * 32, 16, 10, w, 1, 0)}"/>`; return { s: svg(w, 160, `<g ${W} fill-opacity=".22">${p}</g>`), size: '160px 160px' }; },
  cow: () => { const r = rand(7); let p = ''; [[18, 18, 11], [62, 22, 9], [40, 52, 13], [86, 58, 10], [16, 78, 8], [70, 92, 12], [100, 18, 7], [44, 100, 6]].forEach(([x, y, s]) => { p += blob(x, y, s, r, 8, 0.5); }); return { s: svg(112, 112, `<path ${K} fill-opacity=".72" d="${p}"/>`), size: '112px 112px' }; },
  leopard: () => { const r = rand(11); let g = ''; [[22, 22], [70, 30], [42, 70], [92, 82], [14, 96]].forEach(([x, y]) => { const rot = Math.floor(r() * 360); g += `<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="#000" stroke-opacity=".75" stroke-width="5" stroke-linecap="round" stroke-dasharray="11 5 8 6 10 7" transform="rotate(${rot} ${x} ${y})"/><path ${K} fill-opacity=".25" d="${blob(x, y, 5, r, 6, 0.4)}"/>`; }); g += `<g ${K} fill-opacity=".6"><circle cx="50" cy="12" r="2.5"/><circle cx="98" cy="50" r="2.5"/><circle cx="66" cy="104" r="2.5"/></g>`; return { s: svg(112, 112, g), size: '112px 112px' }; },
  zebra: () => { const w = 120; let p = ''; for (let i = 0; i < 6; i++) p += `<path d="${band(i * 24, 11, 9, w, 1, i * 0.7)}"/>`; return { s: svg(w, 144, `<g ${K} fill-opacity=".78">${p}</g>`), size: '120px 144px' }; },
  kente: () => ({ s: svg(48, 48, `<rect width="48" height="48" fill="#000" fill-opacity=".18"/><g fill="#FFD23F"><rect x="0" y="4" width="24" height="16"/><rect x="24" y="28" width="24" height="16"/></g><g fill="#00A84D"><rect x="24" y="4" width="24" height="5"/><rect x="24" y="15" width="24" height="5"/><rect x="0" y="28" width="24" height="5"/><rect x="0" y="39" width="24" height="5"/></g><g fill="#000" fill-opacity=".55"><rect x="0" y="22" width="48" height="4"/><rect x="0" y="46" width="48" height="2"/><rect x="22" y="4" width="2" height="16"/><rect x="46" y="28" width="2" height="16"/></g>`), size: '48px 48px' })
};

export const PATTERN_NAMES = { waves: 'Waves', flowers: 'Flowers', swirl: 'Swirl', checker: 'Checker', stripes: 'Stripes', ripple: 'Ripple', cow: 'Cow print', leopard: 'Leopard', zebra: 'Zebra', kente: 'Kente' };
export const PATTERNS = Object.fromEntries(Object.entries(draw).map(([k, fn]) => {
  const p = fn();
  return [k, { name: PATTERN_NAMES[k], size: p.size, pos: p.pos || '0 0', rep: p.rep || 'repeat', img: uri(p.s) }];
}));
export const PATTERN_KEYS = Object.keys(PATTERNS);
export const isPattern = k => Object.prototype.hasOwnProperty.call(PATTERNS, k);

// CSS `background` value: the pattern over a colour. Unknown or 'none' gives the plain colour.
export function patternBg(key, color = '#2E8BFF') {
  const p = isPattern(key) ? PATTERNS[key] : null;
  return p ? `${p.img} ${p.pos}/${p.size} ${p.rep},${color}` : color;
}
