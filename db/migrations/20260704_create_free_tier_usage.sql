-- SYNOPSIS: Database migration — 20260704_create_free_tier_usage.sql.
-- AC-P1-002: free_tier_usage table for AI Council
CREATE TABLE IF NOT EXISTS free_tier_usage (
  provider TEXT NOT NULL,
  usage INT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_free_tier_usage_provider
  ON free_tier_usage (provider);

CREATE INDEX IF NOT EXISTS idx_free_tier_usage_date
  ON free_tier_usage (date);