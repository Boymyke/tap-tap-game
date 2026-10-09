-- One-time upgrade (run after 0004): three tiers (Lapo/Mapo/Nepo), sign-up without date of birth
-- (gender + country instead), archived accounts, adult confirmation at money steps, VS per-side
-- prizes, pools with or without an ad, home slides, leads, Nepo backgrounds, top-tapper stats and
-- badges, system health, automated payouts.   Run with:  npm run db:upgrade:5

-- people
ALTER TABLE users RENAME COLUMN nepo_until TO tier_until;
ALTER TABLE users ADD COLUMN gender TEXT;
ALTER TABLE users ADD COLUMN country TEXT;
ALTER TABLE users ADD COLUMN archived_at TEXT;
ALTER TABLE users ADD COLUMN adult_confirmed_at TEXT;
ALTER TABLE sponsor_profiles ADD COLUMN lead_capture INTEGER NOT NULL DEFAULT 0;

-- pools: ad attached (sponsors), page background + tap colour, prize style, VS per-side prizes
ALTER TABLE pools ADD COLUMN promo_id TEXT;
ALTER TABLE pools ADD COLUMN bg_color TEXT;
ALTER TABLE pools ADD COLUMN split_style TEXT NOT NULL DEFAULT 'TOP';
ALTER TABLE pools ADD COLUMN vs_split INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pool_entries ADD COLUMN boosters_used INTEGER NOT NULL DEFAULT 0;

-- store: who sees it (ALL | MAPO = Mapo+Nepo | NEPO), uses per game (0 = no limit), shapes retired
ALTER TABLE store_items ADD COLUMN per_game_limit INTEGER NOT NULL DEFAULT 0;
UPDATE store_items SET active=0 WHERE kind='SHAPE';

-- ads: shown at every game moment now (no placement choice)
UPDATE promos SET placement='ALL';

-- home slideshow (sponsors request a slot; the admin approves or makes them)
CREATE TABLE IF NOT EXISTS slides (id TEXT PRIMARY KEY, title TEXT NOT NULL, subtitle TEXT NOT NULL DEFAULT '', image_url TEXT, link TEXT, color TEXT NOT NULL DEFAULT '#2E8BFF',
  promo_id TEXT, sponsor_id TEXT, status TEXT NOT NULL DEFAULT 'REQUESTED', sort INTEGER NOT NULL DEFAULT 0, note TEXT, views INTEGER NOT NULL DEFAULT 0, clicks INTEGER NOT NULL DEFAULT 0,
  created_by TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_slides_status ON slides(status, sort);

-- leads from ad pop-ups (only when the admin turns lead capture on for that sponsor; needs consent)
CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, promo_id TEXT NOT NULL, sponsor_id TEXT NOT NULL, user_id TEXT NOT NULL, name TEXT NOT NULL, email TEXT, phone TEXT,
  consent_text TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(promo_id, user_id));
CREATE INDEX IF NOT EXISTS idx_leads_sponsor ON leads(sponsor_id, created_at);

-- backgrounds Nepo babies can pick (made by the super admin)
CREATE TABLE IF NOT EXISTS backgrounds (id TEXT PRIMARY KEY, name TEXT NOT NULL, style TEXT NOT NULL DEFAULT 'LINEAR', color_a TEXT NOT NULL, color_b TEXT NOT NULL, image_url TEXT,
  active INTEGER NOT NULL DEFAULT 1, sort INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);

-- top tappers (day / week / month / year) and badges
CREATE TABLE IF NOT EXISTS tap_stats (period TEXT NOT NULL, user_id TEXT NOT NULL, taps INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(period, user_id));
CREATE INDEX IF NOT EXISTS idx_tap_stats_board ON tap_stats(period, taps DESC);
CREATE TABLE IF NOT EXISTS badges (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, kind TEXT NOT NULL, period TEXT NOT NULL, taps INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(kind, period));
CREATE INDEX IF NOT EXISTS idx_badges_user ON badges(user_id);

-- pool suggestions from players
ALTER TABLE suggestions ADD COLUMN kind TEXT NOT NULL DEFAULT 'GENERAL';
ALTER TABLE suggestions ADD COLUMN data TEXT;

-- system health: daily counters and alert de-duplication
CREATE TABLE IF NOT EXISTS metrics (key TEXT NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(key, day));
CREATE TABLE IF NOT EXISTS alerts (key TEXT PRIMARY KEY, level TEXT NOT NULL, message TEXT NOT NULL, first_at TEXT NOT NULL, last_at TEXT NOT NULL, emailed_at TEXT, resolved_at TEXT);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pools_creator ON pools(created_by);

