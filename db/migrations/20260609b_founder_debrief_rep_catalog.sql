-- SYNOPSIS: Database migration — 20260609b_founder_debrief_rep_catalog.sql.
-- Founder debrief persistence + REP catalog registry
-- @ssot docs/products/builderos/PRODUCT_HOME.md

CREATE TABLE IF NOT EXISTS founder_debriefs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      TEXT UNIQUE NOT NULL,
    layer1_synopsis TEXT NOT NULL,
    layer2_full     TEXT,
    metadata_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_founder_debriefs_created
    ON founder_debriefs (created_at DESC);

CREATE TABLE IF NOT EXISTS rep_catalog_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rep_name        TEXT UNIQUE NOT NULL,
    description     TEXT,
    receipt_ref     TEXT,
    active          BOOLEAN NOT NULL DEFAULT true,
    metadata_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
