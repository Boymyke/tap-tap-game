-- Bachs payments: keep the Bachs checkout id next to each payment, so a missed webhook can be
-- checked later by the cron sweep.
ALTER TABLE payments ADD COLUMN provider_ref TEXT;
CREATE INDEX IF NOT EXISTS idx_payments_pending ON payments(provider, status, created_at);
