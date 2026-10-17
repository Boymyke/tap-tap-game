-- Launch features (17 Oct 2026): players needed + caps for every pool, email preferences, invite emails,
-- inner circle, home-slot ad applications, slide expiry, generic email jobs, 15-second ads, more boosters.
ALTER TABLE pools ADD COLUMN min_players INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN allow_invites INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN email_games INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN inner_circle INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN inner_circle_at TEXT;
ALTER TABLE pool_invites ADD COLUMN emailed_at TEXT;
ALTER TABLE email_jobs ADD COLUMN payload TEXT;
ALTER TABLE slides ADD COLUMN expires_at TEXT;
ALTER TABLE slides ADD COLUMN request_id TEXT;
CREATE TABLE IF NOT EXISTS ad_requests (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, youtube_url TEXT, image_url TEXT, target_url TEXT, details TEXT,
  period TEXT NOT NULL, units INTEGER NOT NULL DEFAULT 1, price_kobo INTEGER NOT NULL DEFAULT 0, paid_from TEXT, status TEXT NOT NULL DEFAULT 'PENDING', admin_note TEXT,
  slide_id TEXT, live_until TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT);
CREATE INDEX IF NOT EXISTS idx_ad_requests_user ON ad_requests(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ad_requests_status ON ad_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_users_referred ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_wtx_user_type ON wallet_transactions(user_id, type);
-- Lapo-only pools now let everybody in, playing as Lapo babies.
UPDATE pools SET lapo_rules=1 WHERE audience='LAPO';
-- Every ad shows for 15 seconds.
UPDATE promos SET duration_seconds=15;
INSERT OR IGNORE INTO settings(key,value) VALUES ('opt_lapo_rules','1'), ('opt_boosters','1'), ('top_games_email','1'),
  ('slide_price_day_kobo','500000'), ('slide_price_week_kobo','3000000'), ('slide_price_month_kobo','10000000'), ('slide_price_year_kobo','100000000'),
  ('inner_circle_rules', '');
-- More boosters (the super admin can add more in Admin → Store).
INSERT OR IGNORE INTO store_items(id,name,description,kind,price_kobo,multiplier,duration_seconds,audience,min_rank,config,active,sort,per_game_limit) VALUES
  ('b-quick-3x','Quick Hands 3×','3× taps for 8 seconds.','BOOSTER',30000,3,8,'ALL',1,'{"color":"#21D4C8"}',1,12,0),
  ('b-long-15x','Long Ride 1.5×','1.5× taps for 45 seconds.','BOOSTER',40000,1.5,45,'ALL',1,'{"color":"#9161FF"}',1,13,0),
  ('b-mapo-jollof','Jollof Heat 3×','3× taps for 25 seconds.','BOOSTER',150000,3,25,'MAPO',1,'{"color":"#FF8A2A"}',1,45,0),
  ('b-mapo-okada','Okada Dash 5×','5× taps for 6 seconds.','BOOSTER',180000,5,6,'MAPO',1,'{"color":"#FFD23F"}',1,46,0),
  ('b-nepo-lekki','Lekki Toll 8×','8× taps for 8 seconds.','BOOSTER',450000,8,8,'NEPO',15,'{"color":"#2E8BFF"}',1,51,0),
  ('b-nepo-owambe','Big Owambe 4×','4× taps for 30 seconds. One per game.','BOOSTER',600000,4,30,'NEPO',20,'{"color":"#FF4FA3"}',1,50,1);
-- Pictures: what each upload is for, and the bytes themselves when R2 storage is off (small files only).
ALTER TABLE media ADD COLUMN purpose TEXT;
ALTER TABLE media ADD COLUMN data BLOB;
CREATE INDEX IF NOT EXISTS idx_media_owner ON media(owner_id);
