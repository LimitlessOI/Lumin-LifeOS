-- SYNOPSIS: Database migration — 20260521_memory_capsule_receipts.sql.
-- db/migrations/20260521_memory_capsule_receipts.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- retrieval_events is canonical from Amendment 39. Extend it for Memory Capsule Alpha
-- without replacing the original evidence/retrieval history contract.
ALTER TABLE retrieval_events
ADD COLUMN IF NOT EXISTS capsule_id UUID REFERENCES memory_capsules(capsule_id);

ALTER TABLE retrieval_events
ADD COLUMN IF NOT EXISTS task_scope TEXT;

ALTER TABLE retrieval_events
ADD COLUMN IF NOT EXISTS retrieval_lane TEXT;

ALTER TABLE retrieval_events
ADD COLUMN IF NOT EXISTS why_retrieved TEXT;

ALTER TABLE retrieval_events
ADD COLUMN IF NOT EXISTS allowed_use TEXT;

ALTER TABLE retrieval_events
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Canonical receipt log for all memory mutation, use, halt, and review receipts.
CREATE TABLE IF NOT EXISTS memory_use_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capsule_id UUID REFERENCES memory_capsules(capsule_id),
    receipt_type TEXT NOT NULL,
    use_type TEXT,
    decision_ref TEXT,
    task_scope TEXT,
    retrieval_lane TEXT,
    signal_id UUID,
    source_ref TEXT,
    created_by TEXT NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_use_receipts_capsule_id
    ON memory_use_receipts(capsule_id);

CREATE INDEX IF NOT EXISTS idx_memory_use_receipts_receipt_type
    ON memory_use_receipts(receipt_type);

CREATE INDEX IF NOT EXISTS idx_memory_use_receipts_decision_ref
    ON memory_use_receipts(decision_ref);

-- Legacy import audit trail. Legacy rows remain context-lane only until re-reviewed.
CREATE TABLE IF NOT EXISTS memory_import_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_table TEXT NOT NULL,
    source_row_id TEXT NOT NULL,
    import_method TEXT NOT NULL,
    import_batch_id TEXT,
    capsule_id UUID NOT NULL REFERENCES memory_capsules(capsule_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_import_receipts_capsule_id
    ON memory_import_receipts(capsule_id);

-- Canonical contradiction state; debate_records remains supporting analysis/history.
CREATE TABLE IF NOT EXISTS contradiction_records (
    contradiction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capsule_id_a UUID NOT NULL REFERENCES memory_capsules(capsule_id),
    capsule_id_b UUID NOT NULL REFERENCES memory_capsules(capsule_id),
    domain TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    resolution_required_by TIMESTAMPTZ,
    resolution_owner TEXT,
    resolution_receipt_id UUID REFERENCES memory_use_receipts(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contradiction_records_capsule_a
    ON contradiction_records(capsule_id_a);

CREATE INDEX IF NOT EXISTS idx_contradiction_records_capsule_b
    ON contradiction_records(capsule_id_b);

CREATE INDEX IF NOT EXISTS idx_contradiction_records_status
    ON contradiction_records(status);
