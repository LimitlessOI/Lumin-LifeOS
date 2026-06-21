-- SYNOPSIS: Database migration — 20260522_builder_audit_before_done_phase7.sql.
-- Phase 7 — audit-before-done (conditional completion + session linkage)
-- @ssot docs/projects/builder-final-synthesis-rerun/FINAL_BUILDER_IMPLEMENTATION_ORDER.md Slice 7

ALTER TABLE project_segments
  DROP CONSTRAINT IF EXISTS project_segments_status_check;

ALTER TABLE project_segments
  ADD CONSTRAINT project_segments_status_check
  CHECK (status IN ('pending', 'in_progress', 'conditional', 'done', 'blocked', 'skipped'));

ALTER TABLE builder_task_receipts
  DROP CONSTRAINT IF EXISTS builder_task_receipts_status_check;

ALTER TABLE builder_task_receipts
  ADD CONSTRAINT builder_task_receipts_status_check
  CHECK (status IN (
    'conditional', 'done', 'failed', 'halted', 'blocked', 'council_stop', 'file_violation', 'audit_failed'
  ));

ALTER TABLE builder_task_receipts
  ADD COLUMN IF NOT EXISTS build_session_id TEXT,
  ADD COLUMN IF NOT EXISTS auditor_session_id TEXT;

ALTER TABLE builder_audit_receipts
  ADD COLUMN IF NOT EXISTS build_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_task_receipts_build_session ON builder_task_receipts(build_session_id);
CREATE INDEX IF NOT EXISTS idx_audit_receipts_build_session ON builder_audit_receipts(build_session_id);

COMMENT ON COLUMN builder_task_receipts.build_session_id IS
  'Builder execution session — must differ from auditor_session_id (Phase 7 independence).';
COMMENT ON COLUMN builder_task_receipts.auditor_session_id IS
  'Independent OIL audit session id — required before status may become done/VERIFIED.';
