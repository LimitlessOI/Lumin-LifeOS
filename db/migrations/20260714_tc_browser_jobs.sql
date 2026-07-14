-- SYNOPSIS: Durable TC browser automation jobs (survive multi-instance Railway)
-- @ssot docs/products/tc-service/PRODUCT_HOME.md

CREATE TABLE IF NOT EXISTS tc_browser_jobs (
  id UUID PRIMARY KEY,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  transaction_id INTEGER,
  request_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  steps_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  dry_run BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS tc_browser_jobs_status_idx ON tc_browser_jobs (status);
CREATE INDEX IF NOT EXISTS tc_browser_jobs_kind_created_idx ON tc_browser_jobs (kind, created_at DESC);
CREATE INDEX IF NOT EXISTS tc_browser_jobs_tx_idx ON tc_browser_jobs (transaction_id);
