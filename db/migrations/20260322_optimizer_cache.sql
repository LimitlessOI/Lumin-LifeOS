-- Migration: 20260322_optimizer_cache
-- Persistent storage for AI response cache and token optimizer daily stats.
-- Survives Railway deploys — no more starting from zero on every push.

BEGIN;

-- ── Daily token optimization summary ─────────────────────────────────────────
-- One row per day. Upserted on every saveStats() call.
-- Gives us trend data: are we getting better at compression over time?
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

-- ── AI response cache ─────────────────────────────────────────────────────────
-- Survives deploys. L2 cache: in-memory Map is L1, DB is L2.
-- On startup the in-memory cache warms itself from recent DB rows.
CREATE TABLE IF NOT EXISTS ai_response_cache (
  cache_key     TEXT        PRIMARY KEY,   -- member:promptHash
  member        TEXT        NOT NULL,
  prompt_hash   TEXT        NOT NULL,
  prompt_snippet TEXT,                     -- first 120 chars for debugging
  response_text TEXT        NOT NULL,
  task_type     TEXT,
  tokens_saved  INT         DEFAULT 0,
  hit_count     INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_hit_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL       -- TTL enforced at query time
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_response_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_cache_member  ON ai_response_cache (member);

-- Auto-delete expired entries (run via cron or on each cache check)
-- No separate cron needed — we filter by expires_at in queries.

COMMIT;
