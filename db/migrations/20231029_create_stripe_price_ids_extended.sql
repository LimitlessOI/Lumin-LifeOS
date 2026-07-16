-- SYNOPSIS: Extend stripe_price_ids with currency/active columns.
-- The table is created by 20231021_create_stripe_price_ids.sql; this migration only adds columns.
ALTER TABLE IF EXISTS stripe_price_ids
    ADD COLUMN IF NOT EXISTS currency VARCHAR(10),
    ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
