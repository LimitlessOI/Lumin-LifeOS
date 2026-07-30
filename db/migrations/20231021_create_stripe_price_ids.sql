-- SYNOPSIS: Database migration — 20231021_create_stripe_price_ids.sql.
CREATE TABLE IF NOT EXISTS stripe_price_ids (
    id SERIAL PRIMARY KEY,
    tier VARCHAR(50) UNIQUE NOT NULL,
    price_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO stripe_price_ids (tier, price_id) VALUES
('basic', 'price_12345_basic_monthly') ON CONFLICT (tier) DO NOTHING;

INSERT INTO stripe_price_ids (tier, price_id) VALUES
('pro', 'price_67890_pro_monthly') ON CONFLICT (tier) DO NOTHING;

INSERT INTO stripe_price_ids (tier, price_id) VALUES
('premium', 'price_abcde_premium_monthly') ON CONFLICT (tier) DO NOTHING;