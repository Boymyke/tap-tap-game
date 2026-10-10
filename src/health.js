// System health: checks that run from the cron sweep (every 15 minutes), raise alerts, email the
// super admin (at most once every 12 hours per problem) and explain what to do about each one.
import { nowIso } from './lib.js';
import { settings, num, lagosDay } from './core.js';
import { paystackOn, testPayments } from './api/money.js';
import { emailConfigured, sendAlertEmail } from './email.js';

const H = 3600000;
const ago = ms => new Date(Date.now() - ms).toISOString();

export async function runChecks(env) {
  const s = await settings(env);
  const today = lagosDay();
  const [backlog, oldW, failedW, errors, players, flags, online, cron] = await env.DB.batch([
    env.DB.prepare("SELECT COUNT(*) n FROM pools WHERE settled_at IS NULL AND status!='CANCELLED' AND ends_at<?").bind(ago(10 * 60000)),
    env.DB.prepare("SELECT COUNT(*) n FROM withdrawals WHERE status='PENDING' AND created_at<?").bind(ago(24 * H)),
    env.DB.prepare("SELECT COUNT(*) n FROM withdrawals WHERE status='FAILED' AND updated_at>?").bind(ago(24 * H)),
    env.DB.prepare("SELECT COALESCE(SUM(n),0) n FROM metrics WHERE key='errors' AND day=?").bind(today),
    env.DB.prepare("SELECT COALESCE(SUM(n),0) n FROM metrics WHERE key='players' AND day=?").bind(today),
    env.DB.prepare("SELECT COUNT(*) n FROM audit_logs WHERE action='anticheat.flag' AND created_at>?").bind(ago(24 * H)),
    env.DB.prepare('SELECT COUNT(*) n FROM visitors WHERE last_seen>?').bind(ago(120000)),
    env.DB.prepare("SELECT value FROM settings WHERE key='cron_last'")
  ]);
  const n = r => Number(r.results?.[0]?.n || 0);
  const dbBytes = num(s, 'db_bytes', 0);
  const cronAt = cron.results?.[0]?.value;
  const checks = [];
  const add = (key, level, title, detail, action) => checks.push({ key, level, title, detail, action });

  add('cron', !cronAt ? 'warn' : Date.now() - Date.parse(cronAt) > 20 * 60000 ? 'crit' : 'ok', 'Scheduled jobs', cronAt ? `Last ran ${Math.round((Date.now() - Date.parse(cronAt)) / 60000)} min ago.` : 'Has not run yet.',
    cronAt && Date.now() - Date.parse(cronAt) > 20 * 60000 ? 'Check the Cron Triggers on the worker in the Cloudflare dashboard. Prizes are still paid by each pool’s own timer.' : '');
  add('settle', n(backlog) ? 'crit' : 'ok', 'Prize payouts', n(backlog) ? `${n(backlog)} ended pool(s) not paid out after 10 minutes.` : 'Every ended pool has been paid out.', n(backlog) ? 'Open Admin → Pools → Ended and press “Pay out”. If it keeps happening, check worker errors in the Cloudflare dashboard.' : '');
  add('withdrawals', n(oldW) ? 'warn' : 'ok', 'Withdrawals', n(oldW) ? `${n(oldW)} withdrawal(s) waiting more than 24 hours.` : 'No withdrawal waiting more than a day.', n(oldW) ? 'Open Admin → Payouts and pay or reject them.' : '');
  add('transfers', n(failedW) ? 'warn' : 'ok', 'Bank transfers', n(failedW) ? `${n(failedW)} transfer(s) failed in the last 24 hours (money went back to winnings).` : 'No failed transfers.', n(failedW) ? 'Check your Paystack balance and the account details, then ask the players to try again.' : '');
  add('errors', n(errors) > 500 ? 'crit' : n(errors) > 50 ? 'warn' : 'ok', 'Server errors today', `${n(errors)} error(s).`, n(errors) > 50 ? 'Open Workers → tap-am → Logs in the Cloudflare dashboard to see what is failing.' : '');
  add('cheat', n(flags) > 20 ? 'warn' : 'ok', 'Fair play', `${n(flags)} player(s) flagged for tapping faster than allowed in the last 24 hours.`, n(flags) > 20 ? 'Look at flagged players (Admin → Users) before paying their withdrawals.' : '');
  const gb = dbBytes / 1e9;
  add('db', gb > 9 ? 'crit' : gb > 7 ? 'warn' : 'ok', 'Database size', dbBytes ? `${gb.toFixed(2)} GB of the 10 GB limit.` : 'Not measured yet.', gb > 7 ? 'Time to scale: archive old notifications and finished pools, or move tap stats to a second database. Talk to your developer.' : '');
  const pl = n(players);
  add('scale', pl > 50000 ? 'warn' : 'ok', 'Traffic', `${pl.toLocaleString('en-NG')} player-games today · ${n(online).toLocaleString('en-NG')} people on the site right now.`,
    pl > 50000 ? 'Time to scale: check Workers, Durable Objects and D1 usage in the Cloudflare dashboard, turn on D1 read replication, and ask Cloudflare about an Enterprise plan.' : pl > 5000 ? 'Growing well. Keep an eye on the Cloudflare bill (Workers Paid plan).' : '');
  add('payments', paystackOn(env) ? 'ok' : testPayments(env) ? 'warn' : 'crit', 'Payments', paystackOn(env) ? 'Paystack connected.' : testPayments(env) ? 'Test mode: payments are simulated.' : 'Payments are switched off.', paystackOn(env) ? '' : 'Add the PAYSTACK_SECRET_KEY secret to the worker once your Paystack business account is live.');
  add('email', emailConfigured(env) ? 'ok' : 'warn', 'Email', emailConfigured(env) ? 'Sign-up and alert emails are being sent.' : 'No email service connected: sign-up codes show on screen (test mode) and alerts are only logged.', emailConfigured(env) ? '' : 'Add RESEND_API_KEY and EMAIL_FROM to the worker.');
  add('uploads', env.MEDIA ? 'ok' : 'warn', 'Picture uploads', env.MEDIA ? 'R2 storage connected.' : 'R2 storage is off, so ads, skins and slides can’t use uploaded pictures.', env.MEDIA ? '' : 'Turn on R2 in the Cloudflare dashboard and add the MEDIA bucket binding.');
  if (!s.alert_email) add('alertmail', 'warn', 'Alert emails', 'No alert email address set.', 'Add one in Admin → Overview → Settings.');
  return { checks, dbBytes };
}

