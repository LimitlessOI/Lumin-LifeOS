-- SYNOPSIS: Database migration — 20260519_builder_trust_spine.sql.
-- ============================================================
-- Builder Trust Spine — Runtime Tables
-- Amendment: docs/projects/builder-final-synthesis-rerun/BLUEPRINT.md
-- Slice 1: Serial Execution Enforcement + Truth Surface Schema
--
-- Tables created:
--   builder_truth_surfaces   — 5 runtime truth surfaces (deploy, migration, queue, environment, operator)
--   builder_task_receipts    — per-task execution receipt (all runs, including failed)
--   builder_audit_receipts   — OIL independent audit receipts (kill_test_flag included)
--   builder_halt_log         — every HALT raised, with code, context, resolution state
--   builder_failure_log      — failure taxonomy per task execution
--   builder_queue_state      — queue truth snapshot (pending/active/blocked counts)
--   builder_replay_baselines — git SHA baselines for rollback (Slice 10)
--   builder_active_tasks     — serial execution lock (AUTONOMY_WRITE_LOCK)
--
-- Write authority law:
--   builder_truth_surfaces is writable ONLY by OIL audit routes.
--   Builder execution code (builder-supervisor.js) may READ only.
--   Enforced at application layer — see services/builder-truth-surface.js.
--   Any write with written_by != 'OIL' is rejected with TRUTH_SURFACE_VIOLATION halt.
--
-- FD03 receipt: Neon PostgreSQL + file mirror strategy confirmed 2026-05-19
-- ============================================================

-- ── Builder Truth Surfaces ────────────────────────────────────────────────────
-- The five runtime truth surfaces defined in BLUEPRINT.md stale-truth TTL table.
-- Only OIL audit routes may write to this table.
-- Surface names must match exactly: deploy | migration | queue | environment | operator
-- OIL-B1 fix (2026-05-20): STORED GENERATED is_stale column removed.
-- PostgreSQL STORED GENERATED columns are computed at INSERT/UPDATE time only — not at query
-- time. A row written at T=0 with ttl=30min returns is_stale=false at T=60min forever.
-- Staleness is now calculated at query time using:
--   NOW() > updated_at + (ttl_minutes || ' minutes')::INTERVAL
-- See services/builder-truth-surface.js getStaleSurfaces() and readTruthSurface().
CREATE TABLE IF NOT EXISTS builder_truth_surfaces (
  id              SERIAL PRIMARY KEY,
  surface_name    TEXT NOT NULL UNIQUE
                    CHECK (surface_name IN ('deploy','migration','queue','environment','operator')),
  value_json      JSONB NOT NULL DEFAULT '{}',
  written_by      TEXT NOT NULL DEFAULT 'OIL'
                    CHECK (written_by = 'OIL'),        -- hard constraint: only OIL writes
  ttl_minutes     INT NOT NULL,                        -- stale threshold per BLUEPRINT.md
  heartbeat_minutes INT NOT NULL,                      -- required refresh cadence
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- is_stale is NOT a column. Evaluate at query time: NOW() > updated_at + (ttl_minutes || ' minutes')::INTERVAL
);

CREATE INDEX IF NOT EXISTS idx_truth_surfaces_name    ON builder_truth_surfaces(surface_name);
CREATE INDEX IF NOT EXISTS idx_truth_surfaces_updated ON builder_truth_surfaces(updated_at DESC);
-- No index on is_stale: stale detection uses a runtime expression, not a stored column.

COMMENT ON TABLE builder_truth_surfaces IS
  'The five runtime truth surfaces. Write authority: OIL only. Builder supervisor reads only. '
  'Stale surfaces block task dispatch (Slice 2+).';

-- Seed the 5 surfaces with TTLs from BLUEPRINT.md stale-truth TTL table
INSERT INTO builder_truth_surfaces (surface_name, value_json, written_by, ttl_minutes, heartbeat_minutes)
VALUES
  ('deploy',      '{"status":"unknown","note":"stub — awaiting first OIL write"}', 'OIL', 30,  10),
  ('migration',   '{"status":"unknown","note":"stub — awaiting first OIL write"}', 'OIL', 60,  15),
  ('queue',       '{"status":"unknown","note":"stub — awaiting first OIL write"}', 'OIL', 5,   1),
  ('environment', '{"status":"unknown","note":"stub — awaiting first OIL write"}', 'OIL', 60,  15),
  ('operator',    '{"status":"unknown","note":"stub — awaiting first OIL write"}', 'OIL', 120, 30)
