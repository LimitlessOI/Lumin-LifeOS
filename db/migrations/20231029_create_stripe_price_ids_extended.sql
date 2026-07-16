-- SYNOPSIS: Database migration — 20231029_create_stripe_price_ids_extended.sql.
CREATE TABLE IF NOT EXISTS stripe_price_ids (
    id SERIAL PRIMARY KEY,
    price_id VARCHAR(255) NOT NULL,
    tier_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add additional columns or constraints as necessary for new tiers
ALTER TABLE stripe_price_ids
ADD COLUMN IF NOT EXISTS currency VARCHAR(10),
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;