-- One-time upgrade (run after 0002): visitor counter, merch waitlist, demo-pools switch.
-- Sessions are now stored as SHA-256 hashes of the cookie token, so old sessions are cleared
-- (everyone logs in once more).  Run with:  npm run db:upgrade:3
CREATE TABLE IF NOT EXISTS visitors (vid TEXT PRIMARY KEY, first_seen TEXT NOT NULL, last_seen TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_visitors_seen ON visitors(last_seen);
CREATE TABLE IF NOT EXISTS merch_interest (email TEXT NOT NULL COLLATE NOCASE, item TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(email,item));
INSERT OR IGNORE INTO settings(key,value) VALUES ('landing_demo_pools','1');
DELETE FROM sessions;
