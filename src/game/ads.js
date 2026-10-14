// Which ad (if any) a pool shows. Rules:
// - Pools made by the super admin show the ad picked for that pool, otherwise Tap Am's one running ad.
//   promo_id 'NONE' means the admin chose "no ad" for that pool.
// - Pools made by a sponsor show only the sponsor's own ad picked for that pool.
// - Pools made by players (and tap-offs) never show ads.
// Only approved, switched-on ads are ever shown.
const COLS = `a.id,a.title,a.kind,a.image_url,a.video_id,a.target_url,a.owner_id,a.duration_seconds,COALESCE(sp.company,'Tap Am') AS company,COALESCE(sp.lead_capture,0) AS lead_capture`;
const FROM = 'FROM promos a LEFT JOIN sponsor_profiles sp ON sp.user_id=a.owner_id';
export const NO_AD = 'NONE';

export async function runningAdminAd(env) {
  return env.DB.prepare(`SELECT ${COLS} ${FROM} JOIN users ou ON ou.id=a.owner_id WHERE ou.role='ADMIN' AND a.active=1 AND a.approved=1 ORDER BY a.created_at DESC LIMIT 1`).first();
}

export async function poolAd(env, poolOrId) {
  const p = typeof poolOrId === 'string'
    ? await env.DB.prepare('SELECT p.id,p.promo_id,p.created_by,u.role AS creator_role FROM pools p LEFT JOIN users u ON u.id=p.created_by WHERE p.id=?').bind(poolOrId).first()
    : poolOrId;
  if (!p || p.promo_id === NO_AD) return null;
  const role = p.creator_role || (p.created_by ? (await env.DB.prepare('SELECT role FROM users WHERE id=?').bind(p.created_by).first())?.role : null);
  if (role === 'ADMIN') {
    if (p.promo_id) { const a = await env.DB.prepare(`SELECT ${COLS} ${FROM} WHERE a.id=? AND a.active=1 AND a.approved=1`).bind(p.promo_id).first(); if (a) return a; }
    return runningAdminAd(env);
  }
  if (role === 'SPONSOR') {
    return env.DB.prepare(`SELECT ${COLS} ${FROM} WHERE a.owner_id=? AND a.active=1 AND a.approved=1 AND (a.id=? OR (? IS NULL AND a.pool_id=?)) ORDER BY CASE WHEN a.id=? THEN 0 ELSE 1 END LIMIT 1`)
      .bind(p.created_by, p.promo_id || '', p.promo_id || null, p.id, p.promo_id || '').first();
  }
  return null;
}

// Seconds a pool's pre-game ad needs, so the game can start only after it has finished (plus a short gap).
export async function adLeadMs(env, pool) {
  const a = await poolAd(env, pool);
  return a ? (Math.max(5, Number(a.duration_seconds) || 5) + 5) * 1000 : 0;
}
