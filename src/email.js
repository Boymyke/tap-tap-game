// Sends Tap Am emails. Uses the first option that is configured:
//   1. Cloudflare Email Service  — a `send_email` binding named EMAIL, plus EMAIL_FROM
//   2. Resend                    — secret RESEND_API_KEY, plus EMAIL_FROM
//   3. Test mode                 — OTP_DEV_MODE = "1": nothing is sent and the code is
//                                  returned to the page. Only for the preview Worker.
import { esc } from './lib.js';

export const emailConfigured = env => Boolean((env.EMAIL && env.EMAIL_FROM) || (env.RESEND_API_KEY && env.EMAIL_FROM));
export const testMode = env => env.OTP_DEV_MODE === '1' && !emailConfigured(env);

export function maskEmail(email) {
  const [name, domain] = String(email).split('@');
  if (!domain) return email;
  const shown = name.length <= 2 ? name[0] : name.slice(0, 2);
  return `${shown}${'*'.repeat(Math.max(2, name.length - shown.length))}@${domain}`;
}

function codeEmail({ code, purpose }) {
  const intro = purpose === 'reset'
    ? 'Use this code to set a new password for your Tap Am account.'
    : 'Use this code to finish creating your Tap Am account.';
  const subject = purpose === 'reset' ? 'Your Tap Am password reset code' : 'Your Tap Am sign-up code';
  const text = `${intro}\n\nYour code: ${code}\n\nIt expires in 10 minutes. If you didn't ask for this, ignore this email — nobody can use your email without this code.\n\nTap Am · Powered by Ferrn Agency`;
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#01240c;font-family:Roboto,Arial,sans-serif;color:#d7fff1">
<table role="presentation" width="100%" style="max-width:440px;margin:0 auto;background:#002719;border-radius:16px;padding:28px">
<tr><td style="font-size:26px;font-weight:800;color:#fff">tap <span style="color:#00ff6e">am</span></td></tr>
<tr><td style="padding:16px 0 8px;font-size:15px;line-height:1.6">${esc(intro)}</td></tr>
<tr><td style="padding:12px 0"><div style="font-size:34px;letter-spacing:10px;font-weight:700;color:#000100;background:#00ff6e;border-radius:8px;padding:14px 0;text-align:center">${esc(code)}</div></td></tr>
<tr><td style="font-size:13px;line-height:1.6;color:#8fd9b8">It expires in 10 minutes. If you didn't ask for this, ignore this email — nobody can use your email without this code.</td></tr>
<tr><td style="padding-top:20px;font-size:12px;color:#3fae86">Tap Am · Powered by Ferrn Agency</td></tr>
</table></body></html>`;
  return { subject, text, html };
}

// Returns { sent: true } or { sent: false, test: true }. Throws when sending fails.
export async function sendCodeEmail(env, to, code, purpose) {
  const { subject, text, html } = codeEmail({ code, purpose });
  if (env.EMAIL && env.EMAIL_FROM) {
    await env.EMAIL.send({ to, from: { email: env.EMAIL_FROM, name: 'Tap Am' }, subject, text, html });
    return { sent: true };
  }
  if (env.RESEND_API_KEY && env.EMAIL_FROM) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: `Tap Am <${env.EMAIL_FROM}>`, to: [to], subject, text, html })
    });
    if (!r.ok) throw new Error(`Resend error ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return { sent: true };
  }
  if (testMode(env)) return { sent: false, test: true };
  throw new Error('EMAIL_NOT_CONFIGURED');
}
