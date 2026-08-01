-- SYNOPSIS: Database migration — persist_provider_cooldowns.sql.
-- AC-P1-002: free_tier_usage and provider_cooldowns tables for AI Council provider cooldown tracking.
CREATE TABLE IF NOT EXISTS provider_cooldowns (
    id SERIAL PRIMARY KEY,
    provider_id VARCHAR(255) NOT NULL,
    cooldown_start TIMESTAMP NOT NULL,
    cooldown_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_provider_id ON provider_cooldowns(provider_id);

CREATE TABLE IF NOT EXISTS free_tier_usage (
    provider TEXT NOT NULL,
    usage INT NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_free_tier_usage_provider
  ON free_tier_usage (provider);

CREATE INDEX IF NOT EXISTS idx_free_tier_usage_date
  ON free_tier_usage (date);
