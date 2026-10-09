// Turns a finished pool's live scores into final ranks, prizes, winnings, lifetime taps,
// top-tapper stats and ranks. Runs once per pool (the settled_at claim makes it idempotent).
import { credit, notify, parseJson, naira, periodKeys, metricStmt } from '../core.js';
import { recalcRank } from './ranks.js';

// Share a pot between ranked players. split = weights (any scale), tie = FIRST | SPLIT.
// If fewer people scored than there are prize places, the places that exist share the whole pot
// in the same proportions.
function sharePot(pot, players, split, tie) {
  const prizes = new Map(), positions = new Map();
  const eligible = players.filter(p => p.score > 0);
  if (!eligible.length || pot <= 0) { eligible.forEach((p, i) => positions.set(p.uid, i + 1)); return { prizes, positions }; }
  const places = split.slice(0, Math.min(split.length, eligible.length));
  const total = places.reduce((a, b) => a + b, 0) || 1;
  const shareOf = k => (k < places.length ? places[k] / total : 0);
  if (tie === 'SPLIT') {
    let pos = 0;
    for (let i = 0; i < eligible.length;) {
      let j = i; while (j + 1 < eligible.length && eligible[j + 1].score === eligible[i].score) j++;
      const group = eligible.slice(i, j + 1);
      let share = 0; for (let k = pos; k < pos + group.length; k++) share += shareOf(k);
      const each = Math.floor(pot * share / group.length);
      group.forEach(p => { positions.set(p.uid, pos + 1); if (each > 0) prizes.set(p.uid, each); });
      pos += group.length; i = j + 1;
    }
  } else {   // FIRST: whoever reached the score first ranks higher (players arrive sorted that way)
    eligible.forEach((p, i) => { positions.set(p.uid, i + 1); const amt = Math.floor(pot * shareOf(i)); if (amt > 0) prizes.set(p.uid, amt); });
  }
  const paid = [...prizes.values()].reduce((a, b) => a + b, 0);    // rounding leftovers go to #1
  const top = eligible[0];
  if (paid > 0 && pot > paid && prizes.has(top.uid)) prizes.set(top.uid, prizes.get(top.uid) + (pot - paid));
  return { prizes, positions };
}

// ranked: [{ uid, score, raw, reachedAt, side }] sorted by score desc, reachedAt asc.
export function computePrizes(pool, ranked) {
  const split = parseJson(pool.split, [100]).map(Number).filter(n => n > 0);
  const cut = Math.max(0, Math.min(50, Number(pool.house_cut_pct || 0)));
  const pot = Math.floor(Number(pool.prize_kobo || 0) * (100 - cut) / 100);
  if (pool.vs_split && pool.side_a && pool.side_b) {
    // VS pools: each side has its own pot (its players' entry fees + half of any starting prize).
    // The top tappers on each side share their side's pot. An empty side's half goes to the other side.
    const sides = [pool.side_a, pool.side_b];
    const fees = Object.fromEntries(sides.map(s => [s, 0]));
    for (const p of ranked) if (fees[p.side] !== undefined) fees[p.side] += Number(p.paid || 0);
    const feeTotal = fees[sides[0]] + fees[sides[1]];
    const seed = Math.max(0, Number(pool.prize_kobo || 0) - feeTotal);
    const has = s => ranked.some(p => p.side === s && p.score > 0);
    const potFor = s => {
      const other = sides.find(x => x !== s);
      let raw = fees[s] + Math.floor(seed / 2);
      if (!has(other)) raw += fees[other] + (seed - Math.floor(seed / 2));
      return has(s) ? Math.floor(raw * (100 - cut) / 100) : 0;
    };
    const prizes = new Map(), positions = new Map(), sidePots = {};
    for (const s of sides) {
      sidePots[s] = potFor(s);
      const r = sharePot(sidePots[s], ranked.filter(p => p.side === s), split, pool.tie_rule);
      r.prizes.forEach((v, k) => prizes.set(k, v)); r.positions.forEach((v, k) => positions.set(k, v));
    }
    return { pot, prizes, positions, sidePots };
  }
  const r = sharePot(pot, ranked, split, pool.tie_rule);
  return { pot, ...r };
}

