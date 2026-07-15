-- SYNOPSIS: Database migration — 20231019_create_pricing_tiers.sql.
CREATE TABLE IF NOT EXISTS pricing_tiers (
    id SERIAL PRIMARY KEY,
    tier_name VARCHAR(255) NOT NULL,
    stripe_price_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);