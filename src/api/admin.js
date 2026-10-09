// Super admin API. Every route checks the ADMIN role on the server and is written to the audit log.
import { json, readJson, uid, nowIso, allow } from '../lib.js';
import { requireRole, credit, debit, giveItem, notify, audit, clampInt, clearSettingsCache, naira, toKobo, settings } from '../core.js';
import { clearRankCache, generateRanks, recalcRank } from '../game/ranks.js';
import { roomCall, poolState } from '../game/pools.js';
import { processWithdrawal, activateTier } from './money.js';
import { sendAlertEmail } from '../email.js';

const SETTING_KEYS = ['landing_demo_pools', 'mapo_monthly_kobo', 'mapo_yearly_kobo', 'nepo_monthly_kobo', 'nepo_yearly_kobo', 'min_withdraw_lapo_kobo', 'min_withdraw_mapo_kobo', 'min_withdraw_nepo_kobo',
  'starter_boosters', 'mapo_bonus_boosters', 'nepo_bonus_boosters', 'referral_batch', 'max_multi_pools_mapo', 'max_multi_pools', 'voice_min_rank', 'voice_top_n', 'house_cut_pct',
  'tap_rate_lapo', 'tap_rate_mapo', 'tap_rate_nepo', 'tap_limits_on', 'tap_limit_daily', 'tap_limit_monthly', 'auto_payouts', 'auto_payout_max_kobo', 'auto_payout_min_age_days', 'alert_email', 'withdrawals_per_day'];
const BOOL_KEYS = ['landing_demo_pools', 'tap_limits_on', 'auto_payouts'];
const HEX = /^#[0-9a-fA-F]{6}$/;
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
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
    let rows;
    if (to === 'LIST') {
      const names = [...new Set(String(data.names || '').split(/[\s,]+/).map(x => x.trim()).filter(Boolean))].slice(0, 500);
      if (!names.length) return json({ error: 'Paste at least one nickname.', field: 'names' }, 400);
      rows = (await env.DB.prepare(`SELECT id FROM users WHERE role='USER' AND status='ACTIVE' AND username IN (${names.map(() => '?').join(',')})`).bind(...names).all()).results;
    } else {
      const now = nowIso();
      const where = to === 'NEPO' ? "AND tier='NEPO' AND (tier_until IS NULL OR tier_until>?)" : to === 'MAPO' ? "AND tier='MAPO' AND (tier_until IS NULL OR tier_until>?)" : to === 'LAPO' ? "AND (tier='LAPO' OR tier_until<=?)" : 'AND ?=?';
      rows = (await env.DB.prepare(`SELECT id FROM users WHERE role='USER' AND status='ACTIVE' ${where} LIMIT 20000`).bind(...(to === 'ALL' ? [1, 1] : [now])).all()).results;
    }
    if (!rows.length) return json({ error: 'No players match.' }, 400);
    if (data.confirm !== true) return json({ error: `This sends ${qty}× ${item.name} to ${rows.length} players. Tick confirm to send.`, field: 'confirm', count: rows.length }, 400);
    const note = String(data.note || '').slice(0, 120) || 'From Tap Am';
    for (let i = 0; i < rows.length; i += 40) {
      const chunk = rows.slice(i, i + 40), st = [];
      for (const r of chunk) {
        st.push(env.DB.prepare('INSERT INTO inventory(user_id,item_id,quantity) VALUES(?,?,?) ON CONFLICT(user_id,item_id) DO UPDATE SET quantity=quantity+excluded.quantity').bind(r.id, item.id, qty));
        st.push(env.DB.prepare('INSERT INTO notifications(id,user_id,text,link) VALUES(?,?,?,?)').bind(uid(), r.id, `Tap Am gifted you ${qty}× ${item.name}! ${note === 'From Tap Am' ? '' : note}`.trim(), '/bag'));
      }
      await env.DB.batch(st);
    }
    await audit(env, user.id, 'gift.bulk', { item: item.id, qty, to, count: rows.length });
    return json({ message: `Sent ${qty}× ${item.name} to ${rows.length} players`, reload: true });
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
      return json({ message: r.data.settled ? `Settled. ${r.data.winners} winner(s) paid.` : 'Already settled.', reload: true });
    }
    if (pm[2] === 'cancel') {
      if (pool.settled_at) return json({ error: 'Pool already settled.' }, 409);
      const c = await env.DB.prepare("UPDATE pools SET status='CANCELLED', settled_at=? WHERE id=? AND settled_at IS NULL").bind(nowIso(), pool.id).run();
      if (!c.meta.changes) return json({ error: 'Pool already settled.' }, 409);
      await roomCall(env, pool.id, '/init', { pool: { ...pool, ends_at: nowIso() } }).catch(() => {});   // stop taps now
      const paid = (await env.DB.prepare('SELECT user_id,paid_kobo FROM pool_entries WHERE pool_id=? AND paid_kobo>0').bind(pool.id).all()).results;
      for (const e of paid) { await credit(env, e.user_id, e.paid_kobo, { type: 'REFUND', reference: pool.id, note: `Refund: ${pool.name}` }); await notify(env, e.user_id, `“${pool.name}” was cancelled. Your ${naira(e.paid_kobo)} entry is back in your wallet.`, '/wallet'); }
      const seeded = Number(pool.prize_kobo) - paid.reduce((a, e) => a + e.paid_kobo, 0);
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
    if (kind === 'SKIN') { if (HEX.test(data.bg || '')) config.bg = data.bg; if (['boy', 'girl', 'star', 'bolt'].includes(data.art)) config.art = data.art; if (/^\/media\/[A-Za-z0-9/_.-]+$/.test(data.image || '')) config.image = data.image; if (data.kente === true) config.pattern = 'kente'; if (data.glow === true) config.glow = true; }
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
  const am = path.match(/^\/api\/admin\/promos\/([^/]+)\/(approve|hide|delete)$/);
  if (am && req.method === 'POST') {
    if (am[2] === 'delete') await env.DB.batch([env.DB.prepare('DELETE FROM promos WHERE id=?').bind(am[1]), env.DB.prepare('UPDATE pools SET promo_id=NULL WHERE promo_id=?').bind(am[1])]);
    else await env.DB.prepare('UPDATE promos SET approved=? WHERE id=?').bind(am[2] === 'approve' ? 1 : 0, am[1]).run();
    const ad = await env.DB.prepare('SELECT owner_id,title FROM promos WHERE id=?').bind(am[1]).first();
    if (ad?.owner_id && am[2] === 'approve') await notify(env, ad.owner_id, `Your ad “${ad.title}” is approved and live.`, '/sponsor/ads');
    await audit(env, user.id, 'promo.' + am[2], am[1]);
    return json({ message: 'Done', reload: true });
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
    const row = { id: data.id ? String(data.id).slice(0, 40) : uid(), title, subtitle: String(data.subtitle || '').trim().slice(0, 120), link: link || null, color: HEX.test(data.color || '') ? data.color : '#2E8BFF',
      image_url: /^\/media\/[A-Za-z0-9/_.-]+$/.test(data.image_url || '') ? data.image_url : null, status: data.status === 'PAUSED' ? 'PAUSED' : 'LIVE', sort: clampInt(data.sort, 0, 999, 0), created_by: user.id };
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
    const r = await processWithdrawal(env, user, wm[1], wm[2], String(data.note || '').slice(0, 200));
    await audit(env, user.id, 'withdrawal.' + wm[2], wm[1]);
    if (r.ok) { const j = await r.json(); return json({ ...j, reload: true }); }
    return r;
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
