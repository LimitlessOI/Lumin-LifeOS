-- SYNOPSIS: Database migration — 20231015_create_channel_profiles.sql.
CREATE TABLE IF NOT EXISTS channel_profiles (
    id SERIAL PRIMARY KEY,
    channel_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);