// Called by the cron sweep: record alerts, email new or still-open problems, resolve fixed ones.
export async function healthSweep(env) {
  const { checks } = await runChecks(env);
  const s = await settings(env);
  const now = nowIso();
  const bad = checks.filter(c => c.level !== 'ok' && !['payments', 'email', 'uploads', 'alertmail'].includes(c.key));   // setup items show on the page only
  const toEmail = [];
  for (const c of bad) {
    const msg = `${c.title}: ${c.detail}${c.action ? ' → ' + c.action : ''}`;
    const row = await env.DB.prepare('SELECT * FROM alerts WHERE key=?').bind(c.key).first();
    if (!row || row.resolved_at) await env.DB.prepare('INSERT INTO alerts(key,level,message,first_at,last_at) VALUES(?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET level=excluded.level,message=excluded.message,first_at=excluded.first_at,last_at=excluded.last_at,emailed_at=NULL,resolved_at=NULL').bind(c.key, c.level, msg, now, now).run();
    else await env.DB.prepare('UPDATE alerts SET level=?, message=?, last_at=? WHERE key=?').bind(c.level, msg, now, c.key).run();
    const last = row && !row.resolved_at ? row.emailed_at : null;
    if (!last || Date.now() - Date.parse(last) > 12 * H) toEmail.push(c);
  }
  const okKeys = checks.filter(c => c.level === 'ok').map(c => c.key);
  if (okKeys.length) await env.DB.prepare(`UPDATE alerts SET resolved_at=? WHERE resolved_at IS NULL AND key IN (${okKeys.map(() => '?').join(',')})`).bind(now, ...okKeys).run();
  if (toEmail.length && s.alert_email) {
    const crit = toEmail.some(c => c.level === 'crit');
    const r = await sendAlertEmail(env, s.alert_email, `${crit ? '[Urgent]' : '[Check]'} Tap Am needs attention (${toEmail.length})`, toEmail.map(c => `• ${c.title}: ${c.detail}\n  What to do: ${c.action || 'Check the admin health page.'}`).join('\n\n'));
    if (r.ok) await env.DB.prepare(`UPDATE alerts SET emailed_at=? WHERE key IN (${toEmail.map(() => '?').join(',')})`).bind(now, ...toEmail.map(c => c.key)).run();
  }
  return bad.length;
}
