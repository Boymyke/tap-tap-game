// Validation rules shared by the auth API (server) and the sign-up page (client).
// Keep the client copy in src/ui/auth.js in sync with these messages.

export const MIN_AGE = 18;          // only checked when money is used (wallet, paid pools, withdrawals)
export const MAX_AGE = 100;
export const TERMS_VERSION = '2026-10-09';

export const GENDERS = [['MALE', 'Male'], ['FEMALE', 'Female'], ['NA', 'Prefer not to say']];
// Nigeria first, then Africa, then where many Nigerians live abroad.
export const COUNTRIES = [['NG', 'Nigeria'], ['GH', 'Ghana'], ['KE', 'Kenya'], ['ZA', 'South Africa'], ['CM', 'Cameroon'], ['BJ', 'Benin'], ['TG', 'Togo'], ['CI', 'Côte d’Ivoire'],
  ['SN', 'Senegal'], ['LR', 'Liberia'], ['SL', 'Sierra Leone'], ['GM', 'Gambia'], ['NE', 'Niger'], ['TD', 'Chad'], ['UG', 'Uganda'], ['TZ', 'Tanzania'], ['RW', 'Rwanda'], ['ET', 'Ethiopia'],
  ['EG', 'Egypt'], ['MA', 'Morocco'], ['ZM', 'Zambia'], ['ZW', 'Zimbabwe'], ['BW', 'Botswana'], ['NA', 'Namibia'], ['AO', 'Angola'], ['CD', 'DR Congo'], ['GB', 'United Kingdom'],
  ['IE', 'Ireland'], ['US', 'United States'], ['CA', 'Canada'], ['DE', 'Germany'], ['FR', 'France'], ['IT', 'Italy'], ['ES', 'Spain'], ['NL', 'Netherlands'], ['BE', 'Belgium'],
  ['AE', 'United Arab Emirates'], ['SA', 'Saudi Arabia'], ['QA', 'Qatar'], ['CN', 'China'], ['IN', 'India'], ['MY', 'Malaysia'], ['AU', 'Australia'], ['BR', 'Brazil'], ['OTHER', 'Other country']];
export const genderProblem = g => (GENDERS.some(x => x[0] === g) ? null : 'Pick one.');
export const countryProblem = c => (COUNTRIES.some(x => x[0] === c) ? null : 'Pick your country.');

export const NICKNAME_RE = /^[A-Za-z0-9_]{3,24}$/;
export const USERNAME_RE = NICKNAME_RE; // kept for older call sites
export const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export const RESERVED_NICKNAMES = ['admin', 'administrator', 'support', 'tapam', 'tap_am', 'ferrn', 'ferrnagency', 'moderator', 'system', 'root', 'official'];

export const COMMON_PASSWORDS = [
  '12345678', '123456789', '1234567890', '87654321', '11111111', '00000000', '12341234', '12121212',
  'password', 'password1', 'password123', 'passw0rd', 'qwerty123', 'qwertyuiop', 'abc12345', 'abcd1234',
  'iloveyou', 'admin123', 'welcome1', 'letmein1', '1q2w3e4r', 'asdfghjk', 'zxcvbnm1', 'naija123', 'lagos123',
  'password1!', 'qwerty1!', 'p@ssw0rd', 'p@ssword1', 'welcome123', 'iloveyou1', 'abc123456', 'aa123456'
];

// Each returns null when fine, otherwise a message for the player.
export function nicknameProblem(nick) {
  const n = String(nick || '').trim();
  if (!n) return 'Enter your nickname.';
  if (n.length < 3) return 'Nickname must be at least 3 characters.';
  if (n.length > 24) return 'Nickname fit only be 24 characters max.';
  if (!NICKNAME_RE.test(n)) return 'Nickname fit only get letters, numbers and _ (no space).';
  if (/^\d+$/.test(n)) return 'Nickname no fit be only numbers.';
  if (RESERVED_NICKNAMES.includes(n.toLowerCase())) return 'That nickname no dey available. Try another one.';
  return null;
}

export function emailProblem(email) {
  const e = String(email || '').trim();
  if (!e) return 'Enter your email.';
  if (e.length > EMAIL_MAX || !EMAIL_RE.test(e)) return 'That email no look correct.';
  return null;
}

export function passwordProblem(password, nickname = '') {
  const p = String(password || '');
  if (!p) return 'Enter a password.';
  if (p.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (p.length > PASSWORD_MAX) return 'Password too long.';
  const missing = [];
  if (!/[a-z]/.test(p)) missing.push('one small letter');
  if (!/[A-Z]/.test(p)) missing.push('one capital letter');
  if (!/[0-9]/.test(p)) missing.push('one number');
  if (missing.length) return 'Password still need ' + missing.join(', ') + '.';
  const lower = p.toLowerCase();
  if (COMMON_PASSWORDS.includes(lower) || /^(.)\1+$/.test(p)) return 'That password too common. Make am stronger.';
  if (nickname && nickname.length >= 3 && lower.includes(String(nickname).toLowerCase())) return 'No put your nickname inside your password.';
  return null;
}

// dob is 'YYYY-MM-DD'. Returns the whole-year age on `today`, or null if the date is not real.
export function ageFromDob(dob, today = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dob || ''));
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  let age = today.getUTCFullYear() - y;
  const beforeBirthday = today.getUTCMonth() < mo - 1 || (today.getUTCMonth() === mo - 1 && today.getUTCDate() < d);
  if (beforeBirthday) age--;
  return age;
}

export function dobProblem(dob) {
  const age = ageFromDob(dob);
  if (age === null) return 'Pick a real date.';
  if (age < 0 || age > MAX_AGE) return 'Pick a real date.';
  if (age < MIN_AGE) return `Sorry, Tap Am na for ${MIN_AGE}+ only.`;
  return null;
}
