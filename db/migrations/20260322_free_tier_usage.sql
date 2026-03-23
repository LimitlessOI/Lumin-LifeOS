-- Migration: Free-tier usage tracking in Neon
-- Replaces ephemeral file-based state (data/free-tier-usage.json)
-- Survives Railway deploys — resets automatically on new UTC day

CREATE TABLE IF NOT EXISTS free_tier_usage (
  id            BIGSERIAL PRIMARY KEY,
  date          DATE NOT NULL,                  -- UTC date (YYYY-MM-DD)
  provider_key  TEXT NOT NULL,                  -- groq | gemini | cerebras | etc.
  requests      INTEGER NOT NULL DEFAULT 0,
  tokens        BIGINT  NOT NULL DEFAULT 0,
  exhausted_at  TIMESTAMPTZ,                    -- set when manually exhausted or 429
  last_429_at   TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (date, provider_key)
);

CREATE INDEX IF NOT EXISTS idx_free_tier_usage_date
  ON free_tier_usage (date DESC, provider_key);
