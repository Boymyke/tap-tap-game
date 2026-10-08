// Validation rules shared by the sign-up API and the sign-up page.

export const MIN_AGE = 18;
export const TERMS_VERSION = '2026-10-08';
export const USERNAME_RE = /^[A-Za-z0-9_]{3,24}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const COMMON_PASSWORDS = [
  '12345678', '123456789', '1234567890', '87654321', '11111111', '00000000', '12341234', '12121212',
  'password', 'password1', 'password123', 'passw0rd', 'qwerty123', 'qwertyuiop', 'abc12345', 'abcd1234',
  'iloveyou', 'admin123', 'welcome1', 'letmein1', '1q2w3e4r', 'asdfghjk', 'zxcvbnm1', 'naija123', 'lagos123'
];

// Returns null when the password is fine, otherwise a message for the player.
export function passwordProblem(password, username = '') {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password is too long.';
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.includes(lower) || /^(.)\1+$/.test(password) || /^(0123456789|1234567890|9876543210)/.test(password)) return 'That password too common. Not 123456 😅';
  if (username && lower === username.toLowerCase()) return 'Password no fit be the same as your name.';
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
