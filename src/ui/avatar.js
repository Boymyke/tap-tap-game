// Tap Am characters: flat "bitmoji-style" avatars with thick ink outlines, drawn as tiny inline SVGs.
// Used for rank characters, player avatars, badges and empty states. No image files to download.

const INK = '#150B33';
const SKINS = ['#7A4A2A', '#8D5524', '#A0662F', '#5C3A21', '#C68642', '#6B3E22'];
const HAIRC = ['#1A1110', '#2B1A12', '#3A2416', '#141019'];
const SHIRTS = ['#00FF6E', '#FF4FA3', '#2E8BFF', '#FFD23F', '#FF8A2A', '#9161FF', '#FFFFFF', '#21D4C8'];
const BGS = ['#FFD23F', '#2E8BFF', '#FF4FA3', '#00E07A', '#FF8A2A', '#9161FF', '#21D4C8', '#F4F0FF'];

const s = (w = 3.2) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

function hair(style, c) {
  switch (style) {
    case 'afro': return { back: `<circle cx="60" cy="38" r="35" fill="${c}" ${s()}/>`, front: `<path d="M35 46c2-16 12-24 25-24s24 8 26 24c-8-7-16-9-26-9s-18 2-25 9z" fill="${c}" ${s()}/>` };
    case 'puffs': return { back: `<circle cx="31" cy="30" r="13" fill="${c}" ${s()}/><circle cx="89" cy="30" r="13" fill="${c}" ${s()}/>`, front: `<path d="M36 47c1-15 11-23 24-23s23 8 24 23c-7-8-15-10-24-10s-17 2-24 10z" fill="${c}" ${s()}/>` };
    case 'braids': return { back: `<path d="M34 46c-4 18-2 34 2 44M86 46c4 18 2 34-2 44" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round"/>`, front: `<path d="M35 48c0-17 11-26 25-26s25 9 25 26c-6-5-10-11-12-16-6 6-16 8-26 8-5 0-9 3-12 8z" fill="${c}" ${s()}/><path d="M48 26l-2 12M60 24v13M72 26l2 12" stroke="#000" stroke-opacity=".35" stroke-width="2"/>` };
    case 'gele': return { back: '', front: `<path d="M30 42c2-20 16-28 30-28s30 6 32 26c-6-2-10 2-14 6-6-6-14-8-18-8s-14 2-20 8c-4-4-6-6-10-4z" fill="#FF4FA3" ${s()}/><path d="M64 14c10-8 24-6 28 4-8 0-14 4-18 10" fill="#FF4FA3" ${s()}/><path d="M38 30c8-6 16-8 22-8M66 22c6 0 14 4 18 10" stroke="#FFD23F" stroke-width="3" fill="none"/>` };
    case 'cap': return { back: '', front: `<path d="M34 46c0-16 11-25 26-25s26 9 26 25z" fill="#2E8BFF" ${s()}/><path d="M80 44c10 0 18 2 22 6-6 2-14 2-22 0z" fill="#2E8BFF" ${s()}/><circle cx="60" cy="22" r="3" fill="#FFD23F" ${s(2)}/>` };
    case 'locs': return { back: `<path d="M33 46v26M40 50v28M80 50v28M87 46v26" stroke="${c}" stroke-width="7" stroke-linecap="round"/>`, front: `<path d="M34 48c0-17 11-26 26-26s26 9 26 26c-5-6-12-9-14-13-4 5-8 6-12 6s-10-1-12-6c-4 5-9 8-14 13z" fill="${c}" ${s()}/>` };
    case 'fade': return { back: '', front: `<path d="M37 44c0-14 9-22 23-22s23 8 23 22c-6-4-14-6-23-6s-17 2-23 6z" fill="${c}" ${s()}/>` };
    case 'bun': return { back: `<circle cx="60" cy="16" r="10" fill="${c}" ${s()}/>`, front: `<path d="M35 46c1-15 11-23 25-23s24 8 25 23c-8-8-16-10-25-10s-17 2-25 10z" fill="${c}" ${s()}/>` };
    case 'bald': return { back: '', front: '<path d="M48 30c4-2 10-3 14-2" stroke="#fff" stroke-opacity=".45" stroke-width="3" fill="none" stroke-linecap="round"/>' };
    default: return { back: '', front: `<path d="M37 45c0-15 10-23 23-23s23 8 23 23c-7-5-15-7-23-7s-16 2-23 7z" fill="${c}" ${s()}/>` };   // low cut
  }
}

