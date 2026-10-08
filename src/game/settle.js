// Turns a finished pool's live scores into final ranks, prizes, winnings, lifetime taps and ranks.
import { credit, notify, parseJson, naira } from '../core.js';
import { recalcRank } from './ranks.js';

// ranked: [{ uid, score, raw, reachedAt }] sorted by score desc, reachedAt asc.
export function computePrizes(pool, ranked) {
  const eligible = ranked.filter(p => p.score > 0);
  const split = parseJson(pool.split, [100]).map(Number).filter(n => n > 0).slice(0, pool.winners_count || 1);
  const cut = Math.max(0, Math.min(50, Number(pool.house_cut_pct || 0)));
  const pot = Math.floor(Number(pool.prize_kobo || 0) * (100 - cut) / 100);
  const prizes = new Map();          // uid -> kobo
  const positions = new Map();       // uid -> final rank (1-based, shared on SPLIT ties)
  if (!eligible.length) return { pot, prizes, positions };

  if (pool.tie_rule === 'SPLIT') {
    let pos = 0;
    for (let i = 0; i < eligible.length;) {
      let j = i; while (j + 1 < eligible.length && eligible[j + 1].score === eligible[i].score) j++;
      const group = eligible.slice(i, j + 1);
      let share = 0;
      for (let k = pos; k <= pos + group.length - 1 && k < split.length; k++) share += split[k];
      const each = Math.floor(pot * share / 100 / group.length);
      group.forEach(p => { positions.set(p.uid, pos + 1); if (each > 0) prizes.set(p.uid, each); });
      pos += group.length; i = j + 1;
    }
  } else {   // FIRST: whoever reached the score first ranks higher
    eligible.forEach((p, i) => { positions.set(p.uid, i + 1); if (i < split.length) { const amt = Math.floor(pot * split[i] / 100); if (amt > 0) prizes.set(p.uid, amt); } });
  }
  // rounding leftovers go to the first-placed player
  const paid = [...prizes.values()].reduce((a, b) => a + b, 0);
  const totalShare = Math.min(100, split.reduce((a, b) => a + b, 0));
  const target = Math.floor(pot * totalShare / 100);
  const top = eligible[0];
  if (paid > 0 && target > paid && prizes.has(top.uid)) prizes.set(top.uid, prizes.get(top.uid) + (target - paid));
  return { pot, prizes, positions };
}

export async function settlePool(env, poolId, ranked) {
  const pool = await env.DB.prepare('SELECT * FROM pools WHERE id=?').bind(poolId).first();
  if (!pool || pool.settled_at) return { skipped: true };
  // claim the settlement so it only ever runs once
  const claim = await env.DB.prepare("UPDATE pools SET settled_at=?, status='COMPLETED' WHERE id=? AND settled_at IS NULL").bind(new Date().toISOString(), poolId).run();
  if (!claim.meta.changes) return { skipped: true };

  const { prizes, positions } = computePrizes(pool, ranked);
  const stmts = [];
  for (const p of ranked) {
    stmts.push(env.DB.prepare('UPDATE pool_entries SET taps=?,raw_taps=?,settled_raw_taps=?,reached_at=?,final_rank=?,prize_kobo=? WHERE pool_id=? AND user_id=?')
      .bind(p.score, p.raw, p.raw, p.reachedAt ? new Date(p.reachedAt).toISOString() : null, positions.get(p.uid) || null, prizes.get(p.uid) || 0, poolId, p.uid));
    if (p.raw > 0) stmts.push(env.DB.prepare('UPDATE users SET lifetime_taps=lifetime_taps+?,games_played=games_played+1,wins=wins+? WHERE id=?')
      .bind(p.raw, positions.get(p.uid) === 1 ? 1 : 0, p.uid));
  }
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));

  for (const [uidv, amt] of prizes) {
    await credit(env, uidv, amt, { balance: 'WINNINGS', type: 'PRIZE', reference: poolId, note: pool.name });
    await notify(env, uidv, `You won ${naira(amt)} in “${pool.name}”! E don land for your winnings.`, `/results/${poolId}`);
  }
  for (const p of ranked) {
    if (p.raw <= 0) continue;
    const r = await recalcRank(env, p.uid);
    if (r && r.to > r.from) await notify(env, p.uid, `Rank up! You are now ${r.name}.`, '/me');
  }
  return { settled: true, winners: prizes.size };
}
