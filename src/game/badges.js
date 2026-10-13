// Badges given by the cron sweep once a period (Lagos time) has ended:
// - Tapper of the day / week / month / year: the most taps in that period.
// - Top winner of the day / month / year: the most prize money won in pools that settled in that period.
import { uid } from '../lib.js';
import { periodKeys, lagosDay, notify, naira } from '../core.js';

const LABEL = { DAY: 'day', WEEK: 'week', MONTH: 'month', YEAR: 'year' };

function endedPeriods() {
  const today = lagosDay();
  const prevDay = new Date(Date.parse(today + 'T00:00:00Z') - 86400000 - 3600000 + 60000);   // yesterday (Lagos)
  const prevWeek = new Date(Date.now() - 7 * 86400000);
  const prevMonth = new Date(Date.parse(today.slice(0, 8) + '01T00:00:00Z') - 86400000);
  const prevYear = new Date(Date.parse(today.slice(0, 5) + '01-01T00:00:00Z') - 86400000);
  return [['DAY', periodKeys(prevDay).DAY], ['WEEK', periodKeys(prevWeek).WEEK], ['MONTH', periodKeys(prevMonth).MONTH], ['YEAR', periodKeys(prevYear).YEAR]];
}

// The UTC range [start, end) of a Lagos day / month / year key (D2026-10-12, M2026-09, Y2025), as ISO strings.
export function periodRange(key) {
  const k = key.slice(1), lagos = d => Date.parse(d + 'T00:00:00+01:00');
  let start, end;
  if (key[0] === 'D') { start = lagos(k); end = start + 86400000; }
  else if (key[0] === 'M') { const [y, m] = k.split('-').map(Number); start = lagos(k + '-01'); end = lagos(m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`); }
  else if (key[0] === 'Y') { start = lagos(k + '-01-01'); end = lagos(`${+k + 1}-01-01`); }
  else return null;
  return [new Date(start).toISOString(), new Date(end).toISOString()];
}

export async function awardBadges(env) {
  let given = 0;
  for (const [kind, period] of endedPeriods()) {
    // tapper of the period
    if (!await env.DB.prepare('SELECT 1 FROM badges WHERE kind=? AND period=?').bind(kind, period).first()) {
      const top = await env.DB.prepare("SELECT t.user_id, t.taps FROM tap_stats t JOIN users u ON u.id=t.user_id WHERE t.period=? AND u.status='ACTIVE' ORDER BY t.taps DESC LIMIT 1").bind(period).first();
      if (top && top.taps > 0) {
        const r = await env.DB.prepare('INSERT OR IGNORE INTO badges(id,user_id,kind,period,taps) VALUES(?,?,?,?,?)').bind(uid(), top.user_id, kind, period, top.taps).run();
        if (r.meta.changes) { given++; await notify(env, top.user_id, `You are Tapper of the ${LABEL[kind]}! ${top.taps.toLocaleString('en-NG')} taps. The badge is on your profile.`, '/me'); }
      }
    }
    // top winner of the period (day, month, year)
    if (kind === 'WEEK') continue;
    const wkind = 'WIN_' + kind;
    if (await env.DB.prepare('SELECT 1 FROM badges WHERE kind=? AND period=?').bind(wkind, period).first()) continue;
    const range = periodRange(period);
    if (!range) continue;
    // Only real prizes from pools that finished normally; ties go to whoever won first.
    const win = await env.DB.prepare(`SELECT pe.user_id, SUM(pe.prize_kobo) AS won FROM pool_entries pe JOIN pools p ON p.id=pe.pool_id JOIN users u ON u.id=pe.user_id
      WHERE pe.prize_kobo>0 AND p.settled_at>=? AND p.settled_at<? AND p.status='COMPLETED' AND u.role='USER' AND u.status='ACTIVE'
      GROUP BY pe.user_id ORDER BY won DESC, MIN(p.settled_at) ASC LIMIT 1`).bind(range[0], range[1]).first();
    if (!win || Number(win.won) <= 0) continue;
    const r = await env.DB.prepare('INSERT OR IGNORE INTO badges(id,user_id,kind,period,taps,amount_kobo) VALUES(?,?,?,?,0,?)').bind(uid(), win.user_id, wkind, period, Number(win.won)).run();
    if (r.meta.changes) { given++; await notify(env, win.user_id, `You are Top winner of the ${LABEL[kind]}! ${naira(Number(win.won))} won. The badge is on your profile.`, '/me'); }
  }
  return given;
}
