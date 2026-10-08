-- One-time upgrade for databases created before the new sign-up form (8 Oct 2026).
-- Makes email optional and adds date_of_birth, terms_accepted_at and terms_version to users.
-- New databases created from schema.sql already have these columns: do NOT run this on them.
--
-- SQLite cannot drop a NOT NULL constraint in place, so the users table is rebuilt.
-- Dropping users fires ON DELETE CASCADE on child tables, so every child table is
-- copied first and restored afterwards. Run with:  npm run db:upgrade

PRAGMA defer_foreign_keys = on;

CREATE TABLE _bak_sessions AS SELECT * FROM sessions;
CREATE TABLE _bak_wallets AS SELECT * FROM wallets;
CREATE TABLE _bak_wallet_transactions AS SELECT * FROM wallet_transactions;
CREATE TABLE _bak_pool_entries AS SELECT * FROM pool_entries;
CREATE TABLE _bak_user_boosters AS SELECT * FROM user_boosters;

CREATE TABLE users_new (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, email TEXT UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'USER', tier TEXT NOT NULL DEFAULT 'CIVIL_SERVANT', lifetime_taps INTEGER NOT NULL DEFAULT 0, date_of_birth TEXT, terms_accepted_at TEXT, terms_version TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
INSERT INTO users_new (id, username, email, password_hash, password_salt, role, tier, lifetime_taps, created_at)
  SELECT id, username, email, password_hash, password_salt, role, tier, lifetime_taps, created_at FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

INSERT OR IGNORE INTO sessions SELECT * FROM _bak_sessions;
INSERT OR IGNORE INTO wallets SELECT * FROM _bak_wallets;
INSERT OR IGNORE INTO wallet_transactions SELECT * FROM _bak_wallet_transactions;
INSERT OR IGNORE INTO pool_entries SELECT * FROM _bak_pool_entries;
INSERT OR IGNORE INTO user_boosters SELECT * FROM _bak_user_boosters;

DROP TABLE _bak_sessions;
DROP TABLE _bak_wallets;
DROP TABLE _bak_wallet_transactions;
DROP TABLE _bak_pool_entries;
DROP TABLE _bak_user_boosters;

PRAGMA defer_foreign_keys = off;
