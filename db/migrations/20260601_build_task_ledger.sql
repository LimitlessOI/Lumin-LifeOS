-- SYNOPSIS: Database migration — 20260601_build_task_ledger.sql.
-- Migration: 20260601_build_task_ledger
-- BuilderOS Control Plane — canonical build measurement ledger
-- @ssot docs/products/builderos/PRODUCT_HOME.md

BEGIN;

CREATE TABLE IF NOT EXISTS build_task_ledger (
  id                  BIGSERIAL PRIMARY KEY,
  task_id               TEXT NOT NULL,
  blueprint_id          TEXT,
  product_lane          TEXT,
  source                TEXT DEFAULT 'builderos',
  status                TEXT NOT NULL DEFAULT 'running'
                          CHECK (status IN ('running','done','failed','blocked','halted','cancelled')),
  start_time            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time              TIMESTAMPTZ,
  duration_ms           INTEGER GENERATED ALWAYS AS (
                          CASE WHEN end_time IS NOT NULL
                            THEN (EXTRACT(EPOCH FROM (end_time - start_time)) * 1000)::INTEGER
                            ELSE NULL END
                        ) STORED,
  files_planned         TEXT[],
  files_changed         TEXT[],
  lines_added           INTEGER DEFAULT 0,
  lines_removed         INTEGER DEFAULT 0,
  commands_run          JSONB DEFAULT '[]'::jsonb,
  tests_run             JSONB DEFAULT '[]'::jsonb,
  failures              JSONB DEFAULT '[]'::jsonb,
  retries               INTEGER NOT NULL DEFAULT 0,
  model_used            TEXT,
  agent_used            TEXT,
  human_intervention    BOOLEAN NOT NULL DEFAULT FALSE,
  human_intervention_note TEXT,
  deploy_status         TEXT,
  rollback_status       TEXT,
  token_receipt_id      BIGINT,
  oil_receipt_id        TEXT,
  unmetered_exception_id BIGINT,
  proof_required        JSONB DEFAULT '["token","build","oil"]'::jsonb,
  proof_status          TEXT DEFAULT 'pending'
                          CHECK (proof_status IN ('pending','partial','complete','exception')),
  metadata              JSONB DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_build_task_ledger_task_id ON build_task_ledger (task_id);
CREATE INDEX IF NOT EXISTS idx_build_task_ledger_blueprint ON build_task_ledger (blueprint_id);
CREATE INDEX IF NOT EXISTS idx_build_task_ledger_start ON build_task_ledger (start_time DESC);
CREATE INDEX IF NOT EXISTS idx_build_task_ledger_status ON build_task_ledger (status, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_build_task_ledger_proof ON build_task_ledger (proof_status, start_time DESC);

-- Legacy alias table referenced by routes/tsos-task-ledger-routes.js (was never migrated)
CREATE TABLE IF NOT EXISTS builder_task_ledger (
  id                BIGSERIAL PRIMARY KEY,
  task_id           TEXT NOT NULL,
  task_domain       TEXT,
  target_file       TEXT,
  model_used        TEXT,
  tokens_in         INTEGER DEFAULT 0,
  tokens_out        INTEGER DEFAULT 0,
  cost_usd          NUMERIC(10,6) DEFAULT 0,
  files_read_count  INTEGER DEFAULT 0,
  retry_count       INTEGER DEFAULT 0,
  committed         BOOLEAN DEFAULT FALSE,
  build_wall_ms     INTEGER,
  drift_events      INTEGER DEFAULT 0,
  useful_work       BOOLEAN,
  failure_stage     TEXT,
  commit_sha        TEXT,
  runner            TEXT,
  session_id        TEXT,
  logged_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_builder_task_ledger_task ON builder_task_ledger (task_id, logged_at DESC);

COMMIT;
