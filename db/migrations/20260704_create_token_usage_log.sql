-- SYNOPSIS: Database migration — 20260704_create_token_usage_log.sql.
-- Migration: create token_usage_log table for logging token usage

CREATE TABLE IF NOT EXISTS token_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ccl_used TEXT DEFAULT 'UNKNOWN',
  ccl_packet_id TEXT DEFAULT 'UNKNOWN',
  ccl_authority_level TEXT DEFAULT 'UNKNOWN',
  ccl_round_trip_status TEXT DEFAULT 'UNKNOWN',
  ccl_estimated_savings_tokens INT DEFAULT 'UNKNOWN',
  ccl_quality_result TEXT DEFAULT 'UNKNOWN',
  product_lane TEXT DEFAULT 'UNKNOWN',
  blueprint_id UUID DEFAULT 'UNKNOWN',
  oil_result TEXT DEFAULT 'UNKNOWN'
);

CREATE INDEX IF NOT EXISTS idx_token_usage_log_blueprint_id
  ON token_usage_log (blueprint_id);

CREATE INDEX IF NOT EXISTS idx_token_usage_log_product_lane
  ON token_usage_log (product_lane);