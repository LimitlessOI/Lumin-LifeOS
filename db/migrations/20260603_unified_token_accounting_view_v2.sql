-- SYNOPSIS: Database migration — 20260603_unified_token_accounting_view_v2.sql.
-- Migration: 20260603_unified_token_accounting_view_v2
-- Idempotent unified view — omits token_optimizer_daily when table absent on Neon
-- @ssot docs/products/token-accounting-os/PRODUCT_HOME.md

BEGIN;

ALTER TABLE operator_consumption_ledger ADD COLUMN IF NOT EXISTS model TEXT;

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
