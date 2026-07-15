-- SYNOPSIS: Database migration — 20231021_create_stripe_price_ids.sql.
CREATE TABLE IF NOT EXISTS stripe_price_ids (
    id SERIAL PRIMARY KEY,
    tier_name VARCHAR(255) NOT NULL,
    price_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO stripe_price_ids (tier_name, price_id) VALUES
('basic', 'price_id_for_basic'),
('standard', 'price_id_for_standard'),
('premium', 'price_id_for_premium')
ON CONFLICT (tier_name) DO NOTHING;