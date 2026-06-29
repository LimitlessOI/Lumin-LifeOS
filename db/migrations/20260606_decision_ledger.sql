-- SYNOPSIS: Database migration — 20260606_decision_ledger.sql.
-- GAP-002 / GAP-017 — Unified founder decision ledger (Phase 1 schema)
-- @ssot docs/products/builderos/PRODUCT_HOME.md §4.4

CREATE TABLE IF NOT EXISTS founder_decision_ledger (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id         TEXT UNIQUE NOT NULL,
    mission_id          UUID REFERENCES missions(id) ON DELETE SET NULL,
    actor               TEXT NOT NULL,
    decision_type       TEXT NOT NULL,
    authority_source    TEXT,
    options_considered  JSONB NOT NULL DEFAULT '[]'::jsonb,
    chosen_option       TEXT,
    reason              TEXT,
    evidence_links      JSONB NOT NULL DEFAULT '[]'::jsonb,
    reversibility       TEXT NOT NULL DEFAULT 'unknown',
    metadata_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_founder_decision_ledger_mission
    ON founder_decision_ledger (mission_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_founder_decision_ledger_type
    ON founder_decision_ledger (decision_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_founder_decision_ledger_actor
    ON founder_decision_ledger (actor, created_at DESC);
