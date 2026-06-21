-- SYNOPSIS: Database migration — 20260524_self_repair_memory_events_fix.sql.
-- Recovery migration: create self_repair_memory_events if the prior migration failed.
-- The prior migration (20260524_self_repair_memory_events.sql) was marked applied even
-- though it failed because the migration runner marks-applied on failure to avoid boot
-- loops. That migration included an invalid ssot_tag constraint on a non-existent column
-- which caused the full BEGIN/COMMIT block to roll back. This migration uses IF NOT EXISTS
-- to safely recover without risk of duplicate-table errors.
-- @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md

CREATE TABLE IF NOT EXISTS self_repair_memory_events (
    id                   SERIAL PRIMARY KEY,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trigger              TEXT,
    issue_detected       TEXT,
    repair_chain_run     TEXT,
    result               TEXT CHECK (result IN ('PASS','FAILED','BLOCKED','DRY_RUN')),
    receipts_written     JSONB DEFAULT '[]',
    lesson_learned       TEXT,
    prevention_rule      TEXT,
    confidence           NUMERIC(4,3) DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    source_execution_id  TEXT,
    repair_id            TEXT,
    deploy_sha           TEXT,
    proof_status_before  TEXT,
    proof_status_after   TEXT,
    duration_ms          INTEGER,
    classification       TEXT,
    classification_signals JSONB,
    verification_path    TEXT,
    triggered_by         TEXT,
    fact_id              INTEGER REFERENCES epistemic_facts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_self_repair_memory_events_created_at
    ON self_repair_memory_events USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_self_repair_memory_events_result
    ON self_repair_memory_events USING btree (result);
