// The three player tiers and everything they unlock. The server enforces every rule here;
// pages only use it to show what is open, what is locked and why.
const num = (s, k, d) => (s && s[k] !== undefined && s[k] !== '' && !isNaN(+s[k]) ? +s[k] : d);

export const TIER_KEYS = ['LAPO', 'MAPO', 'NEPO'];
const ORDER = { LAPO: 0, MAPO: 1, NEPO: 2 };

// Active tier of a user (expired paid tiers fall back to Lapo). Non-players have no tier.
export function tierOf(u) {
  if (!u || u.role !== 'USER') return null;
  const t = u.tier === 'NEPO' || u.tier === 'MAPO' ? u.tier : 'LAPO';
  if (t === 'LAPO') return 'LAPO';
  return !u.tier_until || Date.parse(u.tier_until) > Date.now() ? t : 'LAPO';
}
export const atLeast = (u, t) => ORDER[tierOf(u) || 'LAPO'] >= ORDER[t];
export const isNepo = u => tierOf(u) === 'NEPO';
export const isPaid = u => atLeast(u, 'MAPO');
export const tierName = t => ({ LAPO: 'Lapo baby', MAPO: 'Mapo baby', NEPO: 'Nepo baby' }[t] || '');

// Feature matrix. Numbers that the admin can change come from settings.
export function perks(t, s = {}) {
  const tier = TIER_KEYS.includes(t) ? t : 'LAPO';
  const base = {
    LAPO: { fingers: 1, rate: num(s, 'tap_rate_lapo', 15), pools: 1, create: true, createPerDay: num(s, 'lapo_pools_per_day', 3), calc: false, sounds: false, themes: false, backgrounds: false, gift: false, voice: false, uploads: false, minWithdraw: num(s, 'min_withdraw_lapo_kobo', 1000000) },
    MAPO: { fingers: 3, rate: num(s, 'tap_rate_mapo', 25), pools: num(s, 'max_multi_pools_mapo', 3), create: true, calc: true, sounds: true, themes: false, backgrounds: false, gift: false, voice: false, uploads: false, minWithdraw: num(s, 'min_withdraw_mapo_kobo', 750000) },
    NEPO: { fingers: 0, rate: num(s, 'tap_rate_nepo', 40), pools: num(s, 'max_multi_pools', 10), create: true, calc: true, sounds: true, themes: true, backgrounds: true, gift: true, voice: true, uploads: true, minWithdraw: num(s, 'min_withdraw_nepo_kobo', 500000) }
  }[tier];
  return { tier, ...base };
}

export const PLANS = s => ({
  MAPO: { month: { kobo: num(s, 'mapo_monthly_kobo', 350000), days: 30 }, year: { kobo: num(s, 'mapo_yearly_kobo', 3500000), days: 365 }, bonus: num(s, 'mapo_bonus_boosters', 3) },
  NEPO: { month: { kobo: num(s, 'nepo_monthly_kobo', 5000000), days: 30 }, year: { kobo: num(s, 'nepo_yearly_kobo', 50000000), days: 365 }, bonus: num(s, 'nepo_bonus_boosters', 5) }
});

// Rows for the price comparison table.
export function comparison(s) {
  const L = perks('LAPO', s), M = perks('MAPO', s), N = perks('NEPO', s), naira = k => '₦' + (k / 100).toLocaleString('en-NG');
  const fing = p => (p.fingers ? `${p.fingers} finger${p.fingers > 1 ? 's' : ''}` : 'Unlimited');
  return [
    ['Fingers that count at once', fing(L), fing(M), fing(N)],
    ['Top tap speed counted', `${L.rate}/sec`, `${M.rate}/sec`, `${N.rate}/sec`],
    ['Pools at the same time (one tap counts in all)', '1', String(M.pools), String(N.pools)],
    ['Free and paid pools', true, true, true],
    ['Win prizes', true, true, true],
    ['Boosters in the store', 'Everybody boosters', '+ Mapo boosters', 'Every booster'],
    ['Create your own pools', '3 a day', true, true],
    ['Booster calculator + live booster tips', false, true, true],
    ['Tap sounds (unlock more as you rank up)', false, true, true],
    ['Backgrounds', false, false, true],
    ['Gift boosters to friends', false, false, true],
    ['Talk live in games (Para Para Boy rank, top 5)', false, false, true],
    ['Tap skins', 'Boy + girl', 'Boy + girl', 'All skins'],
    ['Withdraw winnings from', naira(L.minWithdraw), naira(M.minWithdraw), naira(N.minWithdraw)]
  ];
}

