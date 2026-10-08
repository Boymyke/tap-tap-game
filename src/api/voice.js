// Live voice in games, using Cloudflare Realtime (SFU). Needs CALLS_APP_ID + CALLS_APP_TOKEN.
// Rules: talk = Nepo + rank ≥ voice_min_rank (Para Para Boy I) + top N in that pool.
//        listen = anyone who joined the pool. One voice room per person at a time.
import { json, readJson, nowIso } from '../lib.js';
import { requireRole, isNepo, loadUser, settings, num } from '../core.js';
import { getPool, poolState, roomCall } from '../game/pools.js';

const api = env => `https://rtc.live.cloudflare.com/v1/apps/${env.CALLS_APP_ID}`;
async function calls(env, method, path, body) {
  const r = await fetch(api(env) + path, { method, headers: { authorization: `Bearer ${env.CALLS_APP_TOKEN}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.errorCode) throw new Error(data.errorDescription || `Realtime ${r.status}`);
  return data;
}

export async function canTalk(env, user, poolId) {
  const s = await settings(env);
  const me = await loadUser(env, user.id);
  if (!isNepo(me)) return { ok: false, why: 'Only Nepo babies fit talk in games.' };
  const minRank = num(s, 'voice_min_rank', 56);
  if ((me.rank_level || 1) < minRank) return { ok: false, why: `Reach rank ${minRank} (Para Para Boy) to unlock your mic.` };
  const topN = num(s, 'voice_top_n', 5);
  const b = (await roomCall(env, poolId, `/board?uid=${user.id}&n=3`)).data;
  if (!b.me || !b.me.rank || b.me.rank > topN) return { ok: false, why: `Enter the top ${topN} for this pool to talk.` };
  return { ok: true };
}

export async function handleVoiceApi(req, env, path, user) {
  if (!path.startsWith('/api/voice/')) return null;
  const deny = requireRole(user, ['USER']); if (deny) return deny;
  if (!env.CALLS_APP_ID || !env.CALLS_APP_TOKEN) return json({ error: 'Live voice never open yet.' }, 503);

  if (path === '/api/voice/speakers' && req.method === 'GET') {
    const pool = String(new URL(req.url).searchParams.get('pool') || '');
    const since = new Date(Date.now() - 45000).toISOString();
    const rows = (await env.DB.prepare("SELECT v.session_id,v.track_name,u.username FROM voice_sessions v JOIN users u ON u.id=v.user_id WHERE v.pool_id=? AND v.mode='TALK' AND v.track_name IS NOT NULL AND v.updated_at>?").bind(pool, since).all()).results;
    return json({ speakers: rows.map(r => ({ sessionId: r.session_id, trackName: r.track_name, name: r.username })) });
  }

  const { data, response } = await readJson(req); if (response) return response;
  if (path === '/api/voice/join') {
    const pool = await getPool(env, String(data.pool || ''), user);
    if (!pool || !pool.joined) return json({ error: 'Join the pool first.' }, 403);
    if (poolState(pool) === 'ended') return json({ error: 'This pool don end.' }, 409);
    const s = await calls(env, 'POST', '/sessions/new');
    await env.DB.prepare('INSERT INTO voice_sessions(user_id,pool_id,session_id,track_name,mode,updated_at) VALUES(?,?,?,NULL,?,?) ON CONFLICT(user_id) DO UPDATE SET pool_id=excluded.pool_id,session_id=excluded.session_id,track_name=NULL,mode=excluded.mode,updated_at=excluded.updated_at')
      .bind(user.id, pool.id, s.sessionId, 'LISTEN', nowIso()).run();
    const talk = await canTalk(env, user, pool.id);
    return json({ sessionId: s.sessionId, canTalk: talk.ok, why: talk.why || null });
  }
  const v = await env.DB.prepare('SELECT * FROM voice_sessions WHERE user_id=?').bind(user.id).first();
  if (!v || v.session_id !== data.sessionId) return json({ error: 'Voice session expired. Join again.' }, 409);

  if (path === '/api/voice/publish') {
    const talk = await canTalk(env, user, v.pool_id);
    if (!talk.ok) return json({ error: talk.why }, 403);
    const trackName = 'mic-' + user.id.slice(0, 8);
    const r = await calls(env, 'POST', `/sessions/${v.session_id}/tracks/new`, { sessionDescription: { type: 'offer', sdp: String(data.sdp || '') }, tracks: [{ location: 'local', mid: String(data.mid || '0'), trackName }] });
    await env.DB.prepare("UPDATE voice_sessions SET mode='TALK',track_name=?,updated_at=? WHERE user_id=?").bind(trackName, nowIso(), user.id).run();
    return json({ sdp: r.sessionDescription.sdp, type: r.sessionDescription.type });
  }
  if (path === '/api/voice/pull') {
    const remotes = (Array.isArray(data.remotes) ? data.remotes : []).slice(0, 10).filter(x => typeof x.sessionId === 'string' && typeof x.trackName === 'string');
    if (!remotes.length) return json({ error: 'Nothing to pull.' }, 400);
    const r = await calls(env, 'POST', `/sessions/${v.session_id}/tracks/new`, { tracks: remotes.map(x => ({ location: 'remote', sessionId: x.sessionId, trackName: x.trackName })) });
    return json({ sdp: r.sessionDescription?.sdp, type: r.sessionDescription?.type, renegotiate: !!r.requiresImmediateRenegotiation, tracks: r.tracks });
  }
  if (path === '/api/voice/renegotiate') {
    await calls(env, 'PUT', `/sessions/${v.session_id}/renegotiate`, { sessionDescription: { type: 'answer', sdp: String(data.sdp || '') } });
    return json({ ok: true });
  }
  if (path === '/api/voice/heartbeat') {
    let mute = false;
    if (v.mode === 'TALK') { const t = await canTalk(env, user, v.pool_id); if (!t.ok) { mute = t.why; await env.DB.prepare("UPDATE voice_sessions SET mode='LISTEN',track_name=NULL WHERE user_id=?").bind(user.id).run(); } }
    await env.DB.prepare('UPDATE voice_sessions SET updated_at=? WHERE user_id=?').bind(nowIso(), user.id).run();
    return json({ ok: true, mute });
  }
  if (path === '/api/voice/leave') {
    await env.DB.prepare('DELETE FROM voice_sessions WHERE user_id=?').bind(user.id).run();
    return json({ ok: true });
  }
  return null;
}