-- tiers: Mapo ₦3,500/month (₦35,000/year), Nepo ₦50,000/month (₦500,000/year)
INSERT INTO settings(key,value) VALUES ('nepo_monthly_kobo','5000000') ON CONFLICT(key) DO UPDATE SET value=excluded.value;
INSERT INTO settings(key,value) VALUES ('nepo_yearly_kobo','50000000') ON CONFLICT(key) DO UPDATE SET value=excluded.value;
INSERT OR IGNORE INTO settings(key,value) VALUES
  ('mapo_monthly_kobo','350000'), ('mapo_yearly_kobo','3500000'), ('min_withdraw_mapo_kobo','750000'), ('mapo_bonus_boosters','3'),
  ('max_multi_pools_mapo','3'), ('tap_rate_lapo','15'), ('tap_rate_mapo','25'), ('tap_rate_nepo','40'),
  ('tap_limits_on','0'), ('tap_limit_daily','20000'), ('tap_limit_monthly','400000'),
  ('auto_payouts','0'), ('auto_payout_max_kobo','5000000'), ('auto_payout_min_age_days','7'),
  ('alert_email',''), ('withdrawals_per_day','1');

-- more boosters: cheap ones for everybody, mid ones for paid tiers, big one-use ones for Nepo
UPDATE store_items SET name='Turbo 2×', description='Double every tap for 20 seconds.', sort=1 WHERE id='booster-2x';
UPDATE store_items SET audience='MAPO', sort=4 WHERE id='booster-3x';
UPDATE store_items SET sort=6 WHERE id='booster-5x';
INSERT OR IGNORE INTO store_items(id,name,description,kind,price_kobo,multiplier,duration_seconds,audience,min_rank,config,giftable,sort,per_game_limit) VALUES
  ('booster-small','Small Chops 1.5×','Small push: 1.5× taps for 15 seconds.','BOOSTER',5000,1.5,15,'ALL',1,'{"color":"#21D4C8"}',1,0,0),
  ('booster-long','Long Thing 2×','Double taps for a full 45 seconds.','BOOSTER',40000,2,45,'ALL',5,'{"color":"#2E8BFF"}',1,2,0),
  ('booster-4x','Gbas Gbos 4×','Four times every tap for 12 seconds.','BOOSTER',80000,4,12,'MAPO',10,'{"color":"#FF4FA3"}',1,5,0),
  ('booster-8x','Jaga Jaga 8×','Eight times every tap for 10 seconds. One per game.','BOOSTER',500000,8,10,'NEPO',25,'{"color":"#FF8A2A"}',1,7,1),
  ('booster-10x','Odogwu Pro 10×','Ten times every tap for 15 seconds. One per game.','BOOSTER',1500000,10,15,'NEPO',40,'{"color":"#FFD23F"}',0,8,1);

-- Nepo backgrounds to start with (the admin can add more)
INSERT OR IGNORE INTO backgrounds(id,name,style,color_a,color_b,sort) VALUES
  ('bg-sunset','Lagos sunset','LINEAR','#FF8A2A','#9B1FD8',1), ('bg-ocean','Atlantic','LINEAR','#0BC5EA','#2A2BB8',2),
  ('bg-forest','Naija green','RADIAL','#00C957','#0A3B2A',3), ('bg-night','Owambe night','LINEAR','#1B0B4D','#FF4FA3',4),
  ('bg-gold','Gold rush','RADIAL','#FFD23F','#B35A00',5), ('bg-candy','Bubblegum','LINEAR','#FF7AC6','#7B45FF',6);

-- rank names: Nigerian slang only (no tier names)
UPDATE ranks SET name=REPLACE(name,'Lapo Starter','JJC') WHERE name LIKE 'Lapo Starter%';

-- tap skins in the new colours
UPDATE store_items SET config='{"bg":"#2E8BFF","art":"boy"}' WHERE id='skin-boy';
UPDATE store_items SET config='{"bg":"#FF4FA3","art":"girl"}' WHERE id='skin-girl';
UPDATE store_items SET config='{"bg":"#FFB800","art":"star"}' WHERE id='skin-gold';
UPDATE store_items SET config='{"bg":"#150B33","art":"bolt","glow":true}' WHERE id='skin-neon';

