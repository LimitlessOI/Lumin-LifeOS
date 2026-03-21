-- Migration: 20260321_token_usage_log
-- TCO-E01: Savings Ledger — per-request receipt.
-- Every AI call records before/after tokens so we can generate
-- verified savings reports for clients. This is the sellable moat.

BEGIN;

CREATE TABLE IF NOT EXISTS token_usage_log (
  id                  BIGSERIAL PRIMARY KEY,
  provider            TEXT NOT NULL,
  model               TEXT,
  task_type           TEXT,
  input_tokens        INTEGER DEFAULT 0,
  output_tokens       INTEGER DEFAULT 0,
  saved_tokens        INTEGER DEFAULT 0,
  cache_hit           BOOLEAN DEFAULT FALSE,
  cost_usd            NUMERIC(10,6) DEFAULT 0,
  saved_cost_usd      NUMERIC(10,6) DEFAULT 0,
  logged_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Add receipt columns (idempotent — safe to re-run)
ALTER TABLE token_usage_log
  ADD COLUMN IF NOT EXISTS session_id          TEXT,
  ADD COLUMN IF NOT EXISTS request_id          TEXT,
  ADD COLUMN IF NOT EXISTS client_id           TEXT,
  ADD COLUMN IF NOT EXISTS original_tokens     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS compressed_tokens   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS savings_pct         NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_was_free   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS quality_score       NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS quality_method      TEXT,
  ADD COLUMN IF NOT EXISTS compression_layers  JSONB,
  ADD COLUMN IF NOT EXISTS fallback_triggered  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS drift_detected      BOOLEAN DEFAULT FALSE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_token_log_provider    ON token_usage_log (provider);
CREATE INDEX IF NOT EXISTS idx_token_log_logged_at   ON token_usage_log (logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_log_task_type   ON token_usage_log (task_type);
CREATE INDEX IF NOT EXISTS idx_token_log_client_id   ON token_usage_log (client_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_log_session      ON token_usage_log (session_id);

-- Daily rollup view — powers dashboard + savings reports
CREATE OR REPLACE VIEW token_usage_daily AS
SELECT
  DATE(logged_at)                                        AS day,
  client_id,
  provider,
  COUNT(*)                                               AS requests,
  SUM(COALESCE(original_tokens, input_tokens))           AS original_tokens,
  SUM(COALESCE(compressed_tokens, input_tokens))         AS compressed_tokens,
  SUM(input_tokens)                                      AS sent_tokens,
  SUM(output_tokens)                                     AS output_tokens,
  SUM(saved_tokens)                                      AS saved_tokens,
  ROUND(AVG(savings_pct), 2)                             AS avg_savings_pct,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)             AS cache_hits,
  SUM(CASE WHEN provider_was_free THEN 1 ELSE 0 END)     AS free_calls,
  ROUND(SUM(cost_usd)::NUMERIC, 4)                       AS cost_usd,
  ROUND(SUM(saved_cost_usd)::NUMERIC, 4)                 AS saved_cost_usd,
  ROUND(AVG(quality_score), 2)                           AS avg_quality_score,
  ROUND(
    100.0 * SUM(saved_tokens) / NULLIF(SUM(input_tokens + saved_tokens), 0),
    1
  )                                                      AS compression_pct
FROM token_usage_log
GROUP BY DATE(logged_at), client_id, provider
ORDER BY day DESC, requests DESC;

COMMIT;
