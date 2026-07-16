-- SYNOPSIS: Database migration — 20231026_create_stripe_price_tier.sql.
CREATE TABLE IF NOT EXISTS stripe_price_tier (
    id SERIAL PRIMARY KEY,
    tier_id VARCHAR(255) UNIQUE NOT NULL,
    price_id VARCHAR(255) NOT NULL,
    unit_amount INTEGER NOT NULL,
    up_to INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);