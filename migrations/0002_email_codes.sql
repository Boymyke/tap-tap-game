-- One-time upgrade (run after 0001) for databases created before email-code sign-up.
-- Adds email verification + stronger password hashing columns and the tables for
-- email codes and rate limits. New databases created from schema.sql already have these.
-- Run with:  npm run db:upgrade:2
ALTER TABLE users ADD COLUMN email_verified_at TEXT;
ALTER TABLE users ADD COLUMN password_iter INTEGER NOT NULL DEFAULT 10000;
CREATE TABLE IF NOT EXISTS email_codes (purpose TEXT NOT NULL, email TEXT NOT NULL COLLATE NOCASE, code_hash TEXT NOT NULL, nonce TEXT NOT NULL, payload TEXT, attempts INTEGER NOT NULL DEFAULT 0, sends INTEGER NOT NULL DEFAULT 1, last_sent_at TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(purpose,email));
CREATE TABLE IF NOT EXISTS auth_throttle (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at TEXT NOT NULL);
