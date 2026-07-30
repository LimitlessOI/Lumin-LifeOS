-- SYNOPSIS: Database migration — 20231026_create_stripe_price_tier.sql.
CREATE TABLE IF NOT EXISTS stripe_price_tier (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    price_id TEXT NOT NULL,
    tier_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stripe_price_tier_price_id ON stripe_price_tier (price_id);
CREATE INDEX IF NOT EXISTS idx_stripe_price_tier_tier_id ON stripe_price_tier (tier_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stripe_price_tier_price_id_tier_id_unique ON stripe_price_tier (price_id, tier_id);