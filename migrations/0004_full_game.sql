-- One-time upgrade (run after 0003) for databases created from this repo before the full game.
-- Adds tiers (LAPO/NEPO), ranks, pools v2, winnings, payments, withdrawals, store/inventory,
-- gifts, sponsor profiles, promos (ads), notifications, voice and media.
-- Run with:  npm run db:upgrade:4
ALTER TABLE users ADD COLUMN nepo_until TEXT;
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE users ADD COLUMN games_played INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN wins INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN rank_level INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN referral_code TEXT;
ALTER TABLE users ADD COLUMN referred_by TEXT;
ALTER TABLE users ADD COLUMN referral_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN equipped_skin TEXT NOT NULL DEFAULT 'skin-boy';
ALTER TABLE users ADD COLUMN prefs TEXT NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral ON users(referral_code);
UPDATE users SET tier='LAPO' WHERE tier IN ('CIVIL_SERVANT','FREE');
UPDATE users SET tier='NEPO' WHERE tier IN ('ODOGWU','ODOGWO');

ALTER TABLE pools ADD COLUMN kind TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE pools ADD COLUMN audience TEXT NOT NULL DEFAULT 'ALL';
ALTER TABLE pools ADD COLUMN entry_fee_kobo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pools ADD COLUMN prize_kobo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pools ADD COLUMN winners_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE pools ADD COLUMN split TEXT NOT NULL DEFAULT '[100]';
ALTER TABLE pools ADD COLUMN tie_rule TEXT NOT NULL DEFAULT 'FIRST';
ALTER TABLE pools ADD COLUMN house_cut_pct INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pools ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pools ADD COLUMN join_password TEXT;
ALTER TABLE pools ADD COLUMN sponsor_user_id TEXT;
ALTER TABLE pools ADD COLUMN sponsor_name TEXT;
ALTER TABLE pools ADD COLUMN theme_color TEXT;
ALTER TABLE pools ADD COLUMN skin_url TEXT;
ALTER TABLE pools ADD COLUMN game_type TEXT NOT NULL DEFAULT 'STANDARD';
ALTER TABLE pools ADD COLUMN side_a TEXT;
ALTER TABLE pools ADD COLUMN side_b TEXT;
ALTER TABLE pools ADD COLUMN settled_at TEXT;
ALTER TABLE pool_entries ADD COLUMN raw_taps INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pool_entries ADD COLUMN side_choice TEXT;
ALTER TABLE pool_entries ADD COLUMN booster_item TEXT;
ALTER TABLE pool_entries ADD COLUMN reached_at TEXT;
ALTER TABLE pool_entries ADD COLUMN final_rank INTEGER;
ALTER TABLE pool_entries ADD COLUMN prize_kobo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pool_entries ADD COLUMN paid_kobo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE wallets ADD COLUMN winnings_kobo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE wallet_transactions ADD COLUMN balance TEXT NOT NULL DEFAULT 'WALLET';
ALTER TABLE wallet_transactions ADD COLUMN note TEXT;
ALTER TABLE store_items ADD COLUMN audience TEXT NOT NULL DEFAULT 'ALL';
ALTER TABLE store_items ADD COLUMN min_rank INTEGER NOT NULL DEFAULT 1;
ALTER TABLE store_items ADD COLUMN config TEXT NOT NULL DEFAULT '{}';
ALTER TABLE store_items ADD COLUMN giftable INTEGER NOT NULL DEFAULT 1;
ALTER TABLE store_items ADD COLUMN sort INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS sponsor_profiles (user_id TEXT PRIMARY KEY, company TEXT NOT NULL, website TEXT, logo_url TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, text TEXT NOT NULL, link TEXT, read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS ranks (level INTEGER PRIMARY KEY, name TEXT NOT NULL, min_taps INTEGER NOT NULL DEFAULT 0, min_games INTEGER NOT NULL DEFAULT 0, min_wins INTEGER NOT NULL DEFAULT 0, unlocks TEXT NOT NULL DEFAULT '', color TEXT NOT NULL DEFAULT '#00ff6e');
CREATE TABLE IF NOT EXISTS payments (reference TEXT PRIMARY KEY, user_id TEXT NOT NULL, purpose TEXT NOT NULL, amount_kobo INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', provider TEXT NOT NULL DEFAULT 'paystack', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, verified_at TEXT);
CREATE TABLE IF NOT EXISTS withdrawals (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, amount_kobo INTEGER NOT NULL, bank_name TEXT, bank_code TEXT NOT NULL, account_number TEXT NOT NULL, account_name TEXT, status TEXT NOT NULL DEFAULT 'PENDING', transfer_code TEXT, admin_note TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT);
CREATE TABLE IF NOT EXISTS inventory (user_id TEXT NOT NULL, item_id TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 0, acquired_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id,item_id), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(item_id) REFERENCES store_items(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS gifts (id TEXT PRIMARY KEY, from_user_id TEXT, to_user_id TEXT NOT NULL, item_id TEXT NOT NULL, quantity INTEGER NOT NULL, note TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS promos (id TEXT PRIMARY KEY, title TEXT NOT NULL, owner_id TEXT, kind TEXT NOT NULL DEFAULT 'IMAGE', image_url TEXT, video_id TEXT, target_url TEXT, placement TEXT NOT NULL DEFAULT 'ALL', pool_id TEXT, active INTEGER NOT NULL DEFAULT 1, approved INTEGER NOT NULL DEFAULT 0, views INTEGER NOT NULL DEFAULT 0, clicks INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS media (key TEXT PRIMARY KEY, owner_id TEXT NOT NULL, content_type TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS voice_sessions (user_id TEXT PRIMARY KEY, pool_id TEXT NOT NULL, session_id TEXT NOT NULL, track_name TEXT, mode TEXT NOT NULL DEFAULT 'LISTEN', updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_pool_entries_user ON pool_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_wtx_user ON wallet_transactions(user_id,created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id,read);
CREATE INDEX IF NOT EXISTS idx_promos_active ON promos(active,approved);
INSERT OR IGNORE INTO inventory(user_id,item_id,quantity) SELECT user_id,item_id,quantity FROM user_boosters WHERE quantity>0 AND item_id IN (SELECT id FROM store_items);
INSERT OR IGNORE INTO settings(key,value) VALUES
  ('landing_demo_pools','1'), ('nepo_monthly_kobo','1300000'), ('nepo_yearly_kobo','12000000'),
  ('min_withdraw_lapo_kobo','1000000'), ('min_withdraw_nepo_kobo','500000'), ('starter_boosters','3'), ('nepo_bonus_boosters','5'),
  ('referral_batch','10'), ('max_multi_pools','10'), ('voice_min_rank','56'), ('voice_top_n','5'), ('house_cut_pct','0');

INSERT OR IGNORE INTO store_items(id,name,description,kind,price_kobo,multiplier,duration_seconds,audience,min_rank,config,giftable,sort) VALUES
  ('booster-2x','Turbo 2×','Double every tap for 20 seconds.','BOOSTER',20000,2,20,'ALL',1,'{"color":"#00ff6e"}',1,1),
  ('booster-3x','Wahala 3×','Triple taps for 15 seconds.','BOOSTER',50000,3,15,'NEPO',1,'{"color":"#efc032"}',1,2),
  ('booster-5x','Odogwu 5×','Five times every tap for 10 seconds.','BOOSTER',100000,5,10,'NEPO',20,'{"color":"#e2802a"}',1,3),
  ('skin-boy','Boy tap pad','The classic boy pad.','SKIN',0,1,0,'ALL',1,'{"bg":"#1c5a33","art":"boy"}',0,10),
  ('skin-girl','Girl tap pad','The classic girl pad.','SKIN',0,1,0,'ALL',1,'{"bg":"#e2802a","art":"girl"}',0,11),
  ('skin-gold','Gold rush','Shiny gold pad for big boys.','SKIN',150000,1,0,'NEPO',1,'{"bg":"#efc032","art":"star"}',1,12),
  ('skin-kente','Kente','Woven colours, proudly ours.','SKIN',200000,1,0,'NEPO',10,'{"bg":"#d8a73a","pattern":"kente"}',1,13),
  ('skin-neon','Neon night','Glow-in-the-dark pad.','SKIN',300000,1,0,'NEPO',30,'{"bg":"#06140b","art":"bolt","glow":true}',1,14),
  ('shape-rounded','Soft corners','Rounded tap box.','SHAPE',0,1,0,'NEPO',1,'{"shape":"rounded"}',0,20),
  ('shape-circle','Circle','Round tap box.','SHAPE',50000,1,0,'NEPO',5,'{"shape":"circle"}',1,21),
  ('shape-hex','Hexagon','Six sides of pressure.','SHAPE',80000,1,0,'NEPO',15,'{"shape":"hex"}',1,22);