function face(mood, eyes) {
  const shades = eyes === 'shades';
  const e = shades
    ? `<path d="M38 50h44v6c0 6-4 9-10 9s-9-3-10-8c-1 5-4 8-10 8s-14-3-14-9z" fill="${INK}"/><path d="M42 53l6 0M66 53l6 0" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>`
    : `<ellipse cx="50" cy="54" rx="5.5" ry="6.5" fill="#fff" ${s(2.4)}/><ellipse cx="70" cy="54" rx="5.5" ry="6.5" fill="#fff" ${s(2.4)}/><circle cx="51" cy="55" r="3" fill="${INK}"/><circle cx="71" cy="55" r="3" fill="${INK}"/><circle cx="52" cy="53.5" r="1" fill="#fff"/><circle cx="72" cy="53.5" r="1" fill="#fff"/>`;
  const brows = shades ? '' : mood === 'fierce' ? `<path d="M43 45l11 3M77 45l-11 3" ${s(3)} fill="none"/>` : `<path d="M44 45c3-2 7-2 10 0M66 45c3-2 7-2 10 0" ${s(3)} fill="none"/>`;
  const mouth = mood === 'grin' ? `<path d="M49 66c3 6 19 6 22 0z" fill="#fff" ${s(2.6)}/>`
    : mood === 'wow' ? `<ellipse cx="60" cy="68" rx="5" ry="6" fill="#7A1F3D" ${s(2.6)}/>`
    : mood === 'smirk' ? `<path d="M52 67c6 3 12 2 17-3" ${s(3)} fill="none"/>`
    : mood === 'fierce' ? `<path d="M50 67c5 4 15 4 20 0" ${s(3)} fill="none"/><path d="M55 67h10" stroke="#fff" stroke-width="2"/>`
    : `<path d="M50 65c4 5 16 5 20 0" ${s(3)} fill="none"/>`;
  return `${e}${brows}${mouth}<circle cx="42" cy="63" r="3.5" fill="#FF4FA3" opacity=".45"/><circle cx="78" cy="63" r="3.5" fill="#FF4FA3" opacity=".45"/>`;
}

function extras(list = []) {
  const out = { back: '', front: '' };
  for (const x of list) {
    if (x === 'headphones') { out.back += `<path d="M30 56c0-22 13-34 30-34s30 12 30 34" fill="none" stroke="${INK}" stroke-width="5"/>`; out.front += `<rect x="25" y="50" width="11" height="18" rx="5" fill="#00FF6E" ${s(2.6)}/><rect x="84" y="50" width="11" height="18" rx="5" fill="#00FF6E" ${s(2.6)}/>`; }
    if (x === 'chain') out.front += `<path d="M44 92c6 8 26 8 32 0" fill="none" stroke="#FFD23F" stroke-width="4"/><circle cx="60" cy="101" r="5" fill="#FFD23F" ${s(2.2)}/>`;
    if (x === 'crown') out.front += `<path d="M36 30l5-24 11 13 8-17 8 17 11-13 5 24z" fill="#FFD23F" ${s(2.8)}/><circle cx="60" cy="20" r="3.5" fill="#FF4FA3" ${s(1.8)}/>`;
    if (x === 'earrings') out.front += `<circle cx="34" cy="66" r="3.5" fill="#FFD23F" ${s(2)}/><circle cx="86" cy="66" r="3.5" fill="#FFD23F" ${s(2)}/>`;
    if (x === 'star') out.front += `<path d="M96 22l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#FFD23F" ${s(2)}/>`;
    if (x === 'mic') out.front += `<rect x="86" y="72" width="10" height="20" rx="5" fill="#C9C3E6" ${s(2.4)} transform="rotate(20 91 82)"/><path d="M84 92l-6 12" ${s(3)}/>`;
    if (x === 'bolt') out.front += `<path d="M98 16l-10 14h7l-4 12 11-16h-7z" fill="#00FF6E" ${s(2)}/>`;
    if (x === 'agbada') out.front += `<path d="M30 120c4-16 14-26 30-26s26 10 30 26" fill="none" stroke="#FFD23F" stroke-width="3" stroke-dasharray="4 4"/>`;
  }
  return out;
}

// cfg: { skin, hair, hairColor, shirt, bg, mood, eyes, extras: [] }
let seq = 0;
export function avatarSvg(cfg = {}, { size = 64, title = '', ring = '' } = {}) {
  const id = 'avc' + (++seq % 100000);
  const skin = cfg.skin || SKINS[1], hc = cfg.hairColor || HAIRC[0];
  const h = hair(cfg.hair || 'low', hc), x = extras(cfg.extras);
  const bg = cfg.bg || BGS[0];
  return `<svg class="ava" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${title || 'Avatar'}" ${ring ? `style="--ring:${ring}"` : ''}>
<defs><clipPath id="${id}"><circle cx="60" cy="60" r="58"/></clipPath></defs>
<circle cx="60" cy="60" r="58" fill="${bg}"/>
<g clip-path="url(#${id})">${h.back}${x.back}
<path d="M24 124c2-20 16-32 36-32s34 12 36 32z" fill="${cfg.shirt || SHIRTS[0]}" ${s()}/>
<path d="M52 84h16v12c-4 3-12 3-16 0z" fill="${skin}" ${s()}/>
<ellipse cx="33" cy="58" rx="5" ry="7" fill="${skin}" ${s()}/><ellipse cx="87" cy="58" rx="5" ry="7" fill="${skin}" ${s()}/>
<path d="M35 50c0-17 11-27 25-27s25 10 25 27v8c0 16-11 28-25 28S35 74 35 58z" fill="${skin}" ${s()}/>
${face(cfg.mood, cfg.eyes)}${h.front}${x.front}</g>
<circle cx="60" cy="60" r="58" fill="none" stroke="${INK}" stroke-width="3.5"/></svg>`;
}

