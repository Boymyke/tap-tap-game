-- Instant matches (start when N players join) and player invites.
ALTER TABLE pools ADD COLUMN instant INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pools ADD COLUMN duration_seconds INTEGER;
CREATE TABLE IF NOT EXISTS pool_invites (
  pool_id TEXT NOT NULL, user_id TEXT NOT NULL, invited_by TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(pool_id,user_id), FOREIGN KEY(pool_id) REFERENCES pools(id) ON DELETE CASCADE, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_pool_invites_user ON pool_invites(user_id);
CREATE INDEX IF NOT EXISTS idx_pools_status ON pools(status, starts_at);
INSERT OR IGNORE INTO settings(key,value) VALUES ('instant_wait_hours','24');
