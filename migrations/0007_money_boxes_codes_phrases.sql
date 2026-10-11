-- 0007: prize top-ups, Lapo-rules pools, server-overload pause, mystery boxes, promo codes,
-- recovery phrases, sign-in history, email news + profile privacy, sponsor email blasts,
-- more boosters and skins. Safe to run once on a database that already has 0006.
ALTER TABLE pools ADD COLUMN lapo_rules INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pools ADD COLUMN paused_players TEXT;
ALTER TABLE users ADD COLUMN email_news INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN hide_profile INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN seed_hash TEXT;
ALTER TABLE users ADD COLUMN seed_salt TEXT;
ALTER TABLE users ADD COLUMN seed_enc TEXT;
ALTER TABLE users ADD COLUMN seed_set_at TEXT;
ALTER TABLE users ADD COLUMN last_free_box_at TEXT;
CREATE TABLE IF NOT EXISTS pool_topups (id TEXT PRIMARY KEY, pool_id TEXT NOT NULL, user_id TEXT NOT NULL, amount_kobo INTEGER NOT NULL, balance TEXT NOT NULL DEFAULT 'WALLET', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_topups_pool ON pool_topups(pool_id);
CREATE TABLE IF NOT EXISTS auth_events (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, kind TEXT NOT NULL, ip TEXT, ua TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_auth_events_user ON auth_events(user_id, created_at);
CREATE TABLE IF NOT EXISTS promo_codes (code TEXT PRIMARY KEY, tier TEXT NOT NULL, days INTEGER NOT NULL, max_uses INTEGER NOT NULL DEFAULT 1, used INTEGER NOT NULL DEFAULT 0, expires_at TEXT, active INTEGER NOT NULL DEFAULT 1, note TEXT, created_by TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS promo_redemptions (code TEXT NOT NULL, user_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(code, user_id));
CREATE TABLE IF NOT EXISTS email_blasts (id TEXT PRIMARY KEY, pool_id TEXT NOT NULL, sponsor_id TEXT NOT NULL, audience TEXT NOT NULL DEFAULT 'ALL', price_kobo INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'QUEUED', sent INTEGER NOT NULL DEFAULT 0, cursor TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, done_at TEXT);
CREATE INDEX IF NOT EXISTS idx_users_username_search ON users(username);
CREATE INDEX IF NOT EXISTS idx_entries_prize ON pool_entries(prize_kobo);
INSERT OR IGNORE INTO settings(key,value) VALUES ('email_blast_kobo','2500000'), ('lapo_pools_per_day','3'), ('transfer_daily_max_kobo','5000000'), ('free_box_days','3'), ('overload','0');
UPDATE settings SET value='1' WHERE key='landing_demo_pools';
INSERT OR IGNORE INTO store_items(id,name,description,kind,price_kobo,multiplier,duration_seconds,audience,min_rank,config,giftable,sort,per_game_limit) VALUES
  ('b-all-pepper','Small Pepper 1.5×','1.5× taps for 25 seconds.','BOOSTER',10000,1.5,25,'ALL',1,'{"color":"#21D4C8"}',1,30,0),
  ('b-all-jara','Jara 1.7×','A little extra: 1.7× for 20 seconds.','BOOSTER',15000,1.7,20,'ALL',1,'{"color":"#2E8BFF"}',1,31,0),
  ('b-all-quick','Quick Fire 2×','Double taps for 10 quick seconds.','BOOSTER',12000,2,10,'ALL',1,'{"color":"#00C957"}',1,32,0),
  ('b-all-steady','Steady 2×','Double taps for 30 seconds.','BOOSTER',35000,2,30,'ALL',1,'{"color":"#00A84D"}',1,33,0),
  ('b-all-mamaput','Mama Put 2.5×','2.5× taps for 15 seconds.','BOOSTER',45000,2.5,15,'ALL',1,'{"color":"#FF8A2A"}',1,34,0),
  ('b-all-okada','Okada 3×','Triple taps for 8 seconds. Hold tight.','BOOSTER',60000,3,8,'ALL',1,'{"color":"#FF4FA3"}',1,35,0),
  ('b-all-agbada','Agbada 4×','Big one: 4× for 15 seconds. One per game.','BOOSTER',750000,4,15,'ALL',1,'{"color":"#9161FF"}',1,36,1),
  ('b-all-owambe','Owambe 5×','The party booster: 5× for 12 seconds. One per game.','BOOSTER',1500000,5,12,'ALL',1,'{"color":"#FFD23F"}',1,37,1),
  ('b-mapo-danfo','Danfo 2.5×','2.5× taps for 20 seconds.','BOOSTER',40000,2.5,20,'MAPO',1,'{"color":"#FFB800"}',1,38,0),
  ('b-mapo-keke','Keke 3×','Triple taps for 20 seconds.','BOOSTER',70000,3,20,'MAPO',1,'{"color":"#00C957"}',1,39,0),
  ('b-mapo-molue','Molue 3×','Triple taps for a full 30 seconds.','BOOSTER',100000,3,30,'MAPO',1,'{"color":"#2E8BFF"}',1,40,0),
  ('b-mapo-suya','Suya 3.5×','3.5× taps for 15 seconds.','BOOSTER',90000,3.5,15,'MAPO',1,'{"color":"#FF8A2A"}',1,41,0),
  ('b-mapo-peppersoup','Pepper Soup 4×','4× taps for 10 seconds.','BOOSTER',120000,4,10,'MAPO',1,'{"color":"#E2263F"}',1,42,0),
  ('b-mapo-agege','Agege 4.5×','4.5× taps for 12 seconds.','BOOSTER',180000,4.5,12,'MAPO',5,'{"color":"#9161FF"}',1,43,0),
  ('b-mapo-thirdmainland','Third Mainland 6×','6× for 15 seconds. Rank 30. One per game.','BOOSTER',2500000,6,15,'MAPO',30,'{"color":"#21D4C8"}',1,44,1),
  ('b-mapo-lekkitoll','Lekki Toll 7×','7× for 15 seconds. Rank 40. One per game.','BOOSTER',5000000,7,15,'MAPO',40,'{"color":"#FF4FA3"}',1,45,1),
  ('b-nepo-bigboy','Big Boy 4×','4× taps for 20 seconds.','BOOSTER',150000,4,20,'NEPO',1,'{"color":"#FFB800"}',1,46,0),
  ('b-nepo-banana','Banana Island 5×','5× taps for 15 seconds.','BOOSTER',250000,5,15,'NEPO',1,'{"color":"#00C957"}',1,47,0),
  ('b-nepo-jet','Private Jet 6×','6× taps for 10 seconds.','BOOSTER',350000,6,10,'NEPO',15,'{"color":"#2E8BFF"}',1,48,0),
  ('b-nepo-yacht','Yacht 6×','6× taps for 20 seconds.','BOOSTER',600000,6,20,'NEPO',20,'{"color":"#21D4C8"}',1,49,0),
  ('b-nepo-oilblock','Oil Block 7×','7× taps for 15 seconds.','BOOSTER',900000,7,15,'NEPO',25,'{"color":"#150B33"}',1,50,0),
  ('b-nepo-asorock','Aso Rock 10×','10× for 25 seconds. Rank 60. One per game.','BOOSTER',10000000,10,25,'NEPO',60,'{"color":"#E2263F"}',0,51,1),
  ('b-nepo-legend','Tap Am Legend 10×','10× for 40 seconds. Rank 80. One per game.','BOOSTER',25000000,10,40,'NEPO',80,'{"color":"#FFD23F"}',0,52,1),
  ('b-rank-freshlegs','Fresh Legs 2×','Double taps for 25 seconds. Rank 3.','BOOSTER',25000,2,25,'ALL',3,'{"color":"#00C957"}',1,53,0),
  ('b-rank-jjc','JJC Turbo 2.5×','2.5× for 20 seconds. Rank 5.','BOOSTER',40000,2.5,20,'ALL',5,'{"color":"#2E8BFF"}',1,54,0),
  ('b-rank-danfodriver','Danfo Driver 3×','Triple taps for 15 seconds. Rank 8.','BOOSTER',60000,3,15,'ALL',8,'{"color":"#FFB800"}',1,55,0),
  ('b-rank-areaboy','Area Boy 3×','Triple taps for 25 seconds. Rank 12.','BOOSTER',90000,3,25,'ALL',12,'{"color":"#FF8A2A"}',1,56,0),
  ('b-rank-streetking','Street King 3.5×','3.5× for 20 seconds. Rank 15.','BOOSTER',120000,3.5,20,'ALL',15,'{"color":"#9161FF"}',1,57,0),
  ('b-rank-parapara','Para Para 4×','4× for 20 seconds. Rank 20.','BOOSTER',200000,4,20,'ALL',20,'{"color":"#FF4FA3"}',1,58,0),
  ('b-rank-ogbonge','Ogbonge 5×','5× for 15 seconds. Rank 30.','BOOSTER',300000,5,15,'ALL',30,'{"color":"#21D4C8"}',1,59,0),
  ('b-rank-agba','Agba 6×','6× for 20 seconds. Rank 50. One per game.','BOOSTER',4000000,6,20,'ALL',50,'{"color":"#E2263F"}',1,60,1),
  ('b-rank-legend','Legend 8×','8× for 20 seconds. Rank 70. One per game.','BOOSTER',12000000,8,20,'ALL',70,'{"color":"#FFD23F"}',1,61,1);
INSERT OR IGNORE INTO store_items(id,name,description,kind,price_kobo,multiplier,duration_seconds,audience,min_rank,config,giftable,sort) VALUES
  ('s-all-ocean','Ocean','Blue waves for the calm tapper.','SKIN',30000,1,0,'ALL',1,'{"bg":"#0BC5EA","pattern":"waves"}',1,80),
  ('s-all-lime','Lime','Fresh green stripes.','SKIN',30000,1,0,'ALL',1,'{"bg":"#7ED321","pattern":"stripes"}',1,81),
  ('s-all-candy','Candy','Pink checker, sweet like Alewa.','SKIN',40000,1,0,'ALL',1,'{"bg":"#FF7AC6","pattern":"checker"}',1,82),
  ('s-all-goldrush','Gold Swirl','Shiny gold swirl. Hard to get.','SKIN',500000,1,0,'ALL',1,'{"bg":"#FFB800","pattern":"swirl","glow":true}',1,83),
  ('s-all-diamond','Diamond','Glowing ice-blue kente. Very rare.','SKIN',1000000,1,0,'ALL',1,'{"bg":"#9BE7FF","pattern":"kente","glow":true}',1,84),
  ('s-mapo-coral','Coral','Coral flowers.','SKIN',80000,1,0,'MAPO',1,'{"bg":"#FF6F61","pattern":"flowers"}',1,85),
  ('s-mapo-sunset','Sunset','Orange swirl.','SKIN',90000,1,0,'MAPO',1,'{"bg":"#FF8A2A","pattern":"swirl"}',1,86),
  ('s-mapo-forest','Forest','Green cow print.','SKIN',100000,1,0,'MAPO',1,'{"bg":"#00A84D","pattern":"cow"}',1,87),
  ('s-mapo-steel','Steel','Grey zebra.','SKIN',120000,1,0,'MAPO',5,'{"bg":"#8A93A6","pattern":"zebra"}',1,88),
  ('s-mapo-ruby','Ruby','Glowing red leopard. Rank 30.','SKIN',2000000,1,0,'MAPO',30,'{"bg":"#E2263F","pattern":"leopard","glow":true}',1,89),
  ('s-mapo-emerald','Emerald','Glowing emerald kente. Rank 40.','SKIN',4000000,1,0,'MAPO',40,'{"bg":"#00C957","pattern":"kente","glow":true}',1,90),
  ('s-nepo-champagne','Champagne','Gold flowers.','SKIN',250000,1,0,'NEPO',1,'{"bg":"#F2D16B","pattern":"flowers"}',1,91),
  ('s-nepo-royal','Royal','Royal purple checker.','SKIN',300000,1,0,'NEPO',1,'{"bg":"#7B2CBF","pattern":"checker"}',1,92),
  ('s-nepo-onyx','Onyx','Black ripples.','SKIN',350000,1,0,'NEPO',15,'{"bg":"#1B1B1F","pattern":"ripple"}',1,93),
  ('s-nepo-pearl','Pearl','White swirl.','SKIN',500000,1,0,'NEPO',20,'{"bg":"#F4F0FF","pattern":"swirl"}',1,94),
  ('s-nepo-crown','Crown','Glowing gold leopard. Rank 60.','SKIN',8000000,1,0,'NEPO',60,'{"bg":"#FFD23F","pattern":"leopard","glow":true}',1,95),
  ('s-nepo-legend','Legend','Glowing black-gold zebra. Rank 80.','SKIN',20000000,1,0,'NEPO',80,'{"bg":"#FFB800","pattern":"zebra","glow":true}',1,96),
  ('s-rank-3','Rookie','Unlocks at rank 3.','SKIN',20000,1,0,'ALL',3,'{"bg":"#21D4C8","pattern":"stripes"}',1,97),
  ('s-rank-5','Climber','Unlocks at rank 5.','SKIN',30000,1,0,'ALL',5,'{"bg":"#2E8BFF","pattern":"checker"}',1,98),
  ('s-rank-8','Hustler','Unlocks at rank 8.','SKIN',40000,1,0,'ALL',8,'{"bg":"#FF8A2A","pattern":"waves"}',1,99),
  ('s-rank-12','Grinder','Unlocks at rank 12.','SKIN',60000,1,0,'ALL',12,'{"bg":"#FF4FA3","pattern":"ripple"}',1,100),
  ('s-rank-15','Boss','Unlocks at rank 15.','SKIN',80000,1,0,'ALL',15,'{"bg":"#9161FF","pattern":"flowers"}',1,101),
  ('s-rank-20','Ogbonge','Unlocks at rank 20.','SKIN',100000,1,0,'ALL',20,'{"bg":"#00C957","pattern":"swirl"}',1,102),
  ('s-rank-25','Odogwu','Unlocks at rank 25.','SKIN',150000,1,0,'ALL',25,'{"bg":"#FFB800","pattern":"cow"}',1,103),
  ('s-rank-30','Agba','Unlocks at rank 30.','SKIN',250000,1,0,'ALL',30,'{"bg":"#E2263F","pattern":"zebra"}',1,104),
  ('s-rank-50','Night King','Unlocks at rank 50. Very rare.','SKIN',3000000,1,0,'ALL',50,'{"bg":"#150B33","pattern":"leopard","glow":true}',1,105),
  ('s-rank-70','Hall of Fame','Unlocks at rank 70. Very rare.','SKIN',9000000,1,0,'ALL',70,'{"bg":"#FFD23F","pattern":"kente","glow":true}',1,106);
INSERT OR IGNORE INTO store_items(id,name,description,kind,price_kobo,multiplier,duration_seconds,audience,min_rank,config,giftable,sort) VALUES
  ('box-basic','Mystery box','Open it for a surprise: a booster, a skin or some wallet money.','BOX',30000,1,0,'ALL',1,'{"rewards":[{"item":"booster-2x","qty":2,"w":30},{"item":"b-all-pepper","qty":3,"w":20},{"item":"b-all-steady","qty":1,"w":15},{"item":"s-all-ocean","qty":1,"w":8},{"item":"s-all-lime","qty":1,"w":8},{"wallet":20000,"w":12},{"wallet":100000,"w":5},{"item":"b-all-agbada","qty":1,"w":2}]}',1,120),
  ('box-mapo','Mapo mystery box','Bigger surprises for Mapo and Nepo babies.','BOX',100000,1,0,'MAPO',1,'{"rewards":[{"item":"b-mapo-keke","qty":2,"w":25},{"item":"b-mapo-molue","qty":1,"w":20},{"item":"booster-3x","qty":2,"w":15},{"item":"s-mapo-coral","qty":1,"w":8},{"item":"s-mapo-forest","qty":1,"w":8},{"wallet":50000,"w":14},{"wallet":200000,"w":6},{"item":"b-mapo-thirdmainland","qty":1,"w":4}]}',1,121),
  ('box-nepo','Nepo mystery box','The big box. Nepo babies only.','BOX',300000,1,0,'NEPO',1,'{"rewards":[{"item":"b-nepo-bigboy","qty":2,"w":25},{"item":"b-nepo-banana","qty":1,"w":20},{"item":"booster-5x","qty":1,"w":15},{"item":"s-nepo-champagne","qty":1,"w":8},{"item":"s-nepo-royal","qty":1,"w":8},{"wallet":100000,"w":14},{"wallet":500000,"w":6},{"item":"b-nepo-asorock","qty":1,"w":4}]}',1,122);
