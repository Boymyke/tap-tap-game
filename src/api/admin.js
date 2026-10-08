// Super admin API.
import { json, readJson, uid, nowIso } from '../lib.js';
import { isAdmin, requireRole, credit, debit, giveItem, notify, audit, clampInt, clearSettingsCache, naira, parseJson } from '../core.js';
import { allRanks, clearRankCache, generateRanks, recalcRank } from '../game/ranks.js';
import { roomCall, poolState } from '../game/pools.js';
import { processWithdrawal, activateNepo } from './money.js';

const SETTING_KEYS = ['landing_demo_pools', 'nepo_monthly_kobo', 'nepo_yearly_kobo', 'min_withdraw_lapo_kobo', 'min_withdraw_nepo_kobo', 'starter_boosters', 'nepo_bonus_boosters', 'referral_batch', 'max_multi_pools', 'voice_min_rank', 'voice_top_n', 'house_cut_pct'];
const HEX = /^#[0-9a-fA-F]{6}$/;
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);

export async function handleAdminApi(req, env, path, user) {
  if (!path.startsWith('/api/admin/')) return null;
  const deny = requireRole(user, ['ADMIN']); if (deny) return deny;
  const body = async () => { const r = await readJson(req); return r; };

  // ── users ──
  if (path === '/api/admin/users' && req.method === 'GET') {
    const q = String(new URL(req.url).searchParams.get('q') || '').trim();
    const rows = (await env.DB.prepare(`SELECT u.id,u.username,u.email,u.role,u.tier,u.nepo_until,u.status,u.lifetime_taps,u.games_played,u.wins,u.rank_level,u.created_at,w.balance_kobo,w.winnings_kobo
      FROM users u LEFT JOIN wallets w ON w.user_id=u.id WHERE (?='' OR u.username LIKE ? OR u.email LIKE ?) ORDER BY u.created_at DESC LIMIT 100`).bind(q, `%${q}%`, `%${q}%`).all()).results;
    return json({ users: rows });
  }
  const um = path.match(/^\/api\/admin\/users\/([^/]+)\/(status|tier|gift|wallet|delete)$/);
  if (um && req.method === 'POST') {
    const { data, response } = await body(); if (response) return response;
    const target = await env.DB.prepare('SELECT id,username,role FROM users WHERE id=?').bind(um[1]).first();
    if (!target) return json({ error: 'User not found.' }, 404);
    if (target.id === user.id && um[2] !== 'gift') return json({ error: 'You no fit do that to your own account.' }, 400);
    if (um[2] === 'status') {
      const status = data.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
      await env.DB.batch([env.DB.prepare('UPDATE users SET status=? WHERE id=?').bind(status, target.id), ...(status === 'SUSPENDED' ? [env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(target.id)] : [])]);
      await audit(env, user.id, 'user.status', { id: target.id, status });
      return json({ message: `${target.username} is now ${status.toLowerCase()}` });
    }
    if (um[2] === 'tier') {
      if (data.tier === 'NEPO') { await activateNepo(env, target.id, data.plan === 'year' ? 'year' : 'month'); }
      else await env.DB.prepare("UPDATE users SET tier='LAPO', nepo_until=NULL WHERE id=?").bind(target.id).run();
      await audit(env, user.id, 'user.tier', { id: target.id, tier: data.tier });
      return json({ message: 'Tier updated' });
    }
    if (um[2] === 'gift') {
      const item = await env.DB.prepare('SELECT id,name FROM store_items WHERE id=?').bind(String(data.item || '')).first();
      if (!item) return json({ error: 'Pick an item.', field: 'item' }, 400);
      const qty = clampInt(data.qty, 1, 1000, 1);
      await giveItem(env, target.id, item.id, qty, { gift: true, from: user.id, note: 'From Tap Am' });
      await notify(env, target.id, `Tap Am gifted you ${qty}× ${item.name}!`, '/bag');
      await audit(env, user.id, 'user.gift', { id: target.id, item: item.id, qty });
      return json({ message: `Gifted ${qty}× ${item.name} to ${target.username}` });
    }
    if (um[2] === 'wallet') {
      const kobo = clampInt(Number(data.amount) * 100, -100000000000, 100000000000, 0);
      const which = data.balance === 'WINNINGS' ? 'WINNINGS' : 'WALLET';
      const note = String(data.note || '').slice(0, 120);
      if (!kobo || note.length < 3) return json({ error: 'Enter an amount and a reason.', field: 'note' }, 400);
      if (kobo > 0) await credit(env, target.id, kobo, { balance: which, type: 'ADMIN_ADJUST', note });
      else if (!await debit(env, target.id, -kobo, { balance: which, type: 'ADMIN_ADJUST', note })) return json({ error: 'Balance too low.' }, 409);
      await audit(env, user.id, 'user.wallet', { id: target.id, kobo, which, note });
      return json({ message: `${which === 'WINNINGS' ? 'Winnings' : 'Wallet'} ${kobo > 0 ? 'credited' : 'debited'} ${naira(Math.abs(kobo))}` });
    }
    if (um[2] === 'delete') {
      if (data.confirm !== target.username) return json({ error: `Type ${target.username} to confirm.`, field: 'confirm' }, 400);
      await env.DB.prepare('DELETE FROM users WHERE id=?').bind(target.id).run();
      await audit(env, user.id, 'user.delete', { id: target.id, username: target.username });
      return json({ message: `${target.username} removed`, redirect: '/admin/users' });
    }
  }

  // ── pools ──
  const pm = path.match(/^\/api\/admin\/pools\/([^/]+)\/(settle|cancel)$/);
  if (pm && req.method === 'POST') {
    const pool = await env.DB.prepare('SELECT * FROM pools WHERE id=?').bind(pm[1]).first();
    if (!pool) return json({ error: 'Pool not found.' }, 404);
    if (pm[2] === 'settle') {
      if (poolState(pool) !== 'ended') return json({ error: 'Pool never end.' }, 409);
      const r = await roomCall(env, pool.id, '/settle', { id: pool.id });
      await audit(env, user.id, 'pool.settle', pool.id);
      return json({ message: r.data.settled ? `Settled. ${r.data.winners} winner(s) paid.` : 'Already settled.' });
    }
    if (pm[2] === 'cancel') {
      if (pool.settled_at) return json({ error: 'Pool already settled.' }, 409);
      const c = await env.DB.prepare("UPDATE pools SET status='CANCELLED', settled_at=? WHERE id=? AND settled_at IS NULL").bind(nowIso(), pool.id).run();
      if (!c.meta.changes) return json({ error: 'Pool already settled.' }, 409);
      await roomCall(env, pool.id, '/init', { pool: { ...pool, ends_at: nowIso() } }).catch(() => {});   // stop taps now
      const paid = (await env.DB.prepare('SELECT user_id,paid_kobo FROM pool_entries WHERE pool_id=? AND paid_kobo>0').bind(pool.id).all()).results;
      for (const e of paid) { await credit(env, e.user_id, e.paid_kobo, { type: 'REFUND', reference: pool.id, note: `Refund: ${pool.name}` }); await notify(env, e.user_id, `“${pool.name}” was cancelled. Your ${naira(e.paid_kobo)} entry is back in your wallet.`, '/wallet'); }
      const seeded = Number(pool.prize_kobo) - paid.reduce((a, e) => a + e.paid_kobo, 0);
      if (seeded > 0 && pool.created_by && pool.created_by !== user.id) await credit(env, pool.created_by, seeded, { type: 'REFUND', reference: pool.id, note: `Prize refund: ${pool.name}` });
      await audit(env, user.id, 'pool.cancel', pool.id);
      return json({ message: 'Pool cancelled and refunded' });
    }
  }

  // ── store items ──
  if (path === '/api/admin/items' && req.method === 'POST') {
    const { data, response } = await body(); if (response) return response;
    const kind = ['BOOSTER', 'SKIN', 'SHAPE'].includes(data.kind) ? data.kind : 'BOOSTER';
    const name = String(data.name || '').trim();
    if (name.length < 2 || name.length > 40) return json({ error: 'Name must be 2–40 characters.', field: 'name' }, 400);
    const id = data.id ? String(data.id) : `${kind.toLowerCase()}-${slug(name)}-${uid().slice(0, 4)}`;
    const config = {};
    if (kind === 'SKIN') { if (HEX.test(data.bg || '')) config.bg = data.bg; if (['boy', 'girl', 'star', 'bolt'].includes(data.art)) config.art = data.art; if (/^\/media\//.test(data.image || '')) config.image = data.image; if (data.pattern === 'kente' || data.kente === true) config.pattern = 'kente'; if (data.glow === true) config.glow = true; }
    if (kind === 'SHAPE') config.shape = ['rect', 'rounded', 'circle', 'hex', 'blob'].includes(data.shape) ? data.shape : 'rounded';
    if (kind === 'BOOSTER' && HEX.test(data.color || data.bg || '')) config.color = data.color || data.bg;
    const row = {
      id, name, description: String(data.description || '').slice(0, 140), kind,
      price_kobo: clampInt(Number(data.price) * 100, 0, 100000000, 0),
      multiplier: kind === 'BOOSTER' ? Math.max(1.1, Math.min(10, Number(data.multiplier) || 2)) : 1,
      duration_seconds: kind === 'BOOSTER' ? clampInt(data.duration, 5, 120, 20) : 0,
      audience: ['ALL', 'LAPO', 'NEPO'].includes(data.audience) ? data.audience : 'ALL',
      min_rank: clampInt(data.min_rank, 1, 1000, 1), config: JSON.stringify(config), giftable: data.giftable === false ? 0 : 1,
      active: data.active === false ? 0 : 1, created_by: user.id
    };
    const cols = Object.keys(row);
    await env.DB.prepare(`INSERT INTO store_items(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')}) ON CONFLICT(id) DO UPDATE SET ${cols.filter(c => c !== 'id' && c !== 'created_by').map(c => `${c}=excluded.${c}`).join(',')}`).bind(...cols.map(c => row[c])).run();
    await audit(env, user.id, 'item.save', id);
    return json({ message: `${name} saved`, reload: true });
  }

  // ── ranks ──
  if (path === '/api/admin/ranks' && req.method === 'POST') {
    const { data, response } = await body(); if (response) return response;
    const level = clampInt(data.level, 1, 1000, 0);
    const name = String(data.name || '').trim();
    if (!level || name.length < 2 || name.length > 40) return json({ error: 'Enter a level and a name (2–40 characters).', field: 'name' }, 400);
    await env.DB.prepare('INSERT INTO ranks(level,name,min_taps,min_games,min_wins,unlocks,color) VALUES(?,?,?,?,?,?,?) ON CONFLICT(level) DO UPDATE SET name=excluded.name,min_taps=excluded.min_taps,min_games=excluded.min_games,min_wins=excluded.min_wins,unlocks=excluded.unlocks,color=excluded.color')
      .bind(level, name, clampInt(data.min_taps, 0, 1e12, 0), clampInt(data.min_games, 0, 1e9, 0), clampInt(data.min_wins, 0, 1e9, 0), String(data.unlocks || '').replace(/[^a-z0-9,-]/gi, '').slice(0, 120), HEX.test(data.color || '') ? data.color : '#00ff6e').run();
    clearRankCache();
    await audit(env, user.id, 'rank.save', { level, name });
    return json({ message: `Rank ${level} saved`, reload: true });
  }
  if (path === '/api/admin/ranks/reset' && req.method === 'POST') {
    const { data, response } = await body(); if (response) return response;
    if (data.confirm !== 'RESET') return json({ error: 'Type RESET to confirm.', field: 'confirm' }, 400);
    await env.DB.prepare('DELETE FROM ranks').run();
    await env.DB.batch(generateRanks().map(r => env.DB.prepare('INSERT INTO ranks(level,name,min_taps,min_games,min_wins,unlocks,color) VALUES(?,?,?,?,?,?,?)').bind(r.level, r.name, r.min_taps, r.min_games, r.min_wins, r.unlocks, r.color)));
    clearRankCache();
    await audit(env, user.id, 'rank.reset', '');
    return json({ message: 'Ranks reset to the default 100', reload: true });
  }
  if (path === '/api/admin/ranks/recalc' && req.method === 'POST') {
    const ids = (await env.DB.prepare("SELECT id FROM users WHERE role='USER'").all()).results;
    for (const r of ids) await recalcRank(env, r.id);
    return json({ message: `Ranks recalculated for ${ids.length} players` });
  }

  // ── ads ──
  const am = path.match(/^\/api\/admin\/promos\/([^/]+)\/(approve|hide|delete)$/);
  if (am && req.method === 'POST') {
    if (am[2] === 'delete') await env.DB.prepare('DELETE FROM promos WHERE id=?').bind(am[1]).run();
    else await env.DB.prepare('UPDATE promos SET approved=? WHERE id=?').bind(am[2] === 'approve' ? 1 : 0, am[1]).run();
    await audit(env, user.id, 'promo.' + am[2], am[1]);
    return json({ message: 'Done', reload: true });
  }

  // ── withdrawals ──
  const wm = path.match(/^\/api\/admin\/withdrawals\/([^/]+)\/(transfer|paid|reject)$/);
  if (wm && req.method === 'POST') {
    const { data, response } = await body(); if (response) return response;
    const r = await processWithdrawal(env, user, wm[1], wm[2], String(data.note || '').slice(0, 200));
    await audit(env, user.id, 'withdrawal.' + wm[2], wm[1]);
    return r;
  }

  // ── settings ──
  if (path === '/api/admin/settings' && req.method === 'POST') {
    const { data, response } = await body(); if (response) return response;
    const stmts = [];
    for (const k of SETTING_KEYS) {
      if (data[k] === undefined) continue;
      let v = data[k];
      if (k.endsWith('_kobo')) v = String(clampInt(Number(v) * 100, 0, 1e12, 0));
      else if (k === 'landing_demo_pools') v = v === true || v === '1' ? '1' : '0';
      else v = String(clampInt(v, 0, 1e9, 0));
      stmts.push(env.DB.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k, v));
    }
    if (stmts.length) await env.DB.batch(stmts);
    clearSettingsCache();
    await audit(env, user.id, 'settings', data);
    return json({ message: 'Settings saved', reload: true });
  }
  return null;
}
