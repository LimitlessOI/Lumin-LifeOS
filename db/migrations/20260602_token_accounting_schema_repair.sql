-- SYNOPSIS: Database migration — 20260602_token_accounting_schema_repair.sql.
-- Migration: 20260602_token_accounting_schema_repair
-- Repair partial 20260531 apply — add missing OCL/token_usage_log columns + unmetered + unified view
-- @ssot docs/projects/AMENDMENT_44_TOKEN_ACCOUNTING_OS.md

BEGIN;

-- OCL may exist from partial apply with fewer columns
ALTER TABLE operator_consumption_ledger ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE operator_consumption_ledger ADD COLUMN IF NOT EXISTS task_id TEXT;
ALTER TABLE operator_consumption_ledger ADD COLUMN IF NOT EXISTS blueprint_id TEXT;
ALTER TABLE operator_consumption_ledger ADD COLUMN IF NOT EXISTS product_lane TEXT;
ALTER TABLE operator_consumption_ledger ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE operator_consumption_ledger ADD COLUMN IF NOT EXISTS input_tokens INTEGER NOT NULL DEFAULT 0;
ALTER TABLE operator_consumption_ledger ADD COLUMN IF NOT EXISTS output_tokens INTEGER NOT NULL DEFAULT 0;
ALTER TABLE operator_consumption_ledger ADD COLUMN IF NOT EXISTS estimated_cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0;
ALTER TABLE operator_consumption_ledger ADD COLUMN IF NOT EXISTS free_tier BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE operator_consumption_ledger ADD COLUMN IF NOT EXISTS free_tier_source TEXT;
ALTER TABLE operator_consumption_ledger ADD COLUMN IF NOT EXISTS remaining_free_tokens_estimate INTEGER;
ALTER TABLE operator_consumption_ledger ADD COLUMN IF NOT EXISTS manual_entry BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE operator_consumption_ledger ADD COLUMN IF NOT EXISTS evidence_note TEXT;
ALTER TABLE operator_consumption_ledger ADD COLUMN IF NOT EXISTS screenshot_path TEXT;
ALTER TABLE operator_consumption_ledger ADD COLUMN IF NOT EXISTS raw_payload JSONB;
ALTER TABLE operator_consumption_ledger ADD COLUMN IF NOT EXISTS logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_ocl_source ON operator_consumption_ledger (source);
CREATE INDEX IF NOT EXISTS idx_ocl_logged_at ON operator_consumption_ledger (logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_ocl_task_id ON operator_consumption_ledger (task_id);
CREATE INDEX IF NOT EXISTS idx_ocl_product_lane ON operator_consumption_ledger (product_lane);

CREATE TABLE IF NOT EXISTS ai_unmetered_exceptions (
  id          BIGSERIAL PRIMARY KEY,
  source      TEXT NOT NULL DEFAULT 'council',
  provider    TEXT,
  model       TEXT,
  task_id     TEXT,
  task_type   TEXT,
  reason      TEXT NOT NULL,
  error       TEXT,
  payload     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unmetered_created ON ai_unmetered_exceptions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unmetered_source ON ai_unmetered_exceptions (source, created_at DESC);

CREATE TABLE IF NOT EXISTS provider_free_tier_ledger (
  id                        BIGSERIAL PRIMARY KEY,
  provider                  TEXT NOT NULL,
  model                     TEXT,
  period_start              TIMESTAMPTZ NOT NULL,
  period_end                TIMESTAMPTZ,
  allowance_tokens          INTEGER,
  used_tokens_estimate      INTEGER NOT NULL DEFAULT 0,
  remaining_tokens_estimate INTEGER,
  confidence                TEXT NOT NULL DEFAULT 'UNKNOWN',
  source                    TEXT NOT NULL DEFAULT 'ledger_estimate',
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, model, period_start)
);

CREATE INDEX IF NOT EXISTS idx_pft_provider ON provider_free_tier_ledger (provider, updated_at DESC);

ALTER TABLE token_usage_log
  ADD COLUMN IF NOT EXISTS ccl_used BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ccl_packet_id TEXT,
  ADD COLUMN IF NOT EXISTS ccl_authority_level TEXT,
  ADD COLUMN IF NOT EXISTS ccl_round_trip_status TEXT,
  ADD COLUMN IF NOT EXISTS ccl_estimated_savings_tokens INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ccl_quality_result TEXT,
  ADD COLUMN IF NOT EXISTS product_lane TEXT,
  ADD COLUMN IF NOT EXISTS blueprint_id TEXT,
  ADD COLUMN IF NOT EXISTS oil_result TEXT;

CREATE OR REPLACE VIEW unified_token_accounting_report AS
SELECT
  'token_usage_log'::TEXT AS source_system,
  provider,
  model,
  COALESCE(product_lane, task_type) AS product_lane,
  COALESCE(request_id, session_id) AS task_id,
  input_tokens,
  output_tokens,
  (COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)) AS total_tokens,
  COALESCE(saved_tokens, 0) AS saved_tokens,
  COALESCE(cost_usd, 0) AS estimated_cost_usd,
  COALESCE(saved_cost_usd, 0) AS saved_cost_usd,
  CASE WHEN provider_was_free THEN COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0) ELSE 0 END AS free_tier_tokens,
  COALESCE(ccl_used, FALSE) AS ccl_used,
  COALESCE((compression_layers ? 'lcl_codebook') OR (compression_layers ? 'lcl'), FALSE) AS lcl_used,
  COALESCE(cache_hit, FALSE) AS cache_hit,
  quality_score,
  oil_result,
  logged_at
FROM token_usage_log
UNION ALL
SELECT
  'operator_consumption_ledger'::TEXT,
  source AS provider,
  model,
  product_lane,
  task_id,
  input_tokens,
  output_tokens,
  COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0) AS total_tokens,
  0 AS saved_tokens,
  estimated_cost_usd,
  0 AS saved_cost_usd,
  CASE WHEN free_tier THEN COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0) ELSE 0 END,
  FALSE,
  FALSE,
  FALSE,
  NULL::NUMERIC,
  NULL::TEXT,
  logged_at
FROM operator_consumption_ledger
UNION ALL
SELECT
  'conductor_session_savings'::TEXT,
  'conductor'::TEXT AS provider,
  'session'::TEXT AS model,
  source AS product_lane,
  session_id AS task_id,
  compact_tokens AS input_tokens,
  0 AS output_tokens,
  compact_tokens AS total_tokens,
  saved_tokens,
  cost_avoided_usd AS estimated_cost_usd,
  cost_avoided_usd AS saved_cost_usd,
  0,
  FALSE,
  FALSE,
  FALSE,
  NULL::NUMERIC,
  NULL::TEXT,
  session_ts AS logged_at
FROM conductor_session_savings;

COMMIT;
