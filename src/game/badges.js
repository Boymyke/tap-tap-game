// Tapper of the day / week / month / year badges, given by the cron sweep once a period has ended.
import { uid } from '../lib.js';
import { periodKeys, lagosDay, notify } from '../core.js';

const LABEL = { DAY: 'day', WEEK: 'week', MONTH: 'month', YEAR: 'year' };

function endedPeriods() {
  const today = lagosDay();
  const prevDay = new Date(Date.parse(today + 'T00:00:00Z') - 86400000 - 3600000 + 60000);   // yesterday (Lagos)
  const prevWeek = new Date(Date.now() - 7 * 86400000);
  const prevMonth = new Date(Date.parse(today.slice(0, 8) + '01T00:00:00Z') - 86400000);
  const prevYear = new Date(Date.parse(today.slice(0, 5) + '01-01T00:00:00Z') - 86400000);
  return [['DAY', periodKeys(prevDay).DAY], ['WEEK', periodKeys(prevWeek).WEEK], ['MONTH', periodKeys(prevMonth).MONTH], ['YEAR', periodKeys(prevYear).YEAR]];
}

export async function awardBadges(env) {
  let given = 0;
  for (const [kind, period] of endedPeriods()) {
    if (await env.DB.prepare('SELECT 1 FROM badges WHERE kind=? AND period=?').bind(kind, period).first()) continue;
    const top = await env.DB.prepare("SELECT t.user_id, t.taps FROM tap_stats t JOIN users u ON u.id=t.user_id WHERE t.period=? AND u.status='ACTIVE' ORDER BY t.taps DESC LIMIT 1").bind(period).first();
    if (!top || top.taps <= 0) continue;
    const r = await env.DB.prepare('INSERT OR IGNORE INTO badges(id,user_id,kind,period,taps) VALUES(?,?,?,?,?)').bind(uid(), top.user_id, kind, period, top.taps).run();
    if (r.meta.changes) { given++; await notify(env, top.user_id, `🏅 You are Tapper of the ${LABEL[kind]}! ${top.taps.toLocaleString('en-NG')} taps. The badge is on your profile.`, '/me'); }
  }
  return given;
}
