-- SYNOPSIS: Database migration — 20260531_operator_consumption_ledger.sql.
-- Migration: 20260531_operator_consumption_ledger
-- Token Accounting OS — OCL1 operator/Cursor ledger + unmetered exceptions + free-tier ledger + CCL placeholder columns
-- @ssot docs/products/token-accounting-os/PRODUCT_HOME.md

BEGIN;

-- ── Operator Consumption Ledger (OCL1) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS operator_consumption_ledger (
  id                            BIGSERIAL PRIMARY KEY,
  source                        TEXT NOT NULL,
  operator                      TEXT NOT NULL DEFAULT 'adam',
  session_id                    TEXT,
  task_id                       TEXT,
  blueprint_id                  TEXT,
  product_lane                  TEXT,
  model                         TEXT,
  input_tokens                  INTEGER NOT NULL DEFAULT 0,
  output_tokens                 INTEGER NOT NULL DEFAULT 0,
  total_tokens                  INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  estimated_cost_usd              NUMERIC(10,6) NOT NULL DEFAULT 0,
  free_tier                     BOOLEAN NOT NULL DEFAULT FALSE,
  free_tier_source              TEXT,
  remaining_free_tokens_estimate INTEGER,
  manual_entry                  BOOLEAN NOT NULL DEFAULT TRUE,
  evidence_note                 TEXT,
  screenshot_path               TEXT,
  raw_payload                   JSONB,
  logged_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ocl_source ON operator_consumption_ledger (source);
CREATE INDEX IF NOT EXISTS idx_ocl_logged_at ON operator_consumption_ledger (logged_at DESC);

ALTER TABLE operator_consumption_ledger ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE operator_consumption_ledger ADD COLUMN IF NOT EXISTS task_id TEXT;
ALTER TABLE operator_consumption_ledger ADD COLUMN IF NOT EXISTS blueprint_id TEXT;
ALTER TABLE operator_consumption_ledger ADD COLUMN IF NOT EXISTS product_lane TEXT;

CREATE INDEX IF NOT EXISTS idx_ocl_task_id ON operator_consumption_ledger (task_id);
CREATE INDEX IF NOT EXISTS idx_ocl_product_lane ON operator_consumption_ledger (product_lane);

-- ── Unmetered exception receipts (mandatory when ledger write fails) ─────────
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

-- ── Provider free-tier estimates ─────────────────────────────────────────────
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

-- ── CCL placeholder columns on token_usage_log ───────────────────────────────
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

COMMIT;
