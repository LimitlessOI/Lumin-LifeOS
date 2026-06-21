-- SYNOPSIS: Database migration — 20260525_autonomous_telemetry.sql.
-- Autonomous telemetry — durable measurement for overnight / PB-governed runs.
-- No secrets. No prompt contents.

BEGIN;

CREATE TABLE IF NOT EXISTS autonomous_telemetry_events (
  id                      BIGSERIAL PRIMARY KEY,
  run_id                  TEXT NOT NULL,
  cycle_id                TEXT,
  session_id              TEXT,
  task_type               TEXT NOT NULL,
  task_goal               TEXT,
  model_used              TEXT,
  token_input_estimate    INTEGER,
  token_output_estimate   INTEGER,
  total_token_estimate    INTEGER,
  token_estimate_method   TEXT,
  wall_clock_ms           INTEGER,
  decision_latency_ms     INTEGER,
  build_latency_ms        INTEGER,
  verification_latency_ms INTEGER,
  repair_latency_ms       INTEGER,
  retries                 INTEGER NOT NULL DEFAULT 0,
  repair_attempts         INTEGER NOT NULL DEFAULT 0,
  proof_status_before     TEXT,
  proof_status_after      TEXT,
  audit_result            TEXT,
  pb_boundary             TEXT,
  stopped_reason          TEXT,
  useful_work_score       NUMERIC(6, 3),
  useful_work_method      TEXT,
  hallucination_detected  BOOLEAN NOT NULL DEFAULT FALSE,
  drift_detected          BOOLEAN NOT NULL DEFAULT FALSE,
  files_changed           JSONB NOT NULL DEFAULT '[]'::jsonb,
  commits_created         INTEGER NOT NULL DEFAULT 0,
  receipts_created        JSONB NOT NULL DEFAULT '[]'::jsonb,
  deploy_sha              TEXT,
  success                 BOOLEAN,
  metadata                JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autonomous_telemetry_session
  ON autonomous_telemetry_events (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_autonomous_telemetry_run
  ON autonomous_telemetry_events (run_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_autonomous_telemetry_task_type
  ON autonomous_telemetry_events (task_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_autonomous_telemetry_created
  ON autonomous_telemetry_events (created_at DESC);

COMMENT ON TABLE autonomous_telemetry_events IS 'Durable telemetry for autonomous/PB-governed work — estimates labeled, no prompt text';

COMMIT;
