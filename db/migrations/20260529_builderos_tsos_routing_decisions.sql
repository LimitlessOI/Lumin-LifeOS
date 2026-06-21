-- SYNOPSIS: Database migration — 20260529_builderos_tsos_routing_decisions.sql.
-- TSOS-G3.1 — routing decision log (shadow mode infrastructure).
-- Immutable audit of baseline vs TSOS-informed model/task-class selection.

BEGIN;

CREATE TABLE IF NOT EXISTS builderos_tsos_routing_decisions (
  id                         BIGSERIAL PRIMARY KEY,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dispatch_id                UUID NOT NULL DEFAULT gen_random_uuid(),
  mode                       TEXT NOT NULL CHECK (mode IN ('shadow', 'active')),
  routing_key                TEXT NOT NULL,
  target_file                TEXT,
  task_class_baseline        TEXT NOT NULL,
  task_class_selected        TEXT NOT NULL,
  baseline_model             TEXT NOT NULL,
  selected_model             TEXT NOT NULL,
  decision_changed           BOOLEAN NOT NULL DEFAULT false,
  change_reason_code         TEXT,
  change_reason_detail       TEXT,
  evidence_read_ok           BOOLEAN NOT NULL DEFAULT false,
  evidence_snapshot_json     JSONB,
  evidence_hook_count        INTEGER,
  evidence_g2_pct            NUMERIC(5, 1),
  evidence_verifier_link_pct NUMERIC(5, 1),
  token_estimate_baseline    INTEGER,
  token_estimate_selected    INTEGER,
  token_estimate_source      TEXT,
  cost_estimate_baseline_usd NUMERIC(12, 6),
  cost_estimate_selected_usd NUMERIC(12, 6),
  job_id                     UUID,
  builder_committed          BOOLEAN,
  verifier_ok                BOOLEAN,
  duration_ms                INTEGER,
  metadata_version           TEXT NOT NULL DEFAULT 'tsos-g3'
);

CREATE INDEX IF NOT EXISTS idx_tsos_routing_decisions_changed
  ON builderos_tsos_routing_decisions (decision_changed, mode, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tsos_routing_decisions_job
  ON builderos_tsos_routing_decisions (job_id);

CREATE INDEX IF NOT EXISTS idx_tsos_routing_decisions_created
  ON builderos_tsos_routing_decisions (created_at DESC);

COMMIT;
