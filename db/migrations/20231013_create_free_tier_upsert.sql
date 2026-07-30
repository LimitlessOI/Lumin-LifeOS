-- SYNOPSIS: Database migration — 20231013_create_free_tier_upsert.sql.
CREATE TABLE IF NOT EXISTS free_tier_users (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create a function to handle upsert logic for free_tier_users
CREATE OR REPLACE FUNCTION upsert_free_tier_user(
    p_user_id UUID,
    p_email VARCHAR(255)
)
RETURNS free_tier_users AS $$
DECLARE
    v_free_tier_user free_tier_users;
BEGIN
    INSERT INTO free_tier_users (user_id, email)
    VALUES (p_user_id, p_email)
    ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email, updated_at = CURRENT_TIMESTAMP
    RETURNING * INTO v_free_tier_user;

    RETURN v_free_tier_user;
END;
$$ LANGUAGE plpgsql;