-- SYNOPSIS: Database migration — 20231020_add_cooldown_persistence.sql.
CREATE TABLE IF NOT EXISTS provider_cooldowns (
    id SERIAL PRIMARY KEY,
    provider_id VARCHAR(255) NOT NULL,
    cooldown_start TIMESTAMP NOT NULL,
    cooldown_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add an index on provider_id for faster lookups
CREATE INDEX idx_provider_id ON provider_cooldowns(provider_id);