// ── Nepo themes: exactly 10. Everybody else uses "grape". ──────────────────────
export const THEMES = {
  grape: { name: 'Grape', a: '#6A35FF', b: '#2A0F8F', accent: '#00FF6E', deep: '#1B0B4D' },
  ocean: { name: 'Ocean', a: '#1E7BFF', b: '#0B2A8F', accent: '#00FF6E', deep: '#08164D' },
  lagoon: { name: 'Lagoon', a: '#00B3B3', b: '#064B6B', accent: '#FFD23F', deep: '#032A3A' },
  jungle: { name: 'Jungle', a: '#13A85A', b: '#0A3B2A', accent: '#FFD23F', deep: '#062016' },
  sunset: { name: 'Sunset', a: '#FF6A3D', b: '#8F1F5C', accent: '#FFD23F', deep: '#3D0A26' },
  bubblegum: { name: 'Bubblegum', a: '#FF4FA3', b: '#7B1FA2', accent: '#00FF6E', deep: '#3A0A3F' },
  gold: { name: 'Gold', a: '#E0A800', b: '#7A4A00', accent: '#150B33', deep: '#2E1B00' },
  cocoa: { name: 'Cocoa', a: '#9C5B34', b: '#3B1E10', accent: '#FFD23F', deep: '#1E0F08' },
  crimson: { name: 'Crimson', a: '#E2263F', b: '#6B0A1C', accent: '#FFD23F', deep: '#2E040C' },
  midnight: { name: 'Midnight', a: '#2B2E4A', b: '#0B0C18', accent: '#00FF6E', deep: '#05060C' }
};
// App themes are switched off for everybody: one look for all. Backgrounds (Nepo) still work.
export const themeFor = () => 'grape';

// ── Tap sounds (synthesised in the browser, no files). Mapo/Nepo, unlocked by rank level. ──
export const SOUNDS = [
  { id: 'pop', name: 'Pop', minRank: 1 }, { id: 'drum', name: 'Talking drum', minRank: 1 }, { id: 'coin', name: 'Coin', minRank: 5 },
  { id: 'bubble', name: 'Bubble', minRank: 10 }, { id: 'clap', name: 'Clap', minRank: 15 }, { id: 'laser', name: 'Laser', minRank: 25 },
  { id: 'kalimba', name: 'Kalimba', minRank: 35 }, { id: 'bell', name: 'Gong', minRank: 50 }
];
export function soundFor(u, prefs = {}) {
  if (!isPaid(u)) return 'pop';
  const s = SOUNDS.find(x => x.id === prefs.sound);
  return s && (u.rank_level || 1) >= s.minRank ? s.id : 'pop';
}

// ── Backgrounds made by the admin: CSS built only from validated hex colours. ──
const HEX = /^#[0-9a-fA-F]{6}$/;
export function backgroundCss(bg) {
  if (!bg || !HEX.test(bg.color_a) || !HEX.test(bg.color_b)) return '';
  const img = /^\/media\/[A-Za-z0-9/_.-]+$/.test(bg.image_url || '') ? `url('${bg.image_url}') center/cover no-repeat,` : '';
  if (bg.style === 'RADIAL') return `${img}radial-gradient(120% 90% at 50% 0%,${bg.color_a},${bg.color_b})`;
  if (bg.style === 'DOTS') return `${img}radial-gradient(rgba(255,255,255,.14) 1.5px,transparent 1.6px) 0 0/22px 22px,linear-gradient(160deg,${bg.color_a},${bg.color_b})`;
  return `${img}linear-gradient(160deg,${bg.color_a},${bg.color_b})`;
}

// ── numbers and time ───────────────────────────────────────────────────────
export function short(n) {
  n = Number(n || 0);
  const a = Math.abs(n);
  const f = (v, s) => (Math.round(v * 10) / 10).toString().replace(/\.0$/, '') + s;
  if (a >= 1e9) return f(n / 1e9, 'b');
  if (a >= 1e6) return f(n / 1e6, 'm');
  return Math.round(n).toLocaleString('en-NG');
}
export const nairaShort = k => '₦' + short(Number(k || 0) / 100);
