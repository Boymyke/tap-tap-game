// Sends Tap Am emails from no-reply@tapammm.live. Uses the first option that is configured:
//   1. ZeptoMail (Zoho)          — secret ZEPTOMAIL_TOKEN (the "Send Mail token"), var EMAIL_FROM,
//                                  optional ZEPTOMAIL_HOST (api.zeptomail.com; .eu / .in for those data centres)
//   2. Cloudflare Email Service  — a `send_email` binding named EMAIL, plus EMAIL_FROM
//   3. Resend                    — secret RESEND_API_KEY, plus EMAIL_FROM
//   4. Test mode                 — OTP_DEV_MODE = "1": nothing is sent and the code is returned
//                                  to the page. Only for the preview Worker.
import { esc } from './lib.js';

export const emailProvider = env => env.ZEPTOMAIL_TOKEN && env.EMAIL_FROM ? 'zeptomail' : env.EMAIL && env.EMAIL_FROM ? 'cloudflare' : env.RESEND_API_KEY && env.EMAIL_FROM ? 'resend' : null;
export const emailConfigured = env => Boolean(emailProvider(env));
export const testMode = env => env.OTP_DEV_MODE === '1' && !emailConfigured(env);

export function maskEmail(email) {
  const [name, domain] = String(email).split('@');
  if (!domain) return email;
  const shown = name.length <= 2 ? name[0] : name.slice(0, 2);
  return `${shown}${'*'.repeat(Math.max(2, name.length - shown.length))}@${domain}`;
}

// One send through whichever provider is set. Throws on a provider error; { test: true } when none is set.
async function send(env, { to, name = 'Tap Am', subject, text, html }) {
  const list = (Array.isArray(to) ? to : [to]).filter(Boolean);
  const p = emailProvider(env);
  if (p === 'zeptomail') {
    const token = String(env.ZEPTOMAIL_TOKEN).trim();
    const r = await fetch(`https://${env.ZEPTOMAIL_HOST || 'api.zeptomail.com'}/v1.1/email`, {
      method: 'POST',
      headers: { authorization: token.startsWith('Zoho-enczapikey') ? token : `Zoho-enczapikey ${token}`, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ from: { address: env.EMAIL_FROM, name }, to: list.map(a => ({ email_address: { address: a } })), subject, htmlbody: html, textbody: text })
    });
    if (!r.ok) throw new Error(`ZeptoMail error ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return { sent: true };
  }
  if (p === 'cloudflare') { for (const t of list) await env.EMAIL.send({ to: t, from: { email: env.EMAIL_FROM, name }, subject, text, html }); return { sent: true }; }
  if (p === 'resend') {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: `${name} <${env.EMAIL_FROM}>`, to: list, subject, text, html }) });
    if (!r.ok) throw new Error(`Resend error ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return { sent: true };
  }
  return { sent: false, test: true };
}