-- rank colours and unlocks for the new look (names kept, except "Lapo Starter" → "JJC" above)
UPDATE ranks SET color='#21D4C8', unlocks='' WHERE level=1;
UPDATE ranks SET color='#21D4C8', unlocks='' WHERE level=2;
UPDATE ranks SET color='#21D4C8', unlocks='' WHERE level=3;
UPDATE ranks SET color='#21D4C8', unlocks='' WHERE level=4;
UPDATE ranks SET color='#21D4C8', unlocks='booster-long,sound-coin' WHERE level=5;
UPDATE ranks SET color='#2E8BFF', unlocks='' WHERE level=6;
UPDATE ranks SET color='#2E8BFF', unlocks='' WHERE level=7;
UPDATE ranks SET color='#2E8BFF', unlocks='' WHERE level=8;
UPDATE ranks SET color='#2E8BFF', unlocks='' WHERE level=9;
UPDATE ranks SET color='#2E8BFF', unlocks='skin-kente,booster-4x,sound-bubble' WHERE level=10;
UPDATE ranks SET color='#00C957', unlocks='' WHERE level=11;
UPDATE ranks SET color='#00C957', unlocks='' WHERE level=12;
UPDATE ranks SET color='#00C957', unlocks='' WHERE level=13;
UPDATE ranks SET color='#00C957', unlocks='' WHERE level=14;
UPDATE ranks SET color='#00C957', unlocks='sound-clap' WHERE level=15;
UPDATE ranks SET color='#FF8A2A', unlocks='' WHERE level=16;
UPDATE ranks SET color='#FF8A2A', unlocks='' WHERE level=17;
UPDATE ranks SET color='#FF8A2A', unlocks='' WHERE level=18;
UPDATE ranks SET color='#FF8A2A', unlocks='' WHERE level=19;
UPDATE ranks SET color='#FF8A2A', unlocks='booster-5x' WHERE level=20;
UPDATE ranks SET color='#9161FF', unlocks='' WHERE level=21;
UPDATE ranks SET color='#9161FF', unlocks='' WHERE level=22;
UPDATE ranks SET color='#9161FF', unlocks='' WHERE level=23;
UPDATE ranks SET color='#9161FF', unlocks='' WHERE level=24;
UPDATE ranks SET color='#9161FF', unlocks='booster-8x,sound-laser' WHERE level=25;
UPDATE ranks SET color='#FF4FA3', unlocks='' WHERE level=26;
UPDATE ranks SET color='#FF4FA3', unlocks='' WHERE level=27;
UPDATE ranks SET color='#FF4FA3', unlocks='' WHERE level=28;
UPDATE ranks SET color='#FF4FA3', unlocks='' WHERE level=29;
UPDATE ranks SET color='#FF4FA3', unlocks='skin-neon' WHERE level=30;
UPDATE ranks SET color='#2E8BFF', unlocks='' WHERE level=31;
UPDATE ranks SET color='#2E8BFF', unlocks='' WHERE level=32;
UPDATE ranks SET color='#2E8BFF', unlocks='' WHERE level=33;
UPDATE ranks SET color='#2E8BFF', unlocks='' WHERE level=34;
UPDATE ranks SET color='#2E8BFF', unlocks='sound-kalimba' WHERE level=35;
UPDATE ranks SET color='#00C957', unlocks='' WHERE level=36;
UPDATE ranks SET color='#00C957', unlocks='' WHERE level=37;
UPDATE ranks SET color='#00C957', unlocks='' WHERE level=38;
UPDATE ranks SET color='#00C957', unlocks='' WHERE level=39;
UPDATE ranks SET color='#00C957', unlocks='booster-10x' WHERE level=40;
UPDATE ranks SET color='#FF8A2A', unlocks='' WHERE level=41;
UPDATE ranks SET color='#FF8A2A', unlocks='' WHERE level=42;
UPDATE ranks SET color='#FF8A2A', unlocks='' WHERE level=43;
UPDATE ranks SET color='#FF8A2A', unlocks='' WHERE level=44;
UPDATE ranks SET color='#FF8A2A', unlocks='' WHERE level=45;
UPDATE ranks SET color='#9161FF', unlocks='' WHERE level=46;
UPDATE ranks SET color='#9161FF', unlocks='' WHERE level=47;
UPDATE ranks SET color='#9161FF', unlocks='' WHERE level=48;
UPDATE ranks SET color='#9161FF', unlocks='' WHERE level=49;
UPDATE ranks SET color='#9161FF', unlocks='sound-bell' WHERE level=50;
UPDATE ranks SET color='#FF4FA3', unlocks='' WHERE level=51;
UPDATE ranks SET color='#FF4FA3', unlocks='' WHERE level=52;
UPDATE ranks SET color='#FF4FA3', unlocks='' WHERE level=53;
UPDATE ranks SET color='#FF4FA3', unlocks='' WHERE level=54;
UPDATE ranks SET color='#FF4FA3', unlocks='' WHERE level=55;
UPDATE ranks SET color='#E0A800', unlocks='voice' WHERE level=56;
UPDATE ranks SET color='#E0A800', unlocks='' WHERE level=57;
UPDATE ranks SET color='#E0A800', unlocks='' WHERE level=58;
UPDATE ranks SET color='#E0A800', unlocks='' WHERE level=59;
UPDATE ranks SET color='#E0A800', unlocks='' WHERE level=60;
UPDATE ranks SET color='#2E8BFF', unlocks='' WHERE level=61;
UPDATE ranks SET color='#2E8BFF', unlocks='' WHERE level=62;
UPDATE ranks SET color='#2E8BFF', unlocks='' WHERE level=63;
UPDATE ranks SET color='#2E8BFF', unlocks='' WHERE level=64;
UPDATE ranks SET color='#2E8BFF', unlocks='' WHERE level=65;
UPDATE ranks SET color='#9161FF', unlocks='' WHERE level=66;
UPDATE ranks SET color='#9161FF', unlocks='' WHERE level=67;
UPDATE ranks SET color='#9161FF', unlocks='' WHERE level=68;
UPDATE ranks SET color='#9161FF', unlocks='' WHERE level=69;
UPDATE ranks SET color='#9161FF', unlocks='' WHERE level=70;
UPDATE ranks SET color='#FF4FA3', unlocks='' WHERE level=71;
UPDATE ranks SET color='#FF4FA3', unlocks='' WHERE level=72;
UPDATE ranks SET color='#FF4FA3', unlocks='' WHERE level=73;
UPDATE ranks SET color='#FF4FA3', unlocks='' WHERE level=74;
UPDATE ranks SET color='#FF4FA3', unlocks='' WHERE level=75;
UPDATE ranks SET color='#00C957', unlocks='' WHERE level=76;
UPDATE ranks SET color='#00C957', unlocks='' WHERE level=77;
UPDATE ranks SET color='#00C957', unlocks='' WHERE level=78;
UPDATE ranks SET color='#00C957', unlocks='' WHERE level=79;
UPDATE ranks SET color='#00C957', unlocks='' WHERE level=80;
UPDATE ranks SET color='#FF8A2A', unlocks='' WHERE level=81;
UPDATE ranks SET color='#FF8A2A', unlocks='' WHERE level=82;
UPDATE ranks SET color='#FF8A2A', unlocks='' WHERE level=83;
UPDATE ranks SET color='#FF8A2A', unlocks='' WHERE level=84;
UPDATE ranks SET color='#FF8A2A', unlocks='' WHERE level=85;
UPDATE ranks SET color='#21D4C8', unlocks='' WHERE level=86;
UPDATE ranks SET color='#21D4C8', unlocks='' WHERE level=87;
UPDATE ranks SET color='#21D4C8', unlocks='' WHERE level=88;
UPDATE ranks SET color='#21D4C8', unlocks='' WHERE level=89;
UPDATE ranks SET color='#21D4C8', unlocks='' WHERE level=90;
UPDATE ranks SET color='#FF4FA3', unlocks='' WHERE level=91;
UPDATE ranks SET color='#FF4FA3', unlocks='' WHERE level=92;
UPDATE ranks SET color='#FF4FA3', unlocks='' WHERE level=93;
UPDATE ranks SET color='#FF4FA3', unlocks='' WHERE level=94;
UPDATE ranks SET color='#FF4FA3', unlocks='' WHERE level=95;
UPDATE ranks SET color='#E0A800', unlocks='' WHERE level=96;
UPDATE ranks SET color='#E0A800', unlocks='' WHERE level=97;
UPDATE ranks SET color='#E0A800', unlocks='' WHERE level=98;
UPDATE ranks SET color='#E0A800', unlocks='' WHERE level=99;
UPDATE ranks SET color='#E0A800', unlocks='' WHERE level=100;
