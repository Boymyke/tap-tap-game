// 100 ranks: 20 named tiers × 5 levels (I–V). Generated on first use; the super admin can
// rename, re-threshold and add more from the admin panel.

export const RANK_TIERS = [
  'Fresh Finger', 'JJC', 'Danfo Tapper', 'Keke Rider', 'Molue Master',
  'Agbero', 'Area Boy', 'Mama Put Regular', 'Gbedu Starter', 'Owambe Guest',
  'Big Boy', 'Para Para Boy', 'Chairman', 'Oga Patapata', 'Baba Nla',
  'Ijoba', 'Odogwu', 'Eko Akete', 'Ogbonge', 'Tap Am Legend'
];
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const TIER_COLORS = ['#21D4C8', '#2E8BFF', '#00C957', '#FF8A2A', '#9161FF', '#FF4FA3', '#2E8BFF', '#00C957', '#FF8A2A', '#9161FF',
  '#FF4FA3', '#E0A800', '#2E8BFF', '#9161FF', '#FF4FA3', '#00C957', '#FF8A2A', '#21D4C8', '#FF4FA3', '#E0A800'];

// Unlocks are comma-separated keys the app understands.
const UNLOCKS = { 5: 'booster-long,sound-coin', 10: 'skin-kente,booster-4x,sound-bubble', 15: 'sound-clap', 20: 'booster-5x', 25: 'booster-8x,sound-laser', 30: 'skin-neon', 35: 'sound-kalimba', 40: 'booster-10x', 50: 'sound-bell', 56: 'voice' };

export function generateRanks() {
  const out = [];
  for (let level = 1; level <= 100; level++) {
    const tier = Math.floor((level - 1) / 5), step = (level - 1) % 5;
    out.push({
      level,
      name: `${RANK_TIERS[tier]} ${ROMAN[step]}`,
      min_taps: level === 1 ? 0 : Math.round(60 * Math.pow(level - 1, 2.15)),
      min_games: tier === 0 ? 0 : tier * 10 + step * 2,          // e.g. Para Para Boy I needs 110 games
      min_wins: tier < 14 ? 0 : (tier - 13) * 3 + step,          // top tiers need wins too
      unlocks: UNLOCKS[level] || '',
      color: TIER_COLORS[tier]
    });
  }
  return out;
}

export async function ensureRanks(env) {
  const c = await env.DB.prepare('SELECT COUNT(*) n FROM ranks').first();
  if (Number(c?.n) > 0) return;
  const stmts = generateRanks().map(r => env.DB.prepare('INSERT OR IGNORE INTO ranks(level,name,min_taps,min_games,min_wins,unlocks,color) VALUES(?,?,?,?,?,?,?)')
    .bind(r.level, r.name, r.min_taps, r.min_games, r.min_wins, r.unlocks, r.color));
  await env.DB.batch(stmts);
}

let cache = null, cacheAt = 0;
export async function allRanks(env) {
  if (cache && Date.now() - cacheAt < 30000) return cache;
  await ensureRanks(env);
  cache = (await env.DB.prepare('SELECT * FROM ranks ORDER BY level').all()).results;
  cacheAt = Date.now();
  return cache;
}
export const clearRankCache = () => { cache = null; };

// Highest rank whose requirements are all met.
export function levelFor(ranks, { taps = 0, games = 0, wins = 0 }) {
  let best = ranks[0] || { level: 1, name: 'Fresh Finger I' };
  for (const r of ranks) if (taps >= r.min_taps && games >= r.min_games && wins >= r.min_wins && r.level > best.level) best = r;
  return best;
}

export function rankInfo(ranks, user) {
  const current = levelFor(ranks, { taps: user.lifetime_taps, games: user.games_played, wins: user.wins });
  const next = ranks.find(r => r.level === current.level + 1) || null;
  let progress = 1;
  if (next) {
    const parts = [];
    if (next.min_taps > current.min_taps) parts.push(Math.min(1, (user.lifetime_taps - current.min_taps) / (next.min_taps - current.min_taps)));
    if (next.min_games > 0) parts.push(Math.min(1, user.games_played / next.min_games));
    if (next.min_wins > 0) parts.push(Math.min(1, user.wins / next.min_wins));
    progress = parts.length ? Math.max(0, Math.min(...parts)) : 1;
  }
  return { current, next, progress };
}

export async function recalcRank(env, userId) {
  const u = await env.DB.prepare('SELECT lifetime_taps,games_played,wins,rank_level FROM users WHERE id=?').bind(userId).first();
  if (!u) return null;
  const r = levelFor(await allRanks(env), { taps: u.lifetime_taps, games: u.games_played, wins: u.wins });
  if (r.level !== u.rank_level) await env.DB.prepare('UPDATE users SET rank_level=? WHERE id=?').bind(r.level, userId).run();
  return { from: u.rank_level, to: r.level, name: r.name };
}
