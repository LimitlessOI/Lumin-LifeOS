-- SYNOPSIS: MarketingOS Phase 2 schema migration for content atoms, brand voice profiles, and calendar slots
-- @ssot docs/products/marketingos/PRODUCT_HOME.md

CREATE TABLE IF NOT EXISTS marketing_content_atoms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id TEXT NOT NULL,
    session_id UUID REFERENCES marketing_sessions(id),
    source_extraction_id UUID REFERENCES marketing_content_extractions(id),
    atom_type TEXT NOT NULL CHECK (atom_type IN ('hook', 'story', 'insight', 'cta')),
    text TEXT NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    reuse_consent_level TEXT NOT NULL DEFAULT 'session_only' CHECK (reuse_consent_level IN ('session_only', '90d', 'perpetual')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS marketing_content_atoms_owner_id_idx
    ON marketing_content_atoms (owner_id);

CREATE TABLE IF NOT EXISTS marketing_brand_voice_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id TEXT NOT NULL UNIQUE,
    profile_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_session_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_calendar_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id TEXT NOT NULL,
    content_piece_id UUID REFERENCES marketing_content_pieces(id),
    scheduled_date DATE NOT NULL,
    platform TEXT,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'approved', 'used')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS marketing_calendar_slots_owner_id_scheduled_date_idx
    ON marketing_calendar_slots (owner_id, scheduled_date);