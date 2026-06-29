-- SYNOPSIS: System operation timeline — duration + token correlation.
-- Migration: 20260628_system_operation_timeline
-- @ssot docs/products/token-accounting-os/PRODUCT_HOME.md

BEGIN;

ALTER TABLE token_usage_log
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

CREATE INDEX IF NOT EXISTS idx_token_log_started_at
  ON token_usage_log (started_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_token_log_request_id
  ON token_usage_log (request_id, logged_at DESC);

CREATE TABLE IF NOT EXISTS system_operation_log (
  id                  BIGSERIAL PRIMARY KEY,
  task_id             TEXT NOT NULL,
  operation           TEXT NOT NULL,
  source              TEXT DEFAULT 'system',
  status              TEXT NOT NULL DEFAULT 'running'
                        CHECK (status IN ('running','ok','failed','skipped')),
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at            TIMESTAMPTZ,
  duration_ms         INTEGER GENERATED ALWAYS AS (
                        CASE WHEN ended_at IS NOT NULL
                          THEN (EXTRACT(EPOCH FROM (ended_at - started_at)) * 1000)::INTEGER
                          ELSE NULL END
                      ) STORED,
  input_tokens        INTEGER DEFAULT 0,
  output_tokens       INTEGER DEFAULT 0,
  total_tokens        INTEGER GENERATED ALWAYS AS (
                        COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)
                      ) STORED,
  cost_usd            NUMERIC(10,6) DEFAULT 0,
  token_receipt_id    BIGINT REFERENCES token_usage_log(id) ON DELETE SET NULL,
  metadata            JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_operation_log_started
  ON system_operation_log (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_operation_log_task
  ON system_operation_log (task_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_operation_log_operation
  ON system_operation_log (operation, started_at DESC);

CREATE OR REPLACE VIEW system_timeline_report AS
SELECT
  'token'::TEXT AS row_kind,
  tul.id::TEXT AS row_id,
  COALESCE(tul.request_id, tul.session_id, 'token-' || tul.id::TEXT) AS task_id,
  COALESCE(tul.product_lane, tul.task_type, 'ai_call') AS operation,
  tul.provider AS source,
  'ok'::TEXT AS status,
  COALESCE(tul.started_at, tul.logged_at) AS started_at,
  tul.logged_at AS ended_at,
  COALESCE(tul.duration_ms,
    CASE WHEN tul.started_at IS NOT NULL
      THEN (EXTRACT(EPOCH FROM (tul.logged_at - tul.started_at)) * 1000)::INTEGER
      ELSE NULL END) AS duration_ms,
  COALESCE(tul.input_tokens, 0) AS input_tokens,
  COALESCE(tul.output_tokens, 0) AS output_tokens,
  COALESCE(tul.input_tokens, 0) + COALESCE(tul.output_tokens, 0) AS total_tokens,
  COALESCE(tul.cost_usd, 0) AS cost_usd,
  tul.id AS token_receipt_id,
  jsonb_build_object(
    'model', tul.model,
    'cache_hit', COALESCE(tul.cache_hit, FALSE),
    'saved_tokens', COALESCE(tul.saved_tokens, 0)
  ) AS metadata
FROM token_usage_log tul

UNION ALL

SELECT
  'operation'::TEXT,
  sol.id::TEXT,
  sol.task_id,
  sol.operation,
  sol.source,
  sol.status,
  sol.started_at,
  sol.ended_at,
  sol.duration_ms,
  COALESCE(sol.input_tokens, 0),
  COALESCE(sol.output_tokens, 0),
  COALESCE(sol.total_tokens, 0),
  COALESCE(sol.cost_usd, 0),
  sol.token_receipt_id,
  sol.metadata
FROM system_operation_log sol

UNION ALL

SELECT
  'build'::TEXT,
  btl.id::TEXT,
  btl.task_id,
  COALESCE(btl.product_lane, 'build') AS operation,
  COALESCE(btl.source, 'builderos'),
  btl.status,
  btl.start_time AS started_at,
  btl.end_time AS ended_at,
  btl.duration_ms,
  0, 0, 0,
  0::NUMERIC,
  btl.token_receipt_id,
  jsonb_build_object(
    'blueprint_id', btl.blueprint_id,
    'proof_status', btl.proof_status,
    'model_used', btl.model_used
  )
FROM build_task_ledger btl;

COMMIT;
