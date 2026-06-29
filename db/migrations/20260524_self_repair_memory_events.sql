-- SYNOPSIS: Database migration — 20260524_self_repair_memory_events.sql.
-- db/migrations/20260524_self_repair_memory_events.sql

BEGIN;

CREATE TABLE IF NOT EXISTS self_repair_memory_events (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trigger TEXT,
    issue_detected TEXT,
    repair_chain_run TEXT,
    result TEXT CHECK (result IN ('PASS','FAILED','BLOCKED','DRY_RUN')),
    receipts_written JSONB DEFAULT '[]',
    lesson_learned TEXT,
    prevention_rule TEXT,
    confidence NUMERIC(4,3) DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    source_execution_id TEXT,
    repair_id TEXT,
    deploy_sha TEXT,
    proof_status_before TEXT,
    proof_status_after TEXT,
    duration_ms INTEGER,
    classification TEXT,
    classification_signals JSONB,
    verification_path TEXT,
    triggered_by TEXT,
    fact_id INTEGER REFERENCES epistemic_facts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_self_repair_memory_events_created_at ON self_repair_memory_events USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_self_repair_memory_events_result ON self_repair_memory_events USING btree (result);

COMMENT ON TABLE self_repair_memory_events IS 'self_repair_memory_events table for tracking self-repair events';

COMMENT ON COLUMN self_repair_memory_events.classification IS 'Classification of the self-repair event';

COMMENT ON COLUMN self_repair_memory_events.classification_signals IS 'Signals used for classification of the self-repair event';

COMMENT ON COLUMN self_repair_memory_events.verification_path IS 'Verification path for the self-repair event';

COMMENT ON COLUMN self_repair_memory_events.triggered_by IS 'Triggered by for the self-repair event';

COMMENT ON COLUMN self_repair_memory_events.fact_id IS 'Foreign key referencing epistemic_facts table';

-- @ssot docs/products/command-center/PRODUCT_HOME.md

COMMIT;