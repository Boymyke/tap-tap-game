-- Launch reset of the LIVE database (tapammm-live), 17 Oct 2026 (launch day).
-- Kept: every account and its details (users, sponsor profiles, sessions so nobody is logged out), the visit
-- counter (visitors), settings, the store, ranks, backgrounds, special badges, promo codes, merch, and the
-- financial and security records (payments, withdrawals, audit and sign-in logs).
-- Reset: pools and everything in them, wallets and their history, bags, badges, tap stats, notifications,
-- announcements, ads, slides, tap-offs, metrics, errors and alerts. Players' game stats go back to zero
-- and everybody is a Lapo baby again.
-- Real money: the one real Paystack top-up made before launch is put back in that player's wallet.
-- Every player gets the starter boosters again.
-- Backup: D1 Time Travel can restore the database to any minute of the last 30 days
--   (npx wrangler d1 time-travel restore tapammm-live --timestamp=2026-10-17T22:05:00Z).
DELETE FROM pool_votes; DELETE FROM pool_blocks; DELETE FROM pool_invites; DELETE FROM pool_time_buys; DELETE FROM pool_topups;
DELETE FROM pool_entries; DELETE FROM voice_sessions; DELETE FROM email_blasts; DELETE FROM leads;
DELETE FROM pools; DELETE FROM challenges;
DELETE FROM inventory; DELETE FROM gifts; DELETE FROM badges; DELETE FROM tap_stats; DELETE FROM promo_redemptions;
DELETE FROM notifications; DELETE FROM announcement_seen; DELETE FROM announcements; DELETE FROM email_jobs;
DELETE FROM slides; DELETE FROM promos; DELETE FROM ad_requests;
DELETE FROM metrics; DELETE FROM error_log; DELETE FROM alerts; DELETE FROM auth_throttle; DELETE FROM email_codes;
DELETE FROM wallet_transactions; UPDATE wallets SET balance_kobo=0, winnings_kobo=0;
UPDATE users SET lifetime_taps=0, games_played=0, wins=0, rank_level=1, tier='LAPO', tier_until=NULL, equipped_skin='skin-boy', last_free_box_at=NULL, inner_circle=0, inner_circle_at=NULL WHERE role IN ('USER','SPONSOR');
-- real money paid in through Paystack before launch goes back to the player's wallet
INSERT INTO wallets(user_id,balance_kobo,winnings_kobo) SELECT user_id,0,0 FROM payments WHERE status='SUCCESS' AND purpose='FUND' GROUP BY user_id ON CONFLICT(user_id) DO NOTHING;
UPDATE wallets SET balance_kobo=(SELECT COALESCE(SUM(amount_kobo),0) FROM payments p WHERE p.user_id=wallets.user_id AND p.status='SUCCESS' AND p.purpose='FUND') WHERE user_id IN (SELECT user_id FROM payments WHERE status='SUCCESS' AND purpose='FUND');
INSERT INTO wallet_transactions(id,user_id,type,amount_kobo,reference,status,balance,note) SELECT lower(hex(randomblob(16))), user_id, 'FUND', SUM(amount_kobo), 'launch-reset', 'SUCCESS', 'WALLET', 'Launch reset: your Paystack top-up is kept' FROM payments WHERE status='SUCCESS' AND purpose='FUND' GROUP BY user_id;
-- starter boosters again for every player, and a note about the reset
INSERT INTO inventory(user_id,item_id,quantity) SELECT id,'booster-2x',3 FROM users WHERE role='USER' AND status='ACTIVE';
INSERT INTO notifications(id,user_id,text,link) SELECT lower(hex(randomblob(16))), id, 'Tap Am is officially live! Scores, ranks and boards were reset for launch day, and we put 3 free Turbo 2× boosters in your bag. Oya, tap!', '/bag' FROM users WHERE role='USER' AND status='ACTIVE';
INSERT OR REPLACE INTO settings(key,value) VALUES ('launch_reset_at','2026-10-17T22:10:00Z');