// Deterministic avatar for any player from their nickname (until they pick their own).
export function avatarFor(name = '', extra = []) {
  let h = 2166136261;
  for (const ch of String(name).toLowerCase()) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const pick = (arr, k) => arr[(h >>> k) % arr.length];
  const hairs = ['low', 'afro', 'puffs', 'braids', 'gele', 'cap', 'locs', 'fade', 'bun', 'bald'];
  return { skin: pick(SKINS, 1), hair: pick(hairs, 4), hairColor: pick(HAIRC, 8), shirt: pick(SHIRTS, 11), bg: pick(BGS, 15), mood: pick(['smile', 'grin', 'smirk', 'smile'], 19), eyes: (h >>> 23) % 7 === 0 ? 'shades' : 'eyes', extras: extra };
}

// One character per rank tier (20 tiers × 5 levels). Props get louder as you climb.
export const RANK_LOOKS = [
  { hair: 'low', shirt: '#FFFFFF', bg: '#F4F0FF', mood: 'smile' },                                 // Fresh Finger
  { hair: 'fade', shirt: '#21D4C8', bg: '#FFD23F', mood: 'wow' },                                  // JJC
  { hair: 'cap', shirt: '#FFD23F', bg: '#2E8BFF', mood: 'grin' },                                  // Danfo Tapper
  { hair: 'puffs', shirt: '#00FF6E', bg: '#FF8A2A', mood: 'smile' },                               // Keke Rider
  { hair: 'locs', shirt: '#FF8A2A', bg: '#21D4C8', mood: 'smirk' },                                // Molue Master
  { hair: 'fade', shirt: '#2E8BFF', bg: '#FFD23F', mood: 'fierce', extras: ['bolt'] },             // Agbero
  { hair: 'cap', shirt: '#150B33', bg: '#FF4FA3', mood: 'smirk', eyes: 'shades' },                 // Area Boy
  { hair: 'gele', shirt: '#FFD23F', bg: '#00E07A', mood: 'grin', extras: ['earrings'] },           // Mama Put Regular
  { hair: 'afro', shirt: '#FF4FA3', bg: '#9161FF', mood: 'grin', extras: ['headphones'] },         // Gbedu Starter
  { hair: 'gele', shirt: '#9161FF', bg: '#FFD23F', mood: 'smile', extras: ['earrings', 'star'] },   // Owambe Guest
  { hair: 'low', shirt: '#150B33', bg: '#00E07A', mood: 'smirk', eyes: 'shades', extras: ['chain'] }, // Big Boy
  { hair: 'afro', shirt: '#FFD23F', bg: '#FF4FA3', mood: 'grin', extras: ['chain', 'headphones'] }, // Para Para Boy
  { hair: 'fade', shirt: '#2E8BFF', bg: '#FFD23F', mood: 'smirk', extras: ['agbada', 'chain'] },    // Chairman
  { hair: 'bald', shirt: '#9161FF', bg: '#21D4C8', mood: 'grin', eyes: 'shades', extras: ['chain'] }, // Oga Patapata
  { hair: 'locs', shirt: '#FF8A2A', bg: '#150B33', mood: 'fierce', extras: ['chain', 'mic'] },      // Baba Nla
  { hair: 'cap', shirt: '#00FF6E', bg: '#9161FF', mood: 'grin', eyes: 'shades', extras: ['chain', 'star'] }, // Ijoba
  { hair: 'afro', shirt: '#FF4FA3', bg: '#FFD23F', mood: 'fierce', extras: ['chain', 'bolt'] },    // Odogwu
  { hair: 'braids', shirt: '#2E8BFF', bg: '#00E07A', mood: 'grin', extras: ['earrings', 'chain', 'star'] }, // Eko Akete
  { hair: 'puffs', shirt: '#FFD23F', bg: '#FF4FA3', mood: 'grin', eyes: 'shades', extras: ['chain', 'mic', 'star'] }, // Ogbonge
  { hair: 'afro', shirt: '#FFD23F', bg: '#9161FF', mood: 'grin', extras: ['crown', 'chain', 'star'] } // Tap Am Legend
];
export const rankLook = level => RANK_LOOKS[Math.min(RANK_LOOKS.length - 1, Math.max(0, Math.floor((Number(level || 1) - 1) / 5)))];
export const rankAvatar = (level, opts = {}) => avatarSvg({ skin: SKINS[(Math.floor((level - 1) / 5)) % SKINS.length], ...rankLook(level) }, opts);