ON CONFLICT (surface_name) DO NOTHING;

-- ── Builder Active Tasks (Serial Lock / AUTONOMY_WRITE_LOCK) ──────────────────
-- One row per active task. Tier 0 allows max 1 row with status='active'.
-- 30-minute hard expiry: expired rows are treated as stale and ignored by the lock check.
-- Only Adam may override an active lock (override_by = 'ADAM', override_at set).
CREATE TABLE IF NOT EXISTS builder_active_tasks (
  id              SERIAL PRIMARY KEY,
  segment_id      INT REFERENCES project_segments(id) ON DELETE SET NULL,
  project_slug    TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','complete','error','expired','override')),
  autonomy_tier   INT NOT NULL DEFAULT 0,
  acquired_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 minutes',
  released_at     TIMESTAMPTZ,
  override_by     TEXT,                                -- 'ADAM' if manually overridden
  override_at     TIMESTAMPTZ,
  override_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_active_tasks_status  ON builder_active_tasks(status);
CREATE INDEX IF NOT EXISTS idx_active_tasks_expires ON builder_active_tasks(expires_at);
CREATE INDEX IF NOT EXISTS idx_active_tasks_segment ON builder_active_tasks(segment_id);

COMMENT ON TABLE builder_active_tasks IS
  'Serial execution lock (AUTONOMY_WRITE_LOCK). '
  'Tier 0: max 1 active row. Tier 1: max 2. '
  'Rows with expires_at < NOW() are treated as stale and do not block dispatch. '
  'Adam-only override: set status=override with override_by=ADAM.';

-- ── Builder Task Receipts ─────────────────────────────────────────────────────
-- One row per task execution (success or failure). Required per BLDR-F04 audit law.
-- This is the primary audit trail: every run of every task is recorded here.
CREATE TABLE IF NOT EXISTS builder_task_receipts (
  id                SERIAL PRIMARY KEY,
  segment_id        INT REFERENCES project_segments(id) ON DELETE SET NULL,
  project_slug      TEXT NOT NULL,
  active_task_id    INT REFERENCES builder_active_tasks(id) ON DELETE SET NULL,
  status            TEXT NOT NULL
                      CHECK (status IN ('done','failed','halted','blocked','council_stop','file_violation')),
  -- Execution metadata
  started_at        TIMESTAMPTZ NOT NULL,
  completed_at      TIMESTAMPTZ,
  elapsed_minutes   NUMERIC(8,3),
  -- Council verdict (from pre-build review)
  council_verdict   TEXT CHECK (council_verdict IN ('PROCEED','CAUTION','STOP','NEEDS_HUMAN')),
  council_guidance  TEXT,
  -- File scope
  allowed_files     TEXT[],
  files_written     TEXT[],
  scope_violation   BOOLEAN DEFAULT FALSE,
  -- Halt info (when status=halted)
  halt_code         TEXT,
  halt_context      JSONB,
  -- Token telemetry (populated in Slice 2)
  tokens_used       INT,
  token_budget      INT,
  -- PR / commit
  pr_url            TEXT,
  commit_sha        TEXT,
  -- Raw output (truncated to 10k chars)
  stdout_excerpt    TEXT,
  -- Audit cross-reference
  audit_receipt_id  INT,                              -- FK set after OIL audit
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_receipts_segment  ON builder_task_receipts(segment_id);
CREATE INDEX IF NOT EXISTS idx_task_receipts_status   ON builder_task_receipts(status);
CREATE INDEX IF NOT EXISTS idx_task_receipts_project  ON builder_task_receipts(project_slug);
CREATE INDEX IF NOT EXISTS idx_task_receipts_created  ON builder_task_receipts(created_at DESC);

COMMENT ON TABLE builder_task_receipts IS
  'Immutable audit trail: one row per task run. Required by BLDR-F04 audit-before-done law. '
  'audit_receipt_id is populated after OIL issues the independent audit receipt.';

-- ── Builder Audit Receipts ────────────────────────────────────────────────────
-- Written by OIL (independent audit session) after a task completes.
-- This is the OIL proof record — separate from the Builder's own receipt.
-- kill_test_flag: true if this receipt is from a false-green kill test run.
CREATE TABLE IF NOT EXISTS builder_audit_receipts (
  id                  SERIAL PRIMARY KEY,
  task_receipt_id     INT REFERENCES builder_task_receipts(id) ON DELETE SET NULL,
  segment_id          INT REFERENCES project_segments(id) ON DELETE SET NULL,
  project_slug        TEXT NOT NULL,
  -- OIL verdict
  verdict             TEXT NOT NULL
                        CHECK (verdict IN ('PASS','FAIL','CONDITIONAL_PASS','ESCALATE')),
  confidence_pct      INT CHECK (confidence_pct BETWEEN 0 AND 100),
  findings            TEXT,                              -- free-text findings summary
  findings_json       JSONB,                             -- structured findings
  -- Kill test flag (false-green detection)
  kill_test_flag      BOOLEAN NOT NULL DEFAULT FALSE,
  kill_test_scenario  TEXT,                              -- FG-1, FG-2, or FG-3
  -- Independence enforcement
  audit_session_id    TEXT,                              -- distinct from build session
  auditor_notes       TEXT,
  -- Timestamps
  audited_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  written_by          TEXT NOT NULL DEFAULT 'OIL'
                        CHECK (written_by = 'OIL')
);

CREATE INDEX IF NOT EXISTS idx_audit_receipts_task    ON builder_audit_receipts(task_receipt_id);
CREATE INDEX IF NOT EXISTS idx_audit_receipts_segment ON builder_audit_receipts(segment_id);
CREATE INDEX IF NOT EXISTS idx_audit_receipts_verdict ON builder_audit_receipts(verdict);
CREATE INDEX IF NOT EXISTS idx_audit_receipts_kill    ON builder_audit_receipts(kill_test_flag) WHERE kill_test_flag = TRUE;

-- Back-reference from task receipts to audit receipts
ALTER TABLE builder_task_receipts
  ADD CONSTRAINT fk_audit_receipt
  FOREIGN KEY (audit_receipt_id) REFERENCES builder_audit_receipts(id) ON DELETE SET NULL;

COMMENT ON TABLE builder_audit_receipts IS
  'OIL-only audit receipts. Written by an independent audit session after each Builder task. '
  'kill_test_flag=true marks false-green kill test runs. '
  'written_by constrained to OIL — Builder code cannot write here.';

-- ── Builder Halt Log ──────────────────────────────────────────────────────────
-- Every HALT raised during Builder execution, with resolution state.
-- Halts are not deleted on resolution — they become the audit trail.
CREATE TABLE IF NOT EXISTS builder_halt_log (
  id              SERIAL PRIMARY KEY,
  halt_code       TEXT NOT NULL,                       -- e.g. ALLOWED_FILES_RUNTIME_ENFORCEMENT_GAP
  segment_id      INT REFERENCES project_segments(id) ON DELETE SET NULL,
  project_slug    TEXT,
  context_json    JSONB,                               -- arbitrary context at halt time
  raised_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  resolved_by     TEXT,                                -- 'ADAM', 'OIL', 'CC', 'SYSTEM'
  resolution      TEXT,                                -- how it was resolved
  escalation_tier TEXT CHECK (escalation_tier IN ('T1','T2','T3','T4','T5'))
);

CREATE INDEX IF NOT EXISTS idx_halt_log_code     ON builder_halt_log(halt_code);
CREATE INDEX IF NOT EXISTS idx_halt_log_segment  ON builder_halt_log(segment_id);
CREATE INDEX IF NOT EXISTS idx_halt_log_resolved ON builder_halt_log(resolved_at) WHERE resolved_at IS NULL;

COMMENT ON TABLE builder_halt_log IS
  'Every HALT raised by the Builder system. Unresolved halts have resolved_at IS NULL. '
  'escalation_tier maps to Adam Interruption Thresholds T1-T5 from BLUEPRINT.md.';

-- ── Builder Failure Log ───────────────────────────────────────────────────────
-- Structured failure taxonomy — separate from the halt log.
-- Failure families from BLUEPRINT.md failure taxonomy (Slice 8 fleshes this out).
CREATE TABLE IF NOT EXISTS builder_failure_log (
  id              SERIAL PRIMARY KEY,
  task_receipt_id INT REFERENCES builder_task_receipts(id) ON DELETE SET NULL,
  segment_id      INT REFERENCES project_segments(id) ON DELETE SET NULL,
  project_slug    TEXT,
  failure_family  TEXT NOT NULL
                    CHECK (failure_family IN (
                      'scope_violation',
                      'budget_exceeded',
                      'council_stop',
                      'verification_failed',
                      'runtime_error',
                      'partial_completion',
                      'stale_truth',
                      'write_authority_violation',
                      'serial_lock_conflict',
                      'unknown'
                    )),
  failure_detail  TEXT,
  context_json    JSONB,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retry_eligible  BOOLEAN NOT NULL DEFAULT FALSE,
  retry_count     INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_failure_log_family  ON builder_failure_log(failure_family);
CREATE INDEX IF NOT EXISTS idx_failure_log_segment ON builder_failure_log(segment_id);
CREATE INDEX IF NOT EXISTS idx_failure_log_retry   ON builder_failure_log(retry_eligible) WHERE retry_eligible = TRUE;

COMMENT ON TABLE builder_failure_log IS
  'Failure taxonomy per task run. failure_family is the structured classification. '
  'Slice 8 fleshes out retry logic and partial-state recovery using this table.';

-- ── Builder Queue State ───────────────────────────────────────────────────────
-- Snapshot of queue truth at a point in time. Written by OIL after each queue scan.
-- Not the live project_segments table — this is the truth surface for queue state.
CREATE TABLE IF NOT EXISTS builder_queue_state (
  id              SERIAL PRIMARY KEY,
  pending_count   INT NOT NULL DEFAULT 0,
  active_count    INT NOT NULL DEFAULT 0,
  blocked_count   INT NOT NULL DEFAULT 0,
  done_count      INT NOT NULL DEFAULT 0,
  projects_json   JSONB,                               -- per-project breakdown
  snapshot_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  written_by      TEXT NOT NULL DEFAULT 'OIL'
                    CHECK (written_by IN ('OIL','SYSTEM'))
);

CREATE INDEX IF NOT EXISTS idx_queue_state_snapshot ON builder_queue_state(snapshot_at DESC);

COMMENT ON TABLE builder_queue_state IS
  'Queue truth snapshots. Latest row is the current queue truth surface. '
  'SELECT * FROM builder_queue_state ORDER BY snapshot_at DESC LIMIT 1;';

-- ── Builder Replay Baselines ──────────────────────────────────────────────────
-- Git SHA baselines captured before each task runs. Used by Slice 10 rollback drill.
-- One row per segment, captures the repo state BEFORE builder touched anything.
CREATE TABLE IF NOT EXISTS builder_replay_baselines (
  id              SERIAL PRIMARY KEY,
  segment_id      INT REFERENCES project_segments(id) ON DELETE SET NULL,
  project_slug    TEXT NOT NULL,
  baseline_sha    TEXT NOT NULL,                       -- git SHA at baseline capture time
  branch_name     TEXT,                                -- branch the baseline was captured on
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  files_snapshot  JSONB,                               -- optional: list of allowed_files + their SHAs
  used_for_rollback BOOLEAN DEFAULT FALSE,
  rollback_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_baselines_segment ON builder_replay_baselines(segment_id);
CREATE INDEX IF NOT EXISTS idx_baselines_sha     ON builder_replay_baselines(baseline_sha);
CREATE INDEX IF NOT EXISTS idx_baselines_project ON builder_replay_baselines(project_slug);

COMMENT ON TABLE builder_replay_baselines IS
  'Pre-task git baselines for rollback. Slice 10 drills rollback against these. '
  'Capture before any worktree is created for the segment.';

-- ── Tier 0 task DNA on project_segments (Slice 1) ─────────────────────────────
-- Optional JSONB for telemetry/cache/truncation/decision-authority flags.
-- rollback_path may also use existing rollback_note column on the segment row.
ALTER TABLE project_segments
  ADD COLUMN IF NOT EXISTS task_dna JSONB;

COMMENT ON COLUMN project_segments.task_dna IS
  'Tier 0 dispatch contract fields: telemetry_required, cache_status_required, '
  'truncation_detection_required, lower_model_decision_authority. '
  'Missing required keys → DISPATCH_GATE_FAIL (task held PENDING).';