// ── the Tap Am email look: purple page, white card, the TAP AM mark, green call to action ──
const SITE = env => env?.PUBLIC_URL || 'https://tapammm.live';
function frame({ pre = '', body, foot = '', site = 'https://tapammm.live' }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Tap Am</title></head>
<body style="margin:0;padding:0;background:#2A0F8F">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(pre)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#2A0F8F" style="background:#2A0F8F"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">
<tr><td align="center" style="padding:0 0 18px;font-family:'Arial Black',Arial,sans-serif;font-size:30px;font-weight:900;font-style:italic;color:#ffffff;letter-spacing:-.5px">TAP <span style="background:#AA0FEA;color:#ffffff;padding:0 9px;border-radius:7px">AM</span></td></tr>
<tr><td bgcolor="#ffffff" style="background:#ffffff;border-radius:24px;padding:30px 26px;font-family:Arial,Helvetica,sans-serif;color:#150B33">${body}</td></tr>
<tr><td align="center" style="padding:18px 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#C9BDF5">${foot}${foot ? '<br>' : ''}<a href="${esc(site)}" style="color:#00FF6E;text-decoration:none;font-weight:bold">tapammm.live</a> · Tap Am · Powered by Ferrn Agency</td></tr>
</table></td></tr></table></body></html>`;
}
const button = (href, label) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 6px"><tr><td bgcolor="#00FF6E" style="background:#00FF6E;border-radius:14px;box-shadow:0 4px 0 #00A84D"><a href="${esc(href)}" style="display:inline-block;padding:15px 26px;font-family:'Arial Black',Arial,sans-serif;font-size:17px;font-weight:900;color:#150B33;text-decoration:none">${esc(label)}</a></td></tr></table>`;

function codeEmail({ code, purpose, site }) {
  const reset = purpose === 'reset';
  const subject = reset ? `${code} is your Tap Am reset code` : `${code} is your Tap Am sign-up code`;
  const intro = reset ? 'Use this code to set a new password for your Tap Am account.' : 'You’re one step away. Enter this code on the sign-up page to confirm your email and get your account.';
  const text = `${reset ? 'Reset your password' : 'Welcome to Tap Am!'}\n\n${intro}\n\nYour code: ${code}\n\nIt expires in 10 minutes. Never share this code — Tap Am will never ask you for it. If you didn't ask for it, ignore this email.\n\n${site}`;
  const digits = String(code).split('').map(d => `<td align="center" bgcolor="#F4F0FF" style="background:#F4F0FF;border:2px solid #E4DBFF;border-radius:12px;width:44px;height:56px;font-family:'Arial Black',Arial,sans-serif;font-size:28px;font-weight:900;color:#150B33">${esc(d)}</td>`).join('<td style="width:6px"></td>');
  const body = `<p style="margin:0 0 6px;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#9161FF">${reset ? 'Password reset' : 'Confirm your email'}</p>
<h1 style="margin:0 0 12px;font-family:'Arial Black',Arial,sans-serif;font-size:26px;line-height:1.15;color:#150B33">${reset ? 'Here’s your reset code' : 'Welcome to Tap Am! 👆'}</h1>
<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#2B2250">${esc(intro)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 18px"><tr>${digits}</tr></table>
<p style="margin:0;padding:12px 14px;border-radius:12px;background:#FFF6D6;font-size:13px;line-height:1.55;color:#4A3800">⏱ The code expires in <b>10 minutes</b>. Never share it — Tap Am will never ask you for it.</p>
<p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#5B4E86">Didn’t ask for this? Ignore this email; nobody can use your email without the code.</p>`;
  return { subject, text, html: frame({ pre: `Your code is ${code}. It expires in 10 minutes.`, body, site }) };
}

// Returns { sent: true } or { sent: false, test: true }. Throws when sending fails.
export async function sendCodeEmail(env, to, code, purpose) {
  const r = await send(env, { to, ...codeEmail({ code, purpose, site: SITE(env) }) });
  if (r.test && !testMode(env)) throw new Error('EMAIL_NOT_CONFIGURED');
  return r;
}

// System alerts for the super admin (health checks). Never throws.
export async function sendAlertEmail(env, toList, subject, message) {
  const to = String(toList || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 5);
  if (!to.length) return { ok: false, error: 'no recipients' };
  const text = `${message}\n\nOpen the Tap Am admin health page.`;
  const html = frame({ pre: subject, site: SITE(env), body: `<h1 style="margin:0 0 12px;font-family:'Arial Black',Arial,sans-serif;font-size:22px;color:#150B33">${esc(subject)}</h1><pre style="margin:0;white-space:pre-wrap;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#2B2250">${esc(message)}</pre>` });
  try {
    const r = await send(env, { to, name: 'Tap Am alerts', subject, text, html });
    if (r.test) console.log('ALERT (email not configured):', subject, message);
    return { ok: true, test: !!r.test };
  } catch (e) { return { ok: false, error: String(e?.message || e) }; }
}

// Any one-off email. Returns { sent: true } or { sent: false, test: true }. Throws on a send error.
export async function sendMail(env, to, { subject, text, html, name }) {
  return send(env, { to, name: name || 'Tap Am', subject, text, html });
}

const unsubLine = (unsub, why) => `${esc(why)} Turn it off any time in Settings${unsub ? ` or <a href="${esc(unsub)}" style="color:#00FF6E">stop these emails</a>` : ''}.`;

export function poolNewsEmail({ pool, sponsor, url, prize, unsub = '', when = '', site }) {
  const subject = `${sponsor} invites you: ${pool}`;
  const text = `${sponsor} has a new Tap Am pool for you: ${pool}.${prize ? ` Prize pool: ${prize}.` : ''}${when ? ` ${when}.` : ''}\n\nJoin here: ${url}\n\nYou get this because you said yes to pool news. Turn it off any time in Settings${unsub ? ` or here: ${unsub}` : ''}.`;
  const body = `<p style="margin:0 0 6px;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#9161FF">${esc(sponsor)} invites you</p>
<h1 style="margin:0 0 10px;font-family:'Arial Black',Arial,sans-serif;font-size:28px;line-height:1.1;color:#150B33">${esc(pool)}</h1>
${prize ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 4px"><tr><td bgcolor="#150B33" style="background:#150B33;border-radius:14px;padding:12px 16px;font-family:Arial,sans-serif;color:#C9BDF5;font-size:12px;font-weight:bold;letter-spacing:.5px;text-transform:uppercase">Prize pool<br><span style="font-family:'Arial Black',Arial,sans-serif;font-size:28px;color:#00FF6E;letter-spacing:0">${esc(prize)}</span></td></tr></table>` : ''}
${when ? `<p style="margin:10px 0 0;font-size:15px;color:#2B2250">${esc(when)}</p>` : ''}
${button(url, 'Join the pool')}
<p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#5B4E86">Fastest finger wins. Tap with your guys, top the board.</p>`;
  return { subject, text, html: frame({ pre: prize ? `Prize pool ${prize}. Tap to join.` : 'Tap to join.', body, site, foot: unsubLine(unsub, 'You get this because you said yes to pool news.') }) };
}