// Badges: tapper of the day / week / month / year (and "all time" legend).
const BADGE = { DAY: ['#2E8BFF', 'DAY'], WEEK: ['#00C957', 'WEEK'], MONTH: ['#FF4FA3', 'MONTH'], YEAR: ['#FFB800', 'YEAR'], ALL: ['#9161FF', 'G.O.A.T'] };
export function badgeSvg(period, { size = 56 } = {}) {
  const [c, label] = BADGE[period] || BADGE.DAY;
  return `<svg class="badge-svg" viewBox="0 0 100 120" width="${size}" height="${size * 1.2}" role="img" aria-label="Tapper of the ${label.toLowerCase()}">
<path d="M30 70l-10 44 18-8 12 14 6-44zM70 70l10 44-18-8-12 14-6-44z" fill="${c}" ${s(3)}/>
<path d="M50 4l10 8 13-2 5 12 12 5-2 13 8 10-8 10 2 13-12 5-5 12-13-2-10 8-10-8-13 2-5-12-12-5 2-13-8-10 8-10-2-13 12-5 5-12 13 2z" fill="#FFD23F" ${s(3)}/>
<circle cx="50" cy="50" r="27" fill="${c}" ${s(3)}/>
<path d="M50 30l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" fill="#fff" ${s(2.4)}/>
<text x="50" y="76" text-anchor="middle" font-family="Rubik,Arial,sans-serif" font-weight="900" font-size="${label.length > 5 ? 9 : 11}" fill="#fff" stroke="${INK}" stroke-width="3" paint-order="stroke">${label}</text></svg>`;
}

// Small decorative stickers used around the UI.
export const STICKERS = {
  sparkle: (c = '#FFD23F') => `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2l5 13 13 5-13 5-5 13-5-13-13-5 13-5z" fill="${c}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/></svg>`,
  coin: () => `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="#FFD23F" stroke="${INK}" stroke-width="2.5"/><circle cx="20" cy="20" r="11" fill="none" stroke="#E0A800" stroke-width="2.5"/><text x="20" y="26" text-anchor="middle" font-family="Rubik,Arial,sans-serif" font-weight="900" font-size="16" fill="${INK}">₦</text></svg>`,
  bolt: () => `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M24 2L8 24h10l-4 14 18-24H22z" fill="#00FF6E" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/></svg>`,
  fire: () => `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3c2 8 12 12 12 22a12 12 0 01-24 0c0-6 4-9 6-12 1 4 3 6 5 6-1-6 0-11 1-16z" fill="#FF8A2A" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M20 22c3 3 5 5 5 8a5 5 0 01-10 0c0-3 3-5 5-8z" fill="#FFD23F"/></svg>`,
  lock: () => `<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="8" y="17" width="24" height="19" rx="5" fill="#FFD23F" stroke="${INK}" stroke-width="2.5"/><path d="M13 17v-4a7 7 0 0114 0v4" fill="none" stroke="${INK}" stroke-width="3"/><circle cx="20" cy="26" r="3" fill="${INK}"/></svg>`
};

// The tap hand mark (same drawing as the app icon), for inline use.
export const HAND_MARK = `<svg viewBox="0 0 512 512" aria-hidden="true"><g fill="none" stroke-linecap="round"><circle cx="236" cy="108" r="46" stroke="#00FF6E" stroke-width="18"/></g><g transform="rotate(-8 256 300)"><rect x="170" y="404" width="178" height="84" rx="24" fill="#00FF6E"/><rect x="166" y="232" width="190" height="196" rx="66" fill="#fff"/><rect x="196" y="100" width="78" height="214" rx="39" fill="#fff"/><rect x="214" y="116" width="42" height="40" rx="18" fill="#E4DAFF"/><rect x="258" y="228" width="112" height="66" rx="33" fill="#fff"/><rect x="266" y="286" width="108" height="64" rx="32" fill="#fff"/><rect x="266" y="342" width="98" height="60" rx="30" fill="#fff"/><path d="M262 292h96M268 348h88" stroke="#DCD0FF" stroke-width="6" stroke-linecap="round"/><path d="M160 352c-4-26 14-44 40-48l78-14c22-4 40 10 42 30s-12 34-32 38l-84 16c-22 4-40-4-44-22z" fill="#fff"/></g></svg>`;