export async function settlePool(env, poolId, ranked) {
  const pool = await env.DB.prepare('SELECT * FROM pools WHERE id=?').bind(poolId).first();
  if (!pool || pool.settled_at) return { skipped: true };
  // claim the settlement so it only ever runs once
  const claim = await env.DB.prepare("UPDATE pools SET settled_at=?, status='COMPLETED' WHERE id=? AND settled_at IS NULL").bind(new Date().toISOString(), poolId).run();
  if (!claim.meta.changes) return { skipped: true };

  if (pool.vs_split) {   // entry fees per player decide each side's pot
    const paid = Object.fromEntries((await env.DB.prepare('SELECT user_id, paid_kobo FROM pool_entries WHERE pool_id=?').bind(poolId).all()).results.map(r => [r.user_id, r.paid_kobo]));
    ranked = ranked.map(p => ({ ...p, paid: paid[p.uid] || 0 }));
  }
  const { prizes, positions } = computePrizes(pool, ranked);
  const keys = periodKeys(new Date(pool.ends_at));
  const stmts = [];
  let totalRaw = 0;
  for (const p of ranked) {
    // Final position: overall order for normal pools, place within the side for VS pools.
    const finalRank = positions.get(p.uid) || null;
    stmts.push(env.DB.prepare('UPDATE pool_entries SET taps=?,raw_taps=?,settled_raw_taps=?,reached_at=?,final_rank=?,prize_kobo=?,boosters_used=? WHERE pool_id=? AND user_id=?')
      .bind(p.score, p.raw, p.raw, p.reachedAt ? new Date(p.reachedAt).toISOString() : null, finalRank, prizes.get(p.uid) || 0, p.boosts || 0, poolId, p.uid));
    if (p.raw > 0) {
      totalRaw += p.raw;
      stmts.push(env.DB.prepare('UPDATE users SET lifetime_taps=lifetime_taps+?,games_played=games_played+1,wins=wins+? WHERE id=?').bind(p.raw, finalRank === 1 ? 1 : 0, p.uid));
      for (const k of [keys.DAY, keys.WEEK, keys.MONTH, keys.YEAR]) stmts.push(env.DB.prepare('INSERT INTO tap_stats(period,user_id,taps) VALUES(?,?,?) ON CONFLICT(period,user_id) DO UPDATE SET taps=taps+excluded.taps').bind(k, p.uid, p.raw));
    }
    if (p.flagged > 3) stmts.push(env.DB.prepare('INSERT INTO audit_logs(id,admin_user_id,action,detail) VALUES(?,?,?,?)').bind(crypto.randomUUID(), null, 'anticheat.flag', JSON.stringify({ pool: poolId, user: p.uid, flagged: p.flagged, raw: p.raw })));
  }
  stmts.push(metricStmt(env, 'taps', totalRaw), metricStmt(env, 'games', 1), metricStmt(env, 'players', ranked.filter(p => p.raw > 0).length));
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));

  // Nobody tapped at all: give entry fees back, and the starting prize back to whoever funded it.
  if (!prizes.size && Number(pool.prize_kobo) > 0 && !ranked.some(p => p.score > 0)) {
    const paid = (await env.DB.prepare("SELECT e.user_id, e.paid_kobo, COALESCE((SELECT t.balance FROM wallet_transactions t WHERE t.user_id=e.user_id AND t.reference=e.pool_id AND t.type='ENTRY_FEE' ORDER BY t.created_at DESC LIMIT 1), 'WALLET') AS src FROM pool_entries e WHERE e.pool_id=? AND e.paid_kobo>0").bind(poolId).all()).results;
    for (const e of paid) await credit(env, e.user_id, e.paid_kobo, { balance: e.src === 'WINNINGS' ? 'WINNINGS' : 'WALLET', type: 'REFUND', reference: poolId, note: `Nobody tapped: ${pool.name}` });
    const seeded = Number(pool.prize_kobo) - paid.reduce((a, e) => a + e.paid_kobo, 0);
    const funder = await env.DB.prepare('SELECT role FROM users WHERE id=?').bind(pool.created_by || '').first();
    if (seeded > 0 && funder && funder.role !== 'ADMIN') await credit(env, pool.created_by, seeded, { type: 'REFUND', reference: poolId, note: `Prize back (nobody tapped): ${pool.name}` });
    return { settled: true, winners: 0, refunded: true };
  }
  let paidOut = 0;
  for (const [uidv, amt] of prizes) {
    paidOut += amt;
    await credit(env, uidv, amt, { balance: 'WINNINGS', type: 'PRIZE', reference: poolId, note: pool.name });
    await notify(env, uidv, `You won ${naira(amt)} in “${pool.name}”! E don land for your winnings.`, `/pool/${poolId}`);
  }
  if (paidOut) await metricStmt(env, 'prizes_kobo', paidOut).run();
  for (const p of ranked) {
    if (p.raw <= 0) continue;
    const r = await recalcRank(env, p.uid);
    if (r && r.to > r.from) await notify(env, p.uid, `Rank up! You are now ${r.name}.`, '/me');
  }
  return { settled: true, winners: prizes.size };
}
