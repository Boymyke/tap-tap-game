// Sign-up (with email code), login and password reset API.
import {
  json, uid, nowIso, hashPassword, sha256Hex, safeEqual, createSession, sessionCookie,
  clientIp, readJson, allow, clearLimit, PBKDF2_ITERATIONS, LEGACY_PBKDF2_ITERATIONS
} from './lib.js';
import { nicknameProblem, emailProblem, passwordProblem, dobProblem, TERMS_VERSION } from './auth-rules.js';
import { sendCodeEmail, maskEmail, testMode } from './email.js';
import { randomCode, giveItem, notify, settings, num } from './core.js';

// Starter boosters for every new player, plus a booster for the referrer on every Nth sign-up.
async function welcomePlayer(env, id, referrer) {
  const s = await settings(env);
  const starter = num(s, 'starter_boosters', 3);
  if (starter > 0) await giveItem(env, id, 'booster-2x', starter);
  await notify(env, id, `Welcome to Tap Am! We put ${starter} free Turbo 2× boosters for your bag.`, '/bag');
  if (referrer) {
    await env.DB.prepare('UPDATE users SET referral_count=referral_count+1 WHERE id=?').bind(referrer.id).run();
    const r = await env.DB.prepare('SELECT referral_count FROM users WHERE id=?').bind(referrer.id).first();
    const batch = num(s, 'referral_batch', 10);
    if (batch > 0 && r.referral_count % batch === 0) {
      await giveItem(env, referrer.id, 'booster-2x', 1, { gift: true, from: null, note: `${batch} friends joined` });
      await notify(env, referrer.id, `${batch} more people joined with your link! You get a free Turbo 2× booster.`, '/bag');
    }
  }
}

const CODE_TTL_MS = 10 * 60 * 1000;     // a code works for 10 minutes
const RESEND_WAIT_MS = 60 * 1000;       // one new code per minute
const MAX_SENDS = 5;                    // codes per sign-up / reset attempt
const MAX_ATTEMPTS = 5;                 // wrong guesses before the code is burned
const RECORD_TTL_MS = 60 * 60 * 1000;   // pending sign-ups are forgotten after an hour

const fieldError = (field, error, status = 400) => json({ error, field }, status);
const tooMany = msg => json({ error: msg || 'Too many tries. Wait small, then try again.' }, 429);

function newCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return String(n).padStart(6, '0');
}
const codeHash = (env, purpose, email, nonce, code) => sha256Hex(`${purpose}:${email}:${nonce}:${code}:${env.OTP_PEPPER || ''}`);

async function cleanup(env) {
  await env.DB.prepare('DELETE FROM email_codes WHERE created_at < ?').bind(new Date(Date.now() - RECORD_TTL_MS).toISOString()).run();
}

// Creates or refreshes the code for (purpose, email). Returns { code } or { wait } or { tooMany }.
async function issueCode(env, purpose, email, payload) {
  const now = Date.now();
  const existing = await env.DB.prepare('SELECT * FROM email_codes WHERE purpose=? AND email=?').bind(purpose, email).first();
  let sends = 1, createdAt = new Date(now).toISOString();
  if (existing && Date.parse(existing.created_at) + RECORD_TTL_MS > now) {
    const since = now - Date.parse(existing.last_sent_at);
    if (since < RESEND_WAIT_MS) return { wait: Math.ceil((RESEND_WAIT_MS - since) / 1000) };
    if (existing.sends >= MAX_SENDS) return { tooMany: true };
    sends = existing.sends + 1;
    createdAt = existing.created_at;
    if (payload === undefined) payload = existing.payload;
  }
  const code = newCode(), nonce = uid();
  await env.DB.prepare(`INSERT INTO email_codes(purpose,email,code_hash,nonce,payload,attempts,sends,last_sent_at,expires_at,created_at)
    VALUES(?,?,?,?,?,0,?,?,?,?)
    ON CONFLICT(purpose,email) DO UPDATE SET code_hash=excluded.code_hash,nonce=excluded.nonce,payload=excluded.payload,attempts=0,
      sends=excluded.sends,last_sent_at=excluded.last_sent_at,expires_at=excluded.expires_at,created_at=excluded.created_at`)
    .bind(purpose, email, await codeHash(env, purpose, email, nonce, code), nonce, payload ?? null, sends,
      new Date(now).toISOString(), new Date(now + CODE_TTL_MS).toISOString(), createdAt).run();
  return { code };
}

// Checks a code. Returns { row } on success or { response } with the error to send.
async function checkCode(env, purpose, email, code) {
  const row = await env.DB.prepare('SELECT * FROM email_codes WHERE purpose=? AND email=?').bind(purpose, email).first();
  if (!row || Date.parse(row.expires_at) <= Date.now()) return { response: fieldError('code', 'That code don expire. Tap "Send new code".') };
  if (row.attempts >= MAX_ATTEMPTS) {
    return { response: fieldError('code', 'Too many wrong tries. Tap "Send new code".', 429) };
  }
  const ok = safeEqual(await codeHash(env, purpose, email, row.nonce, code), row.code_hash);
  if (!ok) {
    await env.DB.prepare('UPDATE email_codes SET attempts=attempts+1 WHERE purpose=? AND email=?').bind(purpose, email).run();
    const left = MAX_ATTEMPTS - row.attempts - 1;
    return { response: fieldError('code', left > 0 ? `That code no correct. ${left} ${left === 1 ? 'try' : 'tries'} remain.` : 'Too many wrong tries. Tap "Send new code".', left > 0 ? 400 : 429) };
  }
  return { row };
}

async function deliver(env, purpose, email, code) {
  try { return await sendCodeEmail(env, email, code, purpose); }
  catch (e) {
    console.error('email send failed', purpose, e?.message || e);
    await env.DB.prepare('DELETE FROM email_codes WHERE purpose=? AND email=?').bind(purpose, email).run();
    return null;
  }
}

function codeSentBody(env, message, email, code, result) {
  return { message, email: maskEmail(email), resendIn: RESEND_WAIT_MS / 1000, expiresIn: CODE_TTL_MS / 1000, ...(result?.test && testMode(env) ? { testCode: code } : {}) };
}

const normEmail = e => String(e ?? '').trim().toLowerCase();

export async function handleAuthApi(req, env, path) {
  if (req.method !== 'POST') return null;
  const ip = clientIp(req);

  // ── Sign up, step 1: check details and email a code ──────────────────────
  if (path === '/api/signup/start' || path === '/api/signup') {
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'signup-ip:' + ip, 20, 3600)) return tooMany('Too many sign-up tries from this network. Try again later.');
    const nickname = String(data.nickname ?? data.username ?? '').trim();
    const email = normEmail(data.email), password = String(data.password ?? ''), dob = String(data.dob ?? '').trim();
    let p;
    if ((p = nicknameProblem(nickname))) return fieldError('nickname', p);
    if ((p = emailProblem(email))) return fieldError('email', p);
    if ((p = passwordProblem(password, nickname))) return fieldError('password', p);
    if ((p = dobProblem(dob))) return fieldError('dob', p);
    if (data.agree !== true) return fieldError('agree', 'Tick the box to agree before you continue.');
    const sponsor = data.accountType === 'SPONSOR';
    const company = sponsor ? String(data.company || '').trim() : '';
    if (sponsor && (company.length < 2 || company.length > 60)) return fieldError('company', 'Enter your company or brand name (2–60 characters).');
    const ref = String(data.ref || '').trim().toUpperCase();
    const refOk = /^[A-Z0-9]{4,12}$/.test(ref) ? ref : null;
    if (await env.DB.prepare('SELECT 1 FROM users WHERE username=?').bind(nickname).first()) return fieldError('nickname', 'That nickname don already dey. Try another one.', 409);
    if (await env.DB.prepare('SELECT 1 FROM users WHERE email=?').bind(email).first()) return fieldError('email', 'That email don already get account. Try Login instead.', 409);
    await cleanup(env);
    const hp = await hashPassword(password);
    const issued = await issueCode(env, 'signup', email, JSON.stringify({ nickname, hash: hp.hash, salt: hp.salt, iterations: hp.iterations, dob, role: sponsor ? 'SPONSOR' : 'USER', company, ref: sponsor ? null : refOk }));
    if (issued.wait) return json({ error: `We just send code to this email. Wait ${issued.wait}s before you ask for another one.`, retryAfter: issued.wait, field: 'email' }, 429);
    if (issued.tooMany) return tooMany('Too many codes for this email. Try again in one hour.');
    const sent = await deliver(env, 'signup', email, issued.code);
    if (!sent) return json({ error: 'We no fit send the email now. Try again small time.' }, 502);
    return json(codeSentBody(env, 'Code sent', email, issued.code, sent));
  }

  // ── Sign up, step 2: confirm the code and create the account ─────────────
  if (path === '/api/signup/verify') {
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'verify-ip:' + ip, 60, 3600)) return tooMany();
    const email = normEmail(data.email), code = String(data.code ?? '').trim();
    if (emailProblem(email)) return json({ error: 'Start the sign-up again.' }, 400);
    if (!/^\d{6}$/.test(code)) return fieldError('code', 'Enter the 6-digit code from your email.');
    const checked = await checkCode(env, 'signup', email, code); if (checked.response) return checked.response;
    const pending = JSON.parse(checked.row.payload || '{}');
    if (await env.DB.prepare('SELECT 1 FROM users WHERE username=? OR email=?').bind(pending.nickname, email).first()) {
      await env.DB.prepare("DELETE FROM email_codes WHERE purpose='signup' AND email=?").bind(email).run();
      return json({ error: 'Somebody don take that nickname or email. Start again with another one.' }, 409);
    }
    const id = uid(), now = nowIso();
    const role = pending.role === 'SPONSOR' ? 'SPONSOR' : 'USER';
    const referrer = role === 'USER' && pending.ref ? await env.DB.prepare("SELECT id,username FROM users WHERE referral_code=? AND role='USER'").bind(pending.ref).first() : null;
    let myCode = null;
    for (let i = 0; i < 5 && role === 'USER'; i++) { const c = randomCode(6); if (!await env.DB.prepare('SELECT 1 FROM users WHERE referral_code=?').bind(c).first()) { myCode = c; break; } }
    try {
      await env.DB.batch([
        env.DB.prepare('INSERT INTO users(id,username,email,password_hash,password_salt,password_iter,date_of_birth,terms_accepted_at,terms_version,email_verified_at,role,tier,referral_code,referred_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
          .bind(id, pending.nickname, email, pending.hash, pending.salt, pending.iterations, pending.dob, now, TERMS_VERSION, now, role, 'LAPO', myCode, referrer?.id || null),
        env.DB.prepare('INSERT INTO wallets(user_id,balance_kobo) VALUES(?,0)').bind(id),
        env.DB.prepare("DELETE FROM email_codes WHERE purpose='signup' AND email=?").bind(email),
        ...(role === 'SPONSOR' ? [env.DB.prepare('INSERT INTO sponsor_profiles(user_id,company) VALUES(?,?)').bind(id, pending.company)] : [])
      ]);
    } catch (e) {
      console.error('signup verify insert', e);
      return json({ error: 'Somebody don take that nickname or email. Start again with another one.' }, 409);
    }
    if (role === 'USER') await welcomePlayer(env, id, referrer);
    const sid = await createSession(id, env);
    return json({ message: 'Account created', role, redirect: role === 'SPONSOR' ? '/sponsor' : '/dashboard' }, 200, { 'set-cookie': sessionCookie(sid) });
  }

  // ── Send a fresh code (sign-up or reset) ─────────────────────────────────
  if (path === '/api/code/resend') {
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'resend-ip:' + ip, 20, 3600)) return tooMany();
    const email = normEmail(data.email), purpose = data.purpose === 'reset' ? 'reset' : 'signup';
    if (emailProblem(email)) return json({ error: 'Start again.' }, 400);
    const row = await env.DB.prepare('SELECT 1 FROM email_codes WHERE purpose=? AND email=?').bind(purpose, email).first();
    if (!row) {
      if (purpose === 'reset') return json(codeSentBody(env, 'If account dey for this email, we don send new code.', email, null, null));
      return json({ error: 'This sign-up don expire. Start again.' }, 400);
    }
    const issued = await issueCode(env, purpose, email, undefined);
    if (issued.wait) return json({ error: `Wait ${issued.wait}s before you ask for another code.`, retryAfter: issued.wait }, 429);
    if (issued.tooMany) return tooMany('Too many codes for this email. Try again in one hour.');
    const sent = await deliver(env, purpose, email, issued.code);
    if (!sent) return json({ error: 'We no fit send the email now. Try again small time.' }, 502);
    return json(codeSentBody(env, 'New code sent', email, issued.code, sent));
  }

  // ── Login ────────────────────────────────────────────────────────────────
  if (path === '/api/login') {
    const { data, response } = await readJson(req); if (response) return response;
    const identifier = String(data.identifier ?? data.email ?? '').trim(), password = String(data.password ?? '');
    if (!identifier) return fieldError('identifier', 'Enter your nickname or email.');
    if (!password) return fieldError('password', 'Enter your password.');
    if (identifier.length > 254 || password.length > 128) return json({ error: 'Wrong nickname, email or password. Check am well.' }, 401);
    const idKey = 'login-id:' + identifier.toLowerCase();
    if (!await allow(env, 'login-ip:' + ip, 40, 900) || !await allow(env, idKey, 10, 900)) return tooMany('Too many login tries. Wait 15 minutes and try again.');
    const user = identifier.includes('@')
      ? await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(identifier.toLowerCase()).first()
      : await env.DB.prepare('SELECT * FROM users WHERE username=?').bind(identifier).first();
    const wrong = () => json({ error: 'Wrong nickname, email or password. Check am well.' }, 401);
    if (!user) { await hashPassword(password); return wrong(); }   // same work either way
    const iterations = user.password_iter || LEGACY_PBKDF2_ITERATIONS;
    const hp = await hashPassword(password, user.password_salt, iterations);
    if (!safeEqual(hp.hash, user.password_hash)) return wrong();
    if (user.status && user.status !== 'ACTIVE') return json({ error: 'This account is suspended. Contact Tap Am through the Suggest page.' }, 403);
    await clearLimit(env, idKey);
    if (iterations < PBKDF2_ITERATIONS) {   // quietly upgrade old, weaker hashes
      const up = await hashPassword(password);
      await env.DB.prepare('UPDATE users SET password_hash=?,password_salt=?,password_iter=? WHERE id=?').bind(up.hash, up.salt, up.iterations, user.id).run();
    }
    const sid = await createSession(user.id, env);
    return json({ message: 'Logged in', role: user.role, redirect: user.role === 'ADMIN' ? '/admin' : user.role === 'SPONSOR' ? '/sponsor' : '/dashboard' }, 200, { 'set-cookie': sessionCookie(sid) });
  }

  // ── Forgot password, step 1: email a reset code ──────────────────────────
  if (path === '/api/password/forgot') {
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'forgot-ip:' + ip, 10, 3600)) return tooMany();
    const email = normEmail(data.email); let p;
    if ((p = emailProblem(email))) return fieldError('email', p);
    const generic = 'If account dey for this email, we don send code.';
    const user = await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first();
    if (!user) return json(codeSentBody(env, generic, email, null, null));
    await cleanup(env);
    const issued = await issueCode(env, 'reset', email, JSON.stringify({ userId: user.id }));
    if (issued.wait || issued.tooMany) return json(codeSentBody(env, generic, email, null, null));
    const sent = await deliver(env, 'reset', email, issued.code);
    if (!sent) return json({ error: 'We no fit send the email now. Try again small time.' }, 502);
    return json(codeSentBody(env, generic, email, issued.code, sent));
  }

  // ── Forgot password, step 2: confirm code and set the new password ───────
  if (path === '/api/password/reset') {
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'reset-ip:' + ip, 30, 3600)) return tooMany();
    const email = normEmail(data.email), code = String(data.code ?? '').trim(), password = String(data.password ?? '');
    if (emailProblem(email)) return json({ error: 'Start again.' }, 400);
    if (!/^\d{6}$/.test(code)) return fieldError('code', 'Enter the 6-digit code from your email.');
    const user0 = await env.DB.prepare('SELECT id,username FROM users WHERE email=?').bind(email).first();
    let p;
    if ((p = passwordProblem(password, user0?.username || ''))) return fieldError('password', p);
    const checked = await checkCode(env, 'reset', email, code); if (checked.response) return checked.response;
    const { userId } = JSON.parse(checked.row.payload || '{}');
    if (!user0 || user0.id !== userId) return json({ error: 'Start again.' }, 400);
    const hp = await hashPassword(password);
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET password_hash=?,password_salt=?,password_iter=?,email_verified_at=COALESCE(email_verified_at,?) WHERE id=?').bind(hp.hash, hp.salt, hp.iterations, nowIso(), userId),
      env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(userId),
      env.DB.prepare("DELETE FROM email_codes WHERE purpose='reset' AND email=?").bind(email)
    ]);
    const sid = await createSession(userId, env);
    return json({ message: 'Password changed' }, 200, { 'set-cookie': sessionCookie(sid) });
  }

  return null;
}
