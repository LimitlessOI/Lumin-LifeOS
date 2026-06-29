-- SYNOPSIS: Database migration — 20260526_self_repair_memory_recovery.sql.
-- Third attempt to create self_repair_memory_events.
-- Prior migrations (20260524_self_repair_memory_events.sql and
-- 20260524_self_repair_memory_events_fix.sql) both failed on Railway and were
-- marked-applied-without-commit by the migration runner. This migration omits
-- the epistemic_facts FK reference (which may have caused the prior rollback)
-- and uses bare DDL with no BEGIN/COMMIT wrapper.
-- @ssot docs/products/command-center/PRODUCT_HOME.md

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
    fact_id              INTEGER
);

CREATE INDEX IF NOT EXISTS idx_srme_created_at
    ON self_repair_memory_events USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_srme_result
    ON self_repair_memory_events USING btree (result);
