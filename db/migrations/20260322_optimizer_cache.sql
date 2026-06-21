-- SYNOPSIS: Database migration — 20260322_optimizer_cache.sql.
-- Migration: 20260322_optimizer_cache
-- Persistent storage for AI response cache and token optimizer daily stats.
-- Idempotent for Neon: table may exist from older deploy with missing columns.

BEGIN;

CREATE TABLE IF NOT EXISTS token_optimizer_daily (
  date                DATE        PRIMARY KEY,
  total_requests      INT         NOT NULL DEFAULT 0,
  total_input_tokens  INT         NOT NULL DEFAULT 0,
  total_saved_tokens  INT         NOT NULL DEFAULT 0,
  cache_hits          INT         NOT NULL DEFAULT 0,
  avg_compression_pct INT         NOT NULL DEFAULT 0,
  estimated_cost_saved DECIMAL(10,6) NOT NULL DEFAULT 0,
  by_provider         JSONB,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_response_cache (
  cache_key     TEXT        PRIMARY KEY,
  member        TEXT        NOT NULL DEFAULT '',
  prompt_hash   TEXT        NOT NULL DEFAULT '',
  prompt_snippet TEXT,
  response_text TEXT        NOT NULL DEFAULT '',
  task_type     TEXT,
  tokens_saved  INT         DEFAULT 0,
  hit_count     INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_hit_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- Repair pre-existing ai_response_cache rows (table without expires_at)
ALTER TABLE ai_response_cache ADD COLUMN IF NOT EXISTS member TEXT NOT NULL DEFAULT '';
ALTER TABLE ai_response_cache ADD COLUMN IF NOT EXISTS prompt_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE ai_response_cache ADD COLUMN IF NOT EXISTS prompt_snippet TEXT;
ALTER TABLE ai_response_cache ADD COLUMN IF NOT EXISTS response_text TEXT NOT NULL DEFAULT '';
ALTER TABLE ai_response_cache ADD COLUMN IF NOT EXISTS task_type TEXT;
ALTER TABLE ai_response_cache ADD COLUMN IF NOT EXISTS tokens_saved INT DEFAULT 0;
ALTER TABLE ai_response_cache ADD COLUMN IF NOT EXISTS hit_count INT NOT NULL DEFAULT 0;
ALTER TABLE ai_response_cache ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE ai_response_cache ADD COLUMN IF NOT EXISTS last_hit_at TIMESTAMPTZ;
ALTER TABLE ai_response_cache ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days');

CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_response_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_cache_member  ON ai_response_cache (member);

COMMIT;
