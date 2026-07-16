-- SYNOPSIS: Database migration — 20231013_create_free_tier_upsert.sql.
CREATE TABLE IF NOT EXISTS free_tier_upsert (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    tier_level VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_free_tier_upsert(p_user_id INT, p_tier_level VARCHAR(50)) 
RETURNS VOID AS $$
BEGIN
    INSERT INTO free_tier_upsert (user_id, tier_level, created_at, updated_at)
    VALUES (p_user_id, p_tier_level, NOW(), NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET tier_level = EXCLUDED.tier_level, updated_at = NOW();
END;
$$ LANGUAGE plpgsql;