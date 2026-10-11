// Sign-up (with a 12-word recovery phrase, no email code), login, password reset and change.
import {
  json, uid, nowIso, hashPassword, sha256Hex, safeEqual, createSession, sessionCookie,
  clientIp, readJson, allow, clearLimit, PBKDF2_ITERATIONS, LEGACY_PBKDF2_ITERATIONS, currentUser
} from './lib.js';
import { newPhrase, normPhrase, phraseMatches, phraseColumns, decryptPhrase, logAuth } from './phrase.js';
import { nicknameProblem, emailProblem, passwordProblem, genderProblem, countryProblem, TERMS_VERSION } from './auth-rules.js';
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
    if (batch > 0 && referrer.role === 'USER' && r.referral_count % batch === 0) {   // sponsors' invites are counted, not rewarded
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

  // ── Sign up: check details, create the account, hand back the recovery phrase ──
  // No email code. The 12-word phrase is shown once; it resets the password later.
  if (path === '/api/signup/start' || path === '/api/signup') {
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'signup-ip:' + ip, 10, 3600)) return tooMany('Too many sign-ups from this network. Try again later.');
    const nickname = String(data.nickname ?? data.username ?? '').trim();
    const email = normEmail(data.email), password = String(data.password ?? '');
    const sponsor = data.accountType === 'SPONSOR';
    const gender = sponsor ? 'NA' : String(data.gender ?? ''), country = String(data.country ?? '').toUpperCase();
    let p;
    if ((p = nicknameProblem(nickname))) return fieldError('nickname', p);
    if ((p = emailProblem(email))) return fieldError('email', p);
    if ((p = passwordProblem(password, nickname))) return fieldError('password', p);
    if ((p = genderProblem(gender))) return fieldError('gender', p);
    if ((p = countryProblem(country))) return fieldError('country', p);
    if (data.agree !== true) return fieldError('agree', 'Tick the box to agree before you continue.');
    const company = sponsor ? String(data.company || '').trim() : '';
    if (sponsor && (company.length < 2 || company.length > 60)) return fieldError('company', 'Enter your company or brand name (2–60 characters).');
    const ref = String(data.ref || '').trim().toUpperCase();
    const refOk = !sponsor && /^[A-Z0-9]{4,12}$/.test(ref) ? ref : null;
    if (await env.DB.prepare('SELECT 1 FROM users WHERE username=?').bind(nickname).first()) return fieldError('nickname', 'That nickname don already dey. Try another one.', 409);
    if (await env.DB.prepare('SELECT 1 FROM users WHERE email=?').bind(email).first()) return fieldError('email', 'That email don already get account. Try Login instead.', 409);
    const hp = await hashPassword(password);
    const phrase = newPhrase(), ph = await phraseColumns(env, phrase);
    const id = uid(), now = nowIso();
    const role = sponsor ? 'SPONSOR' : 'USER';
    const referrer = refOk ? await env.DB.prepare("SELECT id,username,role FROM users WHERE referral_code=? AND role IN ('USER','SPONSOR') AND status='ACTIVE'").bind(refOk).first() : null;
    let myCode = null;
    for (let i = 0; i < 5; i++) { const c = randomCode(6); if (!await env.DB.prepare('SELECT 1 FROM users WHERE referral_code=?').bind(c).first()) { myCode = c; break; } }
    try {
      await env.DB.batch([
        env.DB.prepare('INSERT INTO users(id,username,email,password_hash,password_salt,password_iter,gender,country,terms_accepted_at,terms_version,role,tier,referral_code,referred_by,email_news,seed_hash,seed_salt,seed_enc,seed_set_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
          .bind(id, nickname, email, hp.hash, hp.salt, hp.iterations, gender || null, country || null, now, TERMS_VERSION, role, 'LAPO', myCode, referrer?.id || null, data.email_news === true ? 1 : 0, ph.seed_hash, ph.seed_salt, ph.seed_enc, ph.seed_set_at),
        env.DB.prepare('INSERT INTO wallets(user_id,balance_kobo) VALUES(?,0)').bind(id),
        ...(sponsor ? [env.DB.prepare('INSERT INTO sponsor_profiles(user_id,company) VALUES(?,?)').bind(id, company)] : [])
      ]);
    } catch (e) {
      console.error('signup insert', e?.message);
      return json({ error: 'Somebody don take that nickname or email. Try another one.' }, 409);
    }
    if (role === 'USER') await welcomePlayer(env, id, referrer);
    await logAuth(env, id, 'SIGNUP', req);
    const sid = await createSession(id, env);
    return json({ message: 'Account created', role, phrase, redirect: role === 'SPONSOR' ? '/sponsor' : '/dashboard' }, 200, { 'set-cookie': sessionCookie(sid) });
  }
  if (path === '/api/signup/verify') return json({ error: 'Sign-up no longer needs an email code. Start again on the sign-up page.' }, 410);

  // ── Forgot password: nickname or email + recovery phrase + new password ──
  if (path === '/api/password/recover') {
    const { data, response } = await readJson(req); if (response) return response;
    const identifier = String(data.identifier ?? '').trim();
    if (!await allow(env, 'recover-ip:' + ip, 10, 3600) || !await allow(env, 'recover-id:' + identifier.toLowerCase(), 5, 3600)) return tooMany('Too many tries. Wait one hour and try again.');
    if (!identifier) return fieldError('identifier', 'Enter your nickname or email.');
    const phrase = normPhrase(data.phrase);
    if (!phrase) return fieldError('phrase', 'Type all 12 words of your recovery phrase, with spaces between them.');
    const user = identifier.includes('@')
      ? await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(identifier.toLowerCase()).first()
      : await env.DB.prepare('SELECT * FROM users WHERE username=?').bind(identifier).first();
    const wrong = () => json({ error: 'That nickname/email and phrase don’t match.', field: 'phrase' }, 401);
    if (!user || user.role === 'ADMIN' || !await phraseMatches(user, phrase)) return wrong();
    let p;
    if ((p = passwordProblem(String(data.password ?? ''), user.username))) return fieldError('password', p);
    if (user.status === 'SUSPENDED') return json({ error: 'This account is suspended. Contact Tap Am through the Suggest page.' }, 403);
    const hp = await hashPassword(String(data.password));
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET password_hash=?,password_salt=?,password_iter=? WHERE id=?').bind(hp.hash, hp.salt, hp.iterations, user.id),
      env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(user.id)]);
    await clearLimit(env, 'login-id:' + identifier.toLowerCase());
    await logAuth(env, user.id, 'PASSWORD_RESET', req);
    await notify(env, user.id, 'Your password was changed with your recovery phrase. If this was not you, change it again now.', '/settings');
    const sid = await createSession(user.id, env);
    return json({ message: 'Password changed. You are logged in.', redirect: user.role === 'SPONSOR' ? '/sponsor' : '/dashboard' }, 200, { 'set-cookie': sessionCookie(sid) });
  }

  // ── Signed-in: change password (needs the recovery phrase), make / show the phrase ──
  if (path === '/api/password/change' || path === '/api/phrase/create' || path === '/api/phrase/show') {
    const me0 = await currentUser(req, env);
    if (!me0 || me0.role === 'ADMIN') return json({ error: 'Log in first.' }, 401);
    const { data, response } = await readJson(req); if (response) return response;
    if (!await allow(env, 'acct:' + me0.id, 10, 3600)) return tooMany('Too many tries. Wait one hour.');
    const me = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(me0.id).first();
    if (path === '/api/password/change') {
      if (!me.seed_hash) return json({ error: 'Make your recovery phrase first (below), then change your password with it.', field: 'phrase' }, 409);
      const phrase = normPhrase(data.phrase);
      if (!phrase || !await phraseMatches(me, phrase)) return fieldError('phrase', 'That recovery phrase is not correct.', 401);
      let p;
      if ((p = passwordProblem(String(data.password ?? ''), me.username))) return fieldError('password', p);
      const hp = await hashPassword(String(data.password));
      await env.DB.batch([
        env.DB.prepare('UPDATE users SET password_hash=?,password_salt=?,password_iter=? WHERE id=?').bind(hp.hash, hp.salt, hp.iterations, me.id),
        env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(me.id)]);
      await logAuth(env, me.id, 'PASSWORD_CHANGE', req);
      const sid = await createSession(me.id, env);
      return json({ message: 'Password changed. Other devices were logged out.', reload: true }, 200, { 'set-cookie': sessionCookie(sid) });
    }
    // both phrase actions need the current password
    const hp = await hashPassword(String(data.password ?? ''), me.password_salt, me.password_iter || LEGACY_PBKDF2_ITERATIONS);
    if (!safeEqual(hp.hash, me.password_hash)) return fieldError('password', 'Wrong password.', 401);
    if (path === '/api/phrase/create') {
      if (me.seed_hash && data.replace !== true) return json({ error: 'You already have a recovery phrase. Tick “make a new one” to replace it.', field: 'replace' }, 409);
      const phrase = newPhrase(), ph = await phraseColumns(env, phrase);
      await env.DB.prepare('UPDATE users SET seed_hash=?,seed_salt=?,seed_enc=?,seed_set_at=? WHERE id=?').bind(ph.seed_hash, ph.seed_salt, ph.seed_enc, ph.seed_set_at, me.id).run();
      await logAuth(env, me.id, 'PHRASE_NEW', req);
      return json({ message: 'New recovery phrase made. Write it down now.', phrase });
    }
    const phrase = await decryptPhrase(env, me.seed_enc);
    if (!phrase) return json({ error: 'We don’t keep a copy we can show. Make a new phrase instead.' }, 404);
    await logAuth(env, me.id, 'PHRASE_VIEW', req);
    return json({ phrase });
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
  // Players and sponsors log in at /login; the super admin has a separate page (/admin/login).
  if (path === '/api/login' || path === '/api/admin/login') {
    const adminLogin = path === '/api/admin/login';
    const { data, response } = await readJson(req); if (response) return response;
    const identifier = String(data.identifier ?? data.email ?? '').trim(), password = String(data.password ?? '');
    if (!identifier) return fieldError('identifier', 'Enter your nickname or email.');
    if (!password) return fieldError('password', 'Enter your password.');
    if (identifier.length > 254 || password.length > 128) return json({ error: 'Wrong nickname, email or password. Check am well.' }, 401);
    const idKey = (adminLogin ? 'admin-login-id:' : 'login-id:') + identifier.toLowerCase();
    if (!await allow(env, (adminLogin ? 'admin-login-ip:' : 'login-ip:') + ip, adminLogin ? 15 : 40, 900) || !await allow(env, idKey, adminLogin ? 5 : 10, 900)) return tooMany('Too many login tries. Wait 15 minutes and try again.');
    const user = identifier.includes('@')
      ? await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(identifier.toLowerCase()).first()
      : await env.DB.prepare('SELECT * FROM users WHERE username=?').bind(identifier).first();
    const wrong = () => json({ error: 'Wrong nickname, email or password. Check am well.' }, 401);
    if (!user) { await hashPassword(password); return wrong(); }   // same work either way
    const iterations = user.password_iter || LEGACY_PBKDF2_ITERATIONS;
    const hp = await hashPassword(password, user.password_salt, iterations);
    if (!safeEqual(hp.hash, user.password_hash)) return wrong();
    if (adminLogin && user.role !== 'ADMIN') return wrong();   // don't reveal which accounts exist
    if (!adminLogin && user.role === 'ADMIN') return json({ error: 'This account uses the admin login page.' }, 403);
    let restored = false;
    if (user.status === 'ARCHIVED') {   // archived by its owner: logging in within 30 days brings it back
      if (user.archived_at && Date.now() - Date.parse(user.archived_at) > 30 * 86400000) return json({ error: 'This account was archived more than 30 days ago. Contact Tap Am through the Suggest page to restore it.' }, 403);
      await env.DB.prepare("UPDATE users SET status='ACTIVE', archived_at=NULL WHERE id=? AND status='ARCHIVED'").bind(user.id).run();
      restored = true;
    } else if (user.status && user.status !== 'ACTIVE') return json({ error: 'This account is suspended. Contact Tap Am through the Suggest page.' }, 403);
    await clearLimit(env, idKey);
    if (iterations < PBKDF2_ITERATIONS) {   // quietly upgrade old, weaker hashes
      const up = await hashPassword(password);
      await env.DB.prepare('UPDATE users SET password_hash=?,password_salt=?,password_iter=? WHERE id=?').bind(up.hash, up.salt, up.iterations, user.id).run();
    }
    const sid = await createSession(user.id, env);
    await logAuth(env, user.id, 'LOGIN', req);
    return json({ message: restored ? 'Welcome back! Your account is active again.' : 'Logged in', restored, role: user.role, redirect: user.role === 'ADMIN' ? '/admin' : user.role === 'SPONSOR' ? '/sponsor' : '/dashboard' }, 200, { 'set-cookie': sessionCookie(sid) });
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
