-- In-game time purchases are a fee for extra time (kept by Tap Am), separate from the prize pot.
CREATE TABLE IF NOT EXISTS pool_time_buys (id TEXT PRIMARY KEY, pool_id TEXT NOT NULL, user_id TEXT NOT NULL, amount_kobo INTEGER NOT NULL, seconds INTEGER NOT NULL DEFAULT 0, balance TEXT NOT NULL DEFAULT 'WALLET', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_timebuys_pool ON pool_time_buys(pool_id);
-- Tap-off options (the same switches as a normal pool).
ALTER TABLE challenges ADD COLUMN time_topup INTEGER NOT NULL DEFAULT 0;
ALTER TABLE challenges ADD COLUMN lapo_rules INTEGER NOT NULL DEFAULT 0;
ALTER TABLE challenges ADD COLUMN boosters_allowed INTEGER NOT NULL DEFAULT 1;
-- Top winner badges (day / month / year) record the amount won.
ALTER TABLE badges ADD COLUMN amount_kobo INTEGER NOT NULL DEFAULT 0;
-- Winnings and badges are public for every player now (the hide option is gone).
UPDATE users SET hide_profile=0 WHERE hide_profile!=0;