// A message from the Tap Am team to players (announcements).
export function announcementEmail({ title, message, link, linkLabel, unsub = '', service = false, site }) {
  const subject = title;
  const text = `${title}\n\n${message}${link ? `\n\n${link}` : ''}\n\n${service ? 'This is a service message about your Tap Am account.' : `You get this because you said yes to Tap Am news.${unsub ? ` Stop these emails: ${unsub}` : ''}`}`;
  const paras = String(message).split(/\n{2,}/).map(p => `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#2B2250">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const body = `<p style="margin:0 0 6px;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#9161FF">From the Tap Am team</p>
<h1 style="margin:0 0 14px;font-family:'Arial Black',Arial,sans-serif;font-size:26px;line-height:1.15;color:#150B33">${esc(title)}</h1>${paras}${link ? button(link, linkLabel || 'Open Tap Am') : ''}`;
  return { subject, text, html: frame({ pre: String(message).slice(0, 110), body, site, foot: service ? 'This is a service message about your Tap Am account.' : unsubLine(unsub, 'You get this because you said yes to Tap Am news.') }) };
}

// ── game emails: invites, "about to start", top games, gifts ────────────────
const kicker = t => `<p style="margin:0 0 6px;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#9161FF">${esc(t)}</p>`;
const h1 = t => `<h1 style="margin:0 0 10px;font-family:'Arial Black',Arial,sans-serif;font-size:27px;line-height:1.12;color:#150B33">${esc(t)}</h1>`;
const para = t => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#2B2250">${esc(t)}</p>`;
// A pool as a little ticket: name, prize, entry, when.
function poolTicket({ name, prize = '', entry = '', when = '', color = '#2E8BFF' }) {
  const cell = (k, v) => `<td style="padding:0 14px 0 0;font-family:Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:.5px;text-transform:uppercase;color:#C9BDF5">${esc(k)}<br><span style="font-family:'Arial Black',Arial,sans-serif;font-size:19px;letter-spacing:0;color:${k === 'Prize pool' ? '#00FF6E' : '#ffffff'}">${esc(v)}</span></td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px"><tr><td bgcolor="#150B33" style="background:#150B33;border-radius:18px;border-left:8px solid ${esc(color)};padding:16px 18px">
<div style="font-family:'Arial Black',Arial,sans-serif;font-size:20px;line-height:1.2;color:#ffffff;margin:0 0 10px">${esc(name)}</div>
<table role="presentation" cellpadding="0" cellspacing="0"><tr>${cell('Prize pool', prize || 'Akara')}${cell('Entry', entry || 'Free')}${when ? cell('When', when) : ''}</tr></table></td></tr></table>`;
}
const footFor = (unsub, why, kind) => `${esc(why)} ${unsub ? `<a href="${esc(unsub)}" style="color:#00FF6E">${esc(kind)}</a> or change it` : 'Change it'} any time in Settings.`;

export function inviteEmail({ from, pool, url, prize, entry, when, needed = 0, starting = false, unsub = '', site }) {
  const subject = starting ? `“${pool}” is starting — ${from} invited you` : `${from} invited you to “${pool}”`;
  const lead = starting ? `${from} invited you to this pool and it is starting now. Jump in before the taps fly.` : `${from} wants you in this Tap Am ${needed ? 'match' : 'pool'}. Fastest finger wins.`;
  const text = `${subject}\n\n${lead}\n${prize ? `Prize pool: ${prize}\n` : ''}Entry: ${entry || 'Free'}\n${when ? `When: ${when}\n` : ''}\nJoin here: ${url}\n\nDon't want invites? ${unsub || 'Change it in Settings.'}`;
  const body = `${kicker(starting ? 'Starting now' : 'You’re invited')}${h1(starting ? 'Your invite is going live' : `${from} invited you`)}${para(lead)}
${poolTicket({ name: pool, prize, entry, when })}
${needed ? `<p style="margin:10px 0 0;font-size:14px;color:#5B4E86">It starts by itself when <b>${esc(needed)}</b> players are in.</p>` : ''}
${button(url, starting ? 'Play now' : 'Join the pool')}`;
  return { subject, text, html: frame({ pre: lead, body, site, foot: footFor(unsub, 'You get this because a player invited you to a match.', 'Stop invites') }) };
}

export function startingEmail({ pool, url, secs = 10, site }) {
  const subject = `⏱ “${pool}” starts in ${secs} seconds`;
  const lead = `You joined “${pool}” and it starts in ${secs} seconds. Get back to the game and tap!`;
  const body = `${kicker('Game about to start')}${h1(`${secs} seconds to go!`)}${para(lead)}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0"><tr><td bgcolor="#FFD23F" style="background:#FFD23F;border-radius:16px;padding:14px 18px;font-family:'Arial Black',Arial,sans-serif;font-size:22px;color:#150B33">${esc(pool)}</td></tr></table>
${button(url, 'Back to the game')}<p style="margin:8px 0 0;font-size:13px;color:#5B4E86">Taps only count while the pool is live. The server score is the official score.</p>`;
  return { subject, text: `${lead}\n\n${url}`, html: frame({ pre: lead, body, site, foot: 'You get this because you joined this game and left the lobby.' }) };
}

export function topGamesEmail({ games, unsub = '', site }) {
  const subject = `🔥 Top Tap Am games right now`;
  const rows = games.map(g => `<tr><td style="padding:0 0 10px"><a href="${esc(g.url)}" style="text-decoration:none">${poolTicket({ name: g.name, prize: g.prize, entry: g.entry, when: g.when, color: g.live ? '#00FF6E' : '#FFD23F' })}</a></td></tr>`).join('');
  const text = `Top Tap Am games right now:\n\n${games.map(g => `• ${g.name} — ${g.prize || 'Akara'} (${g.when}) ${g.url}`).join('\n')}\n\nStop these emails: ${unsub}`;
  const body = `${kicker('For Mapo & Nepo babies')}${h1('Top games right now')}${para('The biggest live and open pools on Tap Am. Pick one and show them your finger.')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>${button(`${site}/pools`, 'See all pools')}`;
  return { subject, text, html: frame({ pre: games.map(g => g.name).slice(0, 3).join(' · '), body, site, foot: footFor(unsub, 'You get this because you’re a Mapo or Nepo baby and said yes to game emails.', 'Stop these emails') }) };
}

export function giftEmail({ what, note = '', url, site }) {
  const subject = `🎁 Tap Am sent you a gift`;
  const body = `${kicker('A gift from Tap Am')}${h1(`You got ${what}!`)}${note ? para(note) : ''}${para('It’s already in your account. Use it in your next game.')}${button(url, 'Open Tap Am')}`;
  return { subject, text: `Tap Am sent you ${what}.${note ? `\n\n${note}` : ''}\n\n${url}`, html: frame({ pre: `You got ${what}`, body, site, foot: 'This is a service message about your Tap Am account.' }) };
}
