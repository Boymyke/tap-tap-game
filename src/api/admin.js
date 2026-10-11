// Super admin API. Every route checks the ADMIN role on the server and is written to the audit log.
import { json, readJson, uid, nowIso, allow } from '../lib.js';
import { requireRole, credit, debit, giveItem, notify, audit, clampInt, clearSettingsCache, naira, toKobo, settings } from '../core.js';
import { clearRankCache, generateRanks, recalcRank } from '../game/ranks.js';
import { roomCall, poolState, refundPlayers, pausePool, restartPool } from '../game/pools.js';
import { processWithdrawal, activateTier } from './money.js';
import { sendAlertEmail } from '../email.js';
import { isPattern } from '../ui/patterns.js';
import { decryptPhrase, canKeepCopies } from '../phrase.js';
import { hashPassword, safeEqual } from '../lib.js';

const SETTING_KEYS = ['landing_demo_pools', 'mapo_monthly_kobo', 'mapo_yearly_kobo', 'nepo_monthly_kobo', 'nepo_yearly_kobo', 'min_withdraw_lapo_kobo', 'min_withdraw_mapo_kobo', 'min_withdraw_nepo_kobo',
  'starter_boosters', 'mapo_bonus_boosters', 'nepo_bonus_boosters', 'referral_batch', 'max_multi_pools_mapo', 'max_multi_pools', 'voice_min_rank', 'voice_top_n', 'house_cut_pct',
  'tap_rate_lapo', 'tap_rate_mapo', 'tap_rate_nepo', 'tap_limits_on', 'tap_limit_daily', 'tap_limit_monthly', 'auto_payouts', 'auto_payout_max_kobo', 'auto_payout_min_age_days', 'alert_email', 'withdrawals_per_day', 'email_blast_kobo', 'lapo_pools_per_day', 'transfer_daily_max_kobo', 'free_box_days'];
