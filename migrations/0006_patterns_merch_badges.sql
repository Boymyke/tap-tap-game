-- 0006: tap-area patterns, sponsor tap areas, ad length + rejection reasons, slide buttons,
-- name emoji, merch, special badges. Safe to run once on a database that already has 0005.
ALTER TABLE pools ADD COLUMN pad_pattern TEXT;
ALTER TABLE pools ADD COLUMN allow_own_pad INTEGER NOT NULL DEFAULT 0;
ALTER TABLE promos ADD COLUMN duration_seconds INTEGER NOT NULL DEFAULT 5;
ALTER TABLE promos ADD COLUMN reject_reason TEXT;
ALTER TABLE slides ADD COLUMN cta TEXT;
ALTER TABLE users ADD COLUMN emoji TEXT;
ALTER TABLE users ADD COLUMN emoji_meaning TEXT;
CREATE TABLE IF NOT EXISTS merch (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', price_kobo INTEGER NOT NULL DEFAULT 0, image_url TEXT, color TEXT NOT NULL DEFAULT '#2E8BFF', link TEXT, status TEXT NOT NULL DEFAULT 'SOON', active INTEGER NOT NULL DEFAULT 1, sort INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS special_badges (id TEXT PRIMARY KEY, name TEXT NOT NULL, meaning TEXT NOT NULL DEFAULT '', color TEXT NOT NULL DEFAULT '#9161FF', label TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_tap_stats_user ON tap_stats(user_id, period);
-- Skins are now patterns (no illustrations). Boy = blue waves, girl = pink flowers.
UPDATE store_items SET config='{"bg":"#2E8BFF","pattern":"waves"}' WHERE id='skin-boy';
UPDATE store_items SET config='{"bg":"#FF4FA3","pattern":"flowers"}' WHERE id='skin-girl';
UPDATE store_items SET config='{"bg":"#FFB800","pattern":"swirl"}' WHERE id='skin-gold';
UPDATE store_items SET config='{"bg":"#d8a73a","pattern":"kente"}' WHERE id='skin-kente';
UPDATE store_items SET config='{"bg":"#150B33","pattern":"zebra","glow":true}' WHERE id='skin-neon';
INSERT OR IGNORE INTO store_items(id,name,description,kind,price_kobo,multiplier,duration_seconds,audience,min_rank,config,giftable,sort) VALUES
  ('skin-swirl','Swirl','Sweet-sweet swirl.','SKIN',50000,1,0,'ALL',1,'{"bg":"#9161FF","pattern":"swirl"}',1,15),
  ('skin-checker','Checker','Draughts board energy.','SKIN',50000,1,0,'ALL',1,'{"bg":"#FF8A2A","pattern":"checker"}',1,16),
  ('skin-stripes','Stripes','Clean diagonal stripes.','SKIN',50000,1,0,'ALL',1,'{"bg":"#21D4C8","pattern":"stripes"}',1,17),
  ('skin-ripple','Ripple','Water wey dey move.','SKIN',100000,1,0,'MAPO',1,'{"bg":"#2E8BFF","pattern":"ripple"}',1,18),
  ('skin-cow','Cow print','Moo moo, tap tap.','SKIN',100000,1,0,'MAPO',1,'{"bg":"#F4F0FF","pattern":"cow"}',1,19),
  ('skin-daisy','Daisy','Flowers for the soft tappers.','SKIN',100000,1,0,'MAPO',1,'{"bg":"#9161FF","pattern":"flowers"}',1,20),
  ('skin-leopard','Leopard','Fast like cat.','SKIN',150000,1,0,'MAPO',10,'{"bg":"#FFD23F","pattern":"leopard"}',1,21),
  ('skin-zebra','Zebra','Black and white, no shaking.','SKIN',200000,1,0,'NEPO',10,'{"bg":"#F4F0FF","pattern":"zebra"}',1,22);
-- Demo pools are gone from the landing page.
UPDATE settings SET value='0' WHERE key='landing_demo_pools';