const BOOL_KEYS = ['landing_demo_pools', 'tap_limits_on', 'auto_payouts'];
const HEX = /^#[0-9a-fA-F]{6}$/;
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
// Exactly one emoji (one grapheme, and it must be a pictograph — no letters or numbers).
function oneEmoji(s) {
  if (s.length > 16 || !/\p{Extended_Pictographic}/u.test(s) || /[\p{L}\p{N}]/u.test(s.replace(/[\u{1F1E6}-\u{1F1FF}]/gu, ''))) return false;
  try { return [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(s)].length === 1; } catch { return [...s].length <= 2; }
}
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export async function handleAdminApi(req, env, path, user) {
  if (!path.startsWith('/api/admin/')) return null;
  const deny = requireRole(user, ['ADMIN']); if (deny) return deny;
  if (!await allow(env, 'admin:' + user.id, 600, 600)) return json({ error: 'Slow down small.' }, 429);
  const body = () => readJson(req);

  // ── users ──
  const um = path.match(/^\/api\/admin\/users\/([^/]+)\/(status|tier|gift|wallet|delete)$/);
  if (um && req.method === 'POST') {
    const { data, response } = await body(); if (response) return response;
    const target = await env.DB.prepare('SELECT id,username,role FROM users WHERE id=?').bind(um[1]).first();
    if (!target) return json({ error: 'User not found.' }, 404);
    if (target.id === user.id && um[2] !== 'gift') return json({ error: 'You no fit do that to your own account.' }, 400);
    if (um[2] === 'status') {
      const status = ['SUSPENDED', 'ACTIVE'].includes(data.status) ? data.status : 'ACTIVE';
      await env.DB.batch([env.DB.prepare('UPDATE users SET status=?, archived_at=NULL WHERE id=?').bind(status, target.id), ...(status === 'SUSPENDED' ? [env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(target.id)] : [])]);
      await audit(env, user.id, 'user.status', { id: target.id, status });
      return json({ message: `${target.username} is now ${status.toLowerCase()}`, reload: true });
    }
    if (um[2] === 'tier') {
      if (target.role !== 'USER') return json({ error: 'Only players have tiers.' }, 400);
      if (data.tier === 'NEPO' || data.tier === 'MAPO') await activateTier(env, target.id, data.tier, data.plan === 'year' ? 'year' : 'month');
      else await env.DB.prepare("UPDATE users SET tier='LAPO', tier_until=NULL WHERE id=?").bind(target.id).run();
      await audit(env, user.id, 'user.tier', { id: target.id, tier: data.tier, plan: data.plan });
      return json({ message: 'Tier updated', reload: true });
    }
    if (um[2] === 'gift') {
      const item = await env.DB.prepare('SELECT id,name FROM store_items WHERE id=?').bind(String(data.item || '')).first();
      if (!item) return json({ error: 'Pick an item.', field: 'item' }, 400);
      const qty = clampInt(data.qty, 1, 1000, 1);
      await giveItem(env, target.id, item.id, qty, { gift: true, from: user.id, note: 'From Tap Am' });
      await notify(env, target.id, `Tap Am gifted you ${qty}× ${item.name}!`, '/bag');
      await audit(env, user.id, 'user.gift', { id: target.id, item: item.id, qty });
      return json({ message: `Gifted ${qty}× ${item.name} to ${target.username}`, reload: true });
    }
    if (um[2] === 'wallet') {
      const raw = String(data.amount || '').replace(/[,\s]/g, '');
      const kobo = clampInt(Math.round(Number(raw) * 100), -100000000000, 100000000000, 0);
      const which = data.balance === 'WINNINGS' ? 'WINNINGS' : 'WALLET';
      const note = String(data.note || '').slice(0, 120);
      if (!kobo || note.length < 3) return json({ error: 'Enter an amount and a reason.', field: 'note' }, 400);
      if (kobo > 0) await credit(env, target.id, kobo, { balance: which, type: 'ADMIN_ADJUST', note });
      else if (!await debit(env, target.id, -kobo, { balance: which, type: 'ADMIN_ADJUST', note })) return json({ error: 'Balance too low.' }, 409);
      await audit(env, user.id, 'user.wallet', { id: target.id, kobo, which, note });
      return json({ message: `${which === 'WINNINGS' ? 'Winnings' : 'Wallet'} ${kobo > 0 ? 'credited' : 'debited'} ${naira(Math.abs(kobo))}`, reload: true });
    }
    if (um[2] === 'delete') {
      if (data.confirm !== target.username) return json({ error: `Type ${target.username} to confirm.`, field: 'confirm' }, 400);
      await env.DB.prepare('DELETE FROM users WHERE id=?').bind(target.id).run();
      await audit(env, user.id, 'user.delete', { id: target.id, username: target.username });
      return json({ message: `${target.username} removed`, redirect: '/admin/users' });
    }
  }

  // ── bulk gifting: everybody, a tier, or a list of nicknames ──
  if (path === '/api/admin/gift-bulk' && req.method === 'POST') {
    const { data, response } = await body(); if (response) return response;
    const item = await env.DB.prepare('SELECT id,name FROM store_items WHERE id=?').bind(String(data.item || '')).first();
    if (!item) return json({ error: 'Pick an item.', field: 'item' }, 400);
    const qty = clampInt(data.qty, 1, 100, 1);
    const to = String(data.to || 'ALL');
    // set-based statements (D1 allows at most 100 bound values per statement, so name lists go in groups of 90):
    // gifting 20,000 players is a handful of database calls, not thousands
    const groups = [];
    if (to === 'LIST') {
      const names = [...new Set(String(data.names || '').split(/[\s,]+/).map(x => x.trim()).filter(Boolean))].slice(0, 500);
      if (!names.length) return json({ error: 'Paste at least one nickname.', field: 'names' }, 400);
      for (let i = 0; i < names.length; i += 90) { const g = names.slice(i, i + 90); groups.push({ where: `role='USER' AND status='ACTIVE' AND username IN (${g.map(() => '?').join(',')})`, binds: g }); }
    } else {
      const now = nowIso();
      groups.push({ where: "role='USER' AND status='ACTIVE' " + (to === 'NEPO' ? "AND tier='NEPO' AND (tier_until IS NULL OR tier_until>?)" : to === 'MAPO' ? "AND tier='MAPO' AND (tier_until IS NULL OR tier_until>?)" : to === 'LAPO' ? "AND (tier='LAPO' OR tier_until<=?)" : 'AND ?=?'), binds: to === 'ALL' ? [1, 1] : [now] });
    }
    const counts = await env.DB.batch(groups.map(g => env.DB.prepare(`SELECT COUNT(*) n FROM users WHERE ${g.where}`).bind(...g.binds)));
    const count = counts.reduce((a, r) => a + Number(r.results?.[0]?.n || 0), 0);
    if (!count) return json({ error: 'No players match.' }, 400);
    if (data.confirm !== true) return json({ error: `This sends ${qty}× ${item.name} to ${count} players. Tick confirm to send.`, field: 'confirm', count }, 400);
    const note = String(data.note || '').slice(0, 120) || 'From Tap Am';
    const text = `Tap Am gifted you ${qty}× ${item.name}! ${note === 'From Tap Am' ? '' : note}`.trim();
    await env.DB.batch(groups.flatMap(g => [
      env.DB.prepare(`INSERT INTO inventory(user_id,item_id,quantity) SELECT id,?,? FROM users WHERE ${g.where} ON CONFLICT(user_id,item_id) DO UPDATE SET quantity=quantity+excluded.quantity`).bind(item.id, qty, ...g.binds),
      env.DB.prepare(`INSERT INTO notifications(id,user_id,text,link) SELECT lower(hex(randomblob(16))),id,?,'/bag' FROM users WHERE ${g.where}`).bind(text, ...g.binds)
    ]));
    const rows = { length: count };
    await audit(env, user.id, 'gift.bulk', { item: item.id, qty, to, count: rows.length });
    return json({ message: `Sent ${qty}× ${item.name} to ${rows.length} players`, reload: true });
  }

  // ── pools ──
  // ── server overload: pause every live / upcoming pool (money + boosters back), restart later ──
  if (path === '/api/admin/overload/pause-all' && req.method === 'POST') {
    const { data } = await body();
    if (data?.confirm !== true) return json({ error: 'Tick confirm to pause every live and upcoming pool.', field: 'confirm' }, 400);
    const pools = (await env.DB.prepare("SELECT * FROM pools WHERE settled_at IS NULL AND status NOT IN ('PAUSED','CANCELLED') AND ends_at>? LIMIT 200").bind(nowIso()).all()).results;
    let n = 0, players = 0;
    for (const p of pools) { const r = await pausePool(env, p); if (r.paused) { n++; players += r.players; } }
    await env.DB.prepare("INSERT INTO settings(key,value) VALUES('overload','1') ON CONFLICT(key) DO UPDATE SET value='1'").run(); clearSettingsCache();
    await audit(env, user.id, 'overload.pause', { pools: n, players });
    return json({ message: `Paused ${n} pool${n === 1 ? '' : 's'}. ${players} players got their money and boosters back.`, reload: true });
  }
  if (path === '/api/admin/overload/restart-all' && req.method === 'POST') {
    const { data } = await body();
    const minutes = clampInt(data?.minutes, 1, 1440, 10);
    const pools = (await env.DB.prepare("SELECT * FROM pools WHERE status='PAUSED' LIMIT 200").all()).results;
    let n = 0;
    for (const p of pools) if ((await restartPool(env, p, minutes)).restarted) n++;
    await env.DB.prepare("INSERT INTO settings(key,value) VALUES('overload','0') ON CONFLICT(key) DO UPDATE SET value='0'").run(); clearSettingsCache();
    await audit(env, user.id, 'overload.restart', { pools: n, minutes });
    return json({ message: `Restarted ${n} pool${n === 1 ? '' : 's'}. They start in ${minutes} minutes.`, reload: true });
  }
  const pm = path.match(/^\/api\/admin\/pools\/([^/]+)\/(settle|cancel|pause|restart)$/);
  if (pm && req.method === 'POST') {
    const pool = await env.DB.prepare('SELECT * FROM pools WHERE id=?').bind(pm[1]).first();
    if (!pool) return json({ error: 'Pool not found.' }, 404);
    if (pm[2] === 'pause') {
      const r = await pausePool(env, pool);
      await audit(env, user.id, 'pool.pause', pool.id);
      return r.paused ? json({ message: `Paused. ${r.players} players got their money and ${r.boosters} boosters back.`, reload: true }) : json({ error: 'This pool can’t be paused now.' }, 409);
    }
    if (pm[2] === 'restart') {
      const { data } = await body();
      const r = await restartPool(env, pool, clampInt(data?.minutes, 1, 1440, 10));
      await audit(env, user.id, 'pool.restart', pool.id);
      return r.restarted ? json({ message: 'Pool restarted. Players were told to join again.', reload: true }) : json({ error: 'Only paused pools can restart.' }, 409);
    }
    if (pm[2] === 'settle') {
      if (poolState(pool) !== 'ended') return json({ error: 'Pool never end.' }, 409);
      const r = await roomCall(env, pool.id, '/settle', { id: pool.id });
      await audit(env, user.id, 'pool.settle', pool.id);
      return json({ message: r.data.settled ? `Settled. ${r.data.winners} winner(s) paid.` : 'Already settled.', reload: true });
    }
    if (pm[2] === 'cancel') {
      if (pool.settled_at) return json({ error: 'Pool already settled.' }, 409);
      const c = await env.DB.prepare("UPDATE pools SET status='CANCELLED', settled_at=? WHERE id=? AND settled_at IS NULL").bind(nowIso(), pool.id).run();
      if (!c.meta.changes) return json({ error: 'Pool already settled.' }, 409);
      await roomCall(env, pool.id, '/init', { pool: { ...pool, ends_at: nowIso() } }).catch(() => {});   // stop taps now
      const players = (await env.DB.prepare('SELECT user_id FROM pool_entries WHERE pool_id=?').bind(pool.id).all()).results.map(r => r.user_id);
      const back = await refundPlayers(env, pool, 'Refund');   // entry fees + prize top-ups go back to whoever paid them
      for (const u of players) await notify(env, u, `“${pool.name}” was cancelled. Any money you paid into it is back with you.`, '/wallet');
      const seeded = Number(pool.prize_kobo) - back;
      if (seeded > 0 && pool.created_by && pool.created_by !== user.id) {
        const creator = await env.DB.prepare('SELECT role FROM users WHERE id=?').bind(pool.created_by).first();
        if (creator && creator.role !== 'ADMIN') await credit(env, pool.created_by, seeded, { type: 'REFUND', reference: pool.id, note: `Prize refund: ${pool.name}` });
      }
      await audit(env, user.id, 'pool.cancel', pool.id);
      return json({ message: 'Pool cancelled and refunded', reload: true });
    }
  }

  // ── store items ──
  if (path === '/api/admin/items' && req.method === 'POST') {
    const { data, response } = await body(); if (response) return response;
    const kind = ['BOOSTER', 'SKIN'].includes(data.kind) ? data.kind : 'BOOSTER';
    const name = String(data.name || '').trim();
    if (name.length < 2 || name.length > 40) return json({ error: 'Name must be 2–40 characters.', field: 'name' }, 400);
    const id = data.id ? String(data.id).slice(0, 60) : `${kind.toLowerCase()}-${slug(name)}-${uid().slice(0, 4)}`;
    const config = {};
    if (kind === 'SKIN') { if (HEX.test(data.bg || '')) config.bg = data.bg; if (isPattern(data.pattern)) config.pattern = data.pattern; if (/^\/media\/[A-Za-z0-9/_.-]+$/.test(data.image || '')) config.image = data.image; if (data.glow === true) config.glow = true; }
    if (kind === 'BOOSTER' && HEX.test(data.bg || '')) config.color = data.bg;
    const row = {
      id, name, description: String(data.description || '').slice(0, 140), kind,
      price_kobo: clampInt(toKobo(data.price), 0, 100000000, 0),
      multiplier: kind === 'BOOSTER' ? Math.max(1.1, Math.min(10, Number(data.multiplier) || 2)) : 1,
      duration_seconds: kind === 'BOOSTER' ? clampInt(data.duration, 5, 120, 20) : 0,
      audience: ['ALL', 'LAPO', 'MAPO', 'NEPO'].includes(data.audience) ? data.audience : 'ALL',
      min_rank: clampInt(data.min_rank, 1, 1000, 1), config: JSON.stringify(config), giftable: data.giftable === false ? 0 : 1,
      per_game_limit: kind === 'BOOSTER' ? clampInt(data.per_game_limit, 0, 100, 0) : 0,
      active: data.active === false ? 0 : 1, created_by: user.id
    };
    const cols = Object.keys(row);
    await env.DB.prepare(`INSERT INTO store_items(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')}) ON CONFLICT(id) DO UPDATE SET ${cols.filter(c => c !== 'id' && c !== 'created_by').map(c => `${c}=excluded.${c}`).join(',')}`).bind(...cols.map(c => row[c])).run();
    await audit(env, user.id, 'item.save', id);
    return json({ message: `${name} saved`, redirect: '/admin/store' });
  }

  // ── ranks ──
  if (path === '/api/admin/ranks' && req.method === 'POST') {
    const { data, response } = await body(); if (response) return response;
    const level = clampInt(data.level, 1, 1000, 0);
    const name = String(data.name || '').trim();
    if (!level || name.length < 2 || name.length > 40) return json({ error: 'Enter a level and a name (2–40 characters).', field: 'name' }, 400);
    if (/\b(lapo|mapo|nepo)\b/i.test(name)) return json({ error: 'Rank names use Nigerian slang only — no Lapo, Mapo or Nepo.', field: 'name' }, 400);
    await env.DB.prepare('INSERT INTO ranks(level,name,min_taps,min_games,min_wins,unlocks,color) VALUES(?,?,?,?,?,?,?) ON CONFLICT(level) DO UPDATE SET name=excluded.name,min_taps=excluded.min_taps,min_games=excluded.min_games,min_wins=excluded.min_wins,unlocks=excluded.unlocks,color=excluded.color')
      .bind(level, name, clampInt(String(data.min_taps).replace(/,/g, ''), 0, 1e12, 0), clampInt(data.min_games, 0, 1e9, 0), clampInt(data.min_wins, 0, 1e9, 0), String(data.unlocks || '').replace(/[^a-z0-9,-]/gi, '').slice(0, 120), HEX.test(data.color || '') ? data.color : '#2E8BFF').run();
    clearRankCache();
    await audit(env, user.id, 'rank.save', { level, name });
    return json({ message: `Rank ${level} saved`, redirect: '/admin/ranks' });
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
    await audit(env, user.id, 'rank.recalc', String(ids.length));
    return json({ message: `Ranks recalculated for ${ids.length} players` });
  }

  // ── ads, sponsors' lead capture, home slides ──
  // Ads queue: approve, reject (with a reason the sponsor sees), hide, or delete.
  const am = path.match(/^\/api\/admin\/promos\/([^/]+)\/(approve|reject|hide|delete)$/);
  if (am && req.method === 'POST') {
    const { data } = await body();
    const ad = await env.DB.prepare('SELECT owner_id,title FROM promos WHERE id=?').bind(am[1]).first();
    if (!ad) return json({ error: 'Ad not found.' }, 404);
    const reason = String(data?.reason || '').trim().slice(0, 200);
    if (am[2] === 'reject' && reason.length < 3) return json({ error: 'Tell the sponsor why (at least 3 characters).', field: 'reason' }, 400);
    if (am[2] === 'delete') await env.DB.batch([env.DB.prepare('DELETE FROM promos WHERE id=?').bind(am[1]), env.DB.prepare('UPDATE pools SET promo_id=NULL WHERE promo_id=?').bind(am[1]), env.DB.prepare("UPDATE slides SET status='REJECTED' WHERE promo_id=?").bind(am[1])]);
    else if (am[2] === 'approve') await env.DB.prepare('UPDATE promos SET approved=1, reject_reason=NULL WHERE id=?').bind(am[1]).run();
    else if (am[2] === 'reject') await env.DB.batch([env.DB.prepare('UPDATE promos SET approved=0, reject_reason=? WHERE id=?').bind(reason, am[1]), env.DB.prepare('UPDATE pools SET promo_id=NULL WHERE promo_id=?').bind(am[1])]);
    else await env.DB.prepare('UPDATE promos SET approved=0 WHERE id=?').bind(am[1]).run();
    if (ad.owner_id && ad.owner_id !== user.id) {
      if (am[2] === 'approve') await notify(env, ad.owner_id, `Your ad “${ad.title}” is approved and live.`, '/sponsor/ads');
      if (am[2] === 'reject') await notify(env, ad.owner_id, `Your ad “${ad.title}” was not approved: ${reason}`, '/sponsor/ads');
      if (am[2] === 'delete') await notify(env, ad.owner_id, `Tap Am removed your ad “${ad.title}”.`, '/sponsor/ads');
    }
    await audit(env, user.id, 'promo.' + am[2], { id: am[1], reason: reason || undefined });
    return json({ message: { approve: 'Ad approved', reject: 'Ad rejected', hide: 'Ad hidden', delete: 'Ad deleted' }[am[2]], reload: true });
  }
  const lm = path.match(/^\/api\/admin\/sponsors\/([^/]+)\/leads$/);
  if (lm && req.method === 'POST') {
    const { data, response } = await body(); if (response) return response;
    const r = await env.DB.prepare('UPDATE sponsor_profiles SET lead_capture=? WHERE user_id=?').bind(data.on === true ? 1 : 0, lm[1]).run();
    if (!r.meta.changes) return json({ error: 'Sponsor not found.' }, 404);
    await audit(env, user.id, 'sponsor.leads', { id: lm[1], on: data.on === true });
    return json({ message: data.on === true ? 'Lead capture on for this sponsor' : 'Lead capture off', reload: true });
  }
  if (path === '/api/admin/slides' && req.method === 'POST') {
    const { data, response } = await body(); if (response) return response;
    const title = String(data.title || '').trim().slice(0, 60);
    if (title.length < 2) return json({ error: 'Give the slide a title.', field: 'title' }, 400);
    const link = String(data.link || '').trim();
    if (link && !/^\/[a-z0-9/_?=&.-]*$/i.test(link) && !/^https:\/\/[^\s"'<>]+$/i.test(link)) return json({ error: 'Use a page on Tap Am (like /pools) or a full https:// link.', field: 'link' }, 400);
    // Two kinds of slide: an uploaded picture (with a button on it), or a colour with words.
    const mode = data.mode === 'IMAGE' ? 'IMAGE' : 'COLOR';
    const image = /^\/media\/[A-Za-z0-9/_.-]+$/.test(data.image_url || '') ? data.image_url : null;
    if (mode === 'IMAGE' && !image) return json({ error: 'Upload the slide picture.', field: 'image_url' }, 400);
    const cta = String(data.cta || '').trim().slice(0, 24);
    const row = { id: data.id ? String(data.id).slice(0, 40) : uid(), title, subtitle: mode === 'COLOR' ? String(data.subtitle || '').trim().slice(0, 120) : '', link: link || null, color: HEX.test(data.color || '') ? data.color : '#2E8BFF',
      image_url: mode === 'IMAGE' ? image : null, cta: cta || null, status: data.status === 'PAUSED' ? 'PAUSED' : 'LIVE', sort: clampInt(data.sort, 0, 999, 0), created_by: user.id };
    const cols = Object.keys(row);
    await env.DB.prepare(`INSERT INTO slides(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')}) ON CONFLICT(id) DO UPDATE SET ${cols.filter(c => c !== 'id' && c !== 'created_by').map(c => `${c}=excluded.${c}`).join(',')}`).bind(...cols.map(c => row[c])).run();
    await audit(env, user.id, 'slide.save', row.id);
    return json({ message: 'Slide saved', redirect: '/admin/slides' });
  }
  const sm = path.match(/^\/api\/admin\/slides\/([^/]+)\/(approve|pause|reject|delete)$/);
  if (sm && req.method === 'POST') {
    const { data } = await body();
    const sl = await env.DB.prepare('SELECT * FROM slides WHERE id=?').bind(sm[1]).first();
    if (!sl) return json({ error: 'Slide not found.' }, 404);
    if (sm[2] === 'delete') await env.DB.prepare('DELETE FROM slides WHERE id=?').bind(sl.id).run();
    else await env.DB.prepare('UPDATE slides SET status=?, note=? WHERE id=?').bind({ approve: 'LIVE', pause: 'PAUSED', reject: 'REJECTED' }[sm[2]], String(data?.note || '').slice(0, 200) || null, sl.id).run();
    if (sl.sponsor_id && (sm[2] === 'approve' || sm[2] === 'reject')) await notify(env, sl.sponsor_id, sm[2] === 'approve' ? `Your home page slot for “${sl.title}” is live!` : `Your home page slot request for “${sl.title}” was not approved.`, '/sponsor/ads');
    await audit(env, user.id, 'slide.' + sm[2], sl.id);
    return json({ message: 'Done', reload: true });
  }

  // ── backgrounds Nepo babies can pick ──
  if (path === '/api/admin/backgrounds' && req.method === 'POST') {
    const { data, response } = await body(); if (response) return response;
    const name = String(data.name || '').trim().slice(0, 40);
    if (name.length < 2) return json({ error: 'Name the background.', field: 'name' }, 400);
    if (!HEX.test(data.color_a || '') || !HEX.test(data.color_b || '')) return json({ error: 'Pick two colours.', field: 'color_a' }, 400);
    const row = { id: data.id ? String(data.id).slice(0, 40) : 'bg-' + slug(name) + '-' + uid().slice(0, 4), name, style: ['LINEAR', 'RADIAL', 'DOTS'].includes(data.style) ? data.style : 'LINEAR', color_a: data.color_a, color_b: data.color_b,
      image_url: /^\/media\/[A-Za-z0-9/_.-]+$/.test(data.image_url || '') ? data.image_url : null, active: data.active === false ? 0 : 1, sort: clampInt(data.sort, 0, 999, 0) };
    const cols = Object.keys(row);
    await env.DB.prepare(`INSERT INTO backgrounds(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')}) ON CONFLICT(id) DO UPDATE SET ${cols.filter(c => c !== 'id').map(c => `${c}=excluded.${c}`).join(',')}`).bind(...cols.map(c => row[c])).run();
    await audit(env, user.id, 'background.save', row.id);
    return json({ message: 'Background saved', redirect: '/admin/backgrounds' });
  }
  const bm = path.match(/^\/api\/admin\/backgrounds\/([^/]+)\/delete$/);
  if (bm && req.method === 'POST') {
    await env.DB.prepare('DELETE FROM backgrounds WHERE id=?').bind(bm[1]).run();
    await audit(env, user.id, 'background.delete', bm[1]);
    return json({ message: 'Deleted', reload: true });
  }

  // ── withdrawals ──
  const wm = path.match(/^\/api\/admin\/withdrawals\/([^/]+)\/(transfer|paid|reject)$/);
  if (wm && req.method === 'POST') {
    const { data, response } = await body(); if (response) return response;
    const note = String(data.note || '').trim().slice(0, 200);
    if (wm[2] === 'reject' && note.length < 3) return json({ error: 'Write the reason. The player will see it.', field: 'note' }, 400);
    const r = await processWithdrawal(env, user, wm[1], wm[2], note);
    await audit(env, user.id, 'withdrawal.' + wm[2], wm[1]);
    if (r.ok) { const j = await r.json(); return json({ ...j, reload: true }); }
    return r;
  }

  // ── merch (shown on /merch) ──
  if (path === '/api/admin/merch' && req.method === 'POST') {
    const { data, response } = await body(); if (response) return response;
    const name = String(data.name || '').trim().slice(0, 60);
    if (name.length < 2) return json({ error: 'Name the item.', field: 'name' }, 400);
    const link = String(data.link || '').trim();
    if (link && !/^https:\/\/[^\s"'<>]+$/i.test(link)) return json({ error: 'Use a full https:// link (or leave it empty).', field: 'link' }, 400);
    const row = { id: data.id ? String(data.id).slice(0, 40) : 'm-' + slug(name) + '-' + uid().slice(0, 4), name, description: String(data.description || '').trim().slice(0, 200),
      price_kobo: clampInt(toKobo(data.price), 0, 100000000, 0), image_url: /^\/media\/[A-Za-z0-9/_.-]+$/.test(data.image_url || '') ? data.image_url : null,
      color: HEX.test(data.color || '') ? data.color : '#2E8BFF', link: link || null, status: ['SOON', 'BUY', 'SOLD_OUT'].includes(data.status) ? data.status : 'SOON',
      active: data.active === false ? 0 : 1, sort: clampInt(data.sort, 0, 999, 0) };
    const cols = Object.keys(row);
    await env.DB.prepare(`INSERT INTO merch(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')}) ON CONFLICT(id) DO UPDATE SET ${cols.filter(c => c !== 'id').map(c => `${c}=excluded.${c}`).join(',')}`).bind(...cols.map(c => row[c])).run();
    await audit(env, user.id, 'merch.save', row.id);
    return json({ message: `${name} saved`, redirect: '/admin/merch' });
  }
  const mm = path.match(/^\/api\/admin\/merch\/([^/]+)\/(delete|toggle)$/);
  if (mm && req.method === 'POST') {
    if (mm[2] === 'delete') await env.DB.prepare('DELETE FROM merch WHERE id=?').bind(mm[1]).run();
    else await env.DB.prepare('UPDATE merch SET active=1-active WHERE id=?').bind(mm[1]).run();
    await audit(env, user.id, 'merch.' + mm[2], mm[1]);
    return json({ message: 'Done', reload: true });
  }

  // ── special badges: the super admin makes them and gives them to players ──
  if (path === '/api/admin/badges' && req.method === 'POST') {
    const { data, response } = await body(); if (response) return response;
    const name = String(data.name || '').trim().slice(0, 40);
    if (name.length < 2) return json({ error: 'Name the badge.', field: 'name' }, 400);
    const label = String(data.label || '').trim().slice(0, 3) || name.slice(0, 2).toUpperCase();
    const row = { id: data.id ? String(data.id).slice(0, 40) : slug(name) + '-' + uid().slice(0, 4), name, meaning: String(data.meaning || '').trim().slice(0, 140), color: HEX.test(data.color || '') ? data.color : '#9161FF', label, active: 1 };
    const cols = Object.keys(row);
    await env.DB.prepare(`INSERT INTO special_badges(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')}) ON CONFLICT(id) DO UPDATE SET ${cols.filter(c => c !== 'id').map(c => `${c}=excluded.${c}`).join(',')}`).bind(...cols.map(c => row[c])).run();
    await audit(env, user.id, 'badge.save', row.id);
    return json({ message: `Badge “${name}” saved`, reload: true });
  }
  const bgm = path.match(/^\/api\/admin\/badges\/([^/]+)\/(give|take|delete)$/);
  if (bgm && req.method === 'POST') {
    const { data } = await body();
    const badge = await env.DB.prepare('SELECT * FROM special_badges WHERE id=?').bind(bgm[1]).first();
    if (!badge) return json({ error: 'Badge not found.' }, 404);
    const kind = 'X:' + badge.id;
    if (bgm[2] === 'delete') {
      await env.DB.batch([env.DB.prepare('DELETE FROM badges WHERE kind=?').bind(kind), env.DB.prepare('DELETE FROM special_badges WHERE id=?').bind(badge.id)]);
      await audit(env, user.id, 'badge.delete', badge.id);
      return json({ message: 'Badge deleted', reload: true });
    }
    const target = await env.DB.prepare("SELECT id,username FROM users WHERE username=? AND role='USER'").bind(String(data?.username || '').trim()).first();
    if (!target) return json({ error: 'No player with that nickname.', field: 'username' }, 404);
    if (bgm[2] === 'give') {
      const r = await env.DB.prepare('INSERT OR IGNORE INTO badges(id,user_id,kind,period,taps) VALUES(?,?,?,?,0)').bind(uid(), target.id, kind, target.id).run();
      if (!r.meta.changes) return json({ error: `${target.username} already has this badge.` }, 409);
      await notify(env, target.id, `Tap Am gave you the “${badge.name}” badge!${badge.meaning ? ' ' + badge.meaning : ''}`, '/me');
    } else await env.DB.prepare('DELETE FROM badges WHERE kind=? AND user_id=?').bind(kind, target.id).run();
    await audit(env, user.id, 'badge.' + bgm[2], { badge: badge.id, user: target.id });
    return json({ message: bgm[2] === 'give' ? `Given to ${target.username}` : `Taken from ${target.username}`, reload: true });
  }

  // ── name emoji: one emoji + what it means. Only the owner sees the meaning. ──
  const em = path.match(/^\/api\/admin\/users\/([^/]+)\/emoji$/);
  if (em && req.method === 'POST') {
    const { data, response } = await body(); if (response) return response;
    const target = await env.DB.prepare('SELECT id,username,role FROM users WHERE id=?').bind(em[1]).first();
    if (!target || target.role !== 'USER') return json({ error: 'Player not found.' }, 404);
    const emoji = String(data.emoji || '').trim(), meaning = String(data.meaning || '').trim().slice(0, 140);
    if (!emoji) {
      await env.DB.prepare('UPDATE users SET emoji=NULL, emoji_meaning=NULL WHERE id=?').bind(target.id).run();
    } else {
      if (!oneEmoji(emoji)) return json({ error: 'Use exactly one emoji.', field: 'emoji' }, 400);
      if (meaning.length < 2) return json({ error: 'Write what the emoji means. Only the player sees it.', field: 'meaning' }, 400);
      await env.DB.prepare('UPDATE users SET emoji=?, emoji_meaning=? WHERE id=?').bind(emoji, meaning, target.id).run();
      await notify(env, target.id, 'Tap Am gave you a name emoji. Tap it on your profile to see what it means.', '/me');
    }
    // update the player's name in pools that are still running
    const live = (await env.DB.prepare('SELECT p.id FROM pool_entries e JOIN pools p ON p.id=e.pool_id WHERE e.user_id=? AND p.settled_at IS NULL AND p.ends_at>? LIMIT 20').bind(target.id, nowIso()).all()).results;
    await Promise.all(live.map(p => roomCall(env, p.id, '/emoji', { uid: target.id, emoji: emoji || null }).catch(() => {})));
    await audit(env, user.id, 'user.emoji', { id: target.id, emoji: emoji || null });
    return json({ message: emoji ? `${target.username} now has ${emoji}` : 'Emoji removed', reload: true });
  }

  // ── promo codes: a free Mapo or Nepo plan for some days ──
  if (path === '/api/admin/codes' && req.method === 'POST') {
    const { data, response } = await body(); if (response) return response;
    let code = String(data.code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!code) code = 'TAP' + Array.from(crypto.getRandomValues(new Uint8Array(6)), b => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[b % 31]).join('');
    if (code.length < 4 || code.length > 20) return json({ error: 'Codes are 4–20 letters and numbers.', field: 'code' }, 400);
    const tier = data.tier === 'NEPO' ? 'NEPO' : 'MAPO';
    const days = clampInt(data.days, 1, 730, 30);
    const maxUses = clampInt(String(data.max_uses || '1').replace(/,/g, ''), 1, 1000000, 1);
    const exp = data.expires ? Date.parse(String(data.expires)) : 0;
    if (data.expires && !exp) return json({ error: 'Pick a valid end date.', field: 'expires' }, 400);
    const r = await env.DB.prepare('INSERT OR IGNORE INTO promo_codes(code,tier,days,max_uses,expires_at,note,created_by) VALUES(?,?,?,?,?,?,?)').bind(code, tier, days, maxUses, exp ? new Date(exp).toISOString() : null, String(data.note || '').slice(0, 80) || null, user.id).run();
    if (!r.meta.changes) return json({ error: 'That code already exists.', field: 'code' }, 409);
    await audit(env, user.id, 'code.create', { code, tier, days, maxUses });
    return json({ message: `Code ${code} made: ${tier === 'NEPO' ? 'Nepo' : 'Mapo'} for ${days} days, ${maxUses} use${maxUses === 1 ? '' : 's'}.`, reload: true });
  }
  const cm = path.match(/^\/api\/admin\/codes\/([A-Z0-9]{4,20})\/toggle$/);
  if (cm && req.method === 'POST') {
    await env.DB.prepare('UPDATE promo_codes SET active=1-active WHERE code=?').bind(cm[1]).run();
    await audit(env, user.id, 'code.toggle', cm[1]);
    return json({ message: 'Done', reload: true });
  }

  // ── recovery phrases backup (CSV). Needs the admin password again; every download is logged. ──
  if (path === '/api/admin/phrases/export' && req.method === 'POST') {
    const { data, response } = await body(); if (response) return response;
    if (!await allow(env, 'phrase-export:' + user.id, 3, 3600)) return json({ error: 'Only 3 downloads an hour.' }, 429);
    const me = await env.DB.prepare('SELECT password_hash,password_salt,password_iter FROM users WHERE id=?').bind(user.id).first();
    const hp = await hashPassword(String(data.password || ''), me.password_salt, me.password_iter || 10000);
    if (!safeEqual(hp.hash, me.password_hash)) { await audit(env, user.id, 'phrases.export.denied', ''); return json({ error: 'Wrong password.', field: 'password' }, 401); }
    if (!canKeepCopies(env)) return json({ error: 'No copies are kept: set the SEED_KEY secret on the Worker first.' }, 409);
    const rows = (await env.DB.prepare("SELECT username,email,role,seed_enc,seed_set_at FROM users WHERE role!='ADMIN' AND seed_enc IS NOT NULL ORDER BY created_at LIMIT 100000").all()).results;
    const cell = v => { const s = String(v ?? ''); return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? "'" : '') + s.replace(/"/g, '""')}"` : s; };
    const lines = [['Nickname', 'Email', 'Account', 'Recovery phrase', 'Made (UTC)']];
    for (const r of rows) lines.push([r.username, r.email, r.role, (await decryptPhrase(env, r.seed_enc)) || '(cannot read: SEED_KEY changed)', r.seed_set_at]);
    await audit(env, user.id, 'phrases.export', { rows: rows.length });
    return new Response(lines.map(l => l.map(cell).join(',')).join('\r\n'), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="tap-am-recovery-phrases.csv"`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
  }

  // ── suggestions ──
  const gm = path.match(/^\/api\/admin\/suggestions\/([^/]+)\/(done|delete)$/);
  if (gm && req.method === 'POST') {
    if (gm[2] === 'delete') await env.DB.prepare('DELETE FROM suggestions WHERE id=?').bind(gm[1]).run();
    else await env.DB.prepare("UPDATE suggestions SET status='DONE' WHERE id=?").bind(gm[1]).run();
    return json({ message: 'Done', reload: true });
  }

  // ── settings ──
  if (path === '/api/admin/settings' && req.method === 'POST') {
    const { data, response } = await body(); if (response) return response;
    const stmts = [];
    for (const k of SETTING_KEYS) {
      if (data[k] === undefined) continue;
      let v = data[k];
      if (k.endsWith('_kobo')) v = String(clampInt(toKobo(v), 0, 1e12, 0));
      else if (BOOL_KEYS.includes(k)) v = v === true || v === '1' ? '1' : '0';
      else if (k === 'alert_email') { v = String(v || '').trim().toLowerCase(); if (v && !v.split(',').every(e => EMAIL_RE.test(e.trim()))) return json({ error: 'Enter valid email addresses, separated by commas.', field: k }, 400); }
      else v = String(clampInt(String(v).replace(/,/g, ''), 0, 1e9, 0));
      stmts.push(env.DB.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k, v));
    }
    if (stmts.length) await env.DB.batch(stmts);
    clearSettingsCache();
    await audit(env, user.id, 'settings', data);
    return json({ message: 'Settings saved', reload: true });
  }
  if (path === '/api/admin/health/test-email' && req.method === 'POST') {
    const s = await settings(env);
    if (!s.alert_email) return json({ error: 'Add an alert email in settings first.' }, 400);
    const r = await sendAlertEmail(env, s.alert_email, 'Tap Am test alert', 'This is a test of Tap Am system alerts. If you got this, alerts work.');
    return json(r.ok ? { message: r.test ? 'Email service not connected yet — the alert was logged instead.' : 'Test email sent.' } : { error: 'Email failed: ' + r.error }, r.ok ? 200 : 502);
  }
  return null;
}
