-- SYNOPSIS: Database migration — 20260813_collectible_twins_v1.sql.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- collectible_twins
CREATE TABLE IF NOT EXISTS collectible_twins (
    twin_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collectible_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_collectible_twins_collectible_name ON collectible_twins (collectible_name);

-- media_evidence
CREATE TABLE IF NOT EXISTS media_evidence (
    media_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    twin_id UUID NOT NULL,
    media_type VARCHAR(50) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    FOREIGN KEY (twin_id) REFERENCES collectible_twins(twin_id)
);
CREATE INDEX IF NOT EXISTS idx_media_evidence_twin_id ON media_evidence (twin_id);

-- price_evidence
CREATE TABLE IF NOT EXISTS price_evidence (
    price_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    twin_id UUID NOT NULL,
    price_cents INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    source TEXT,
    evidence_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    FOREIGN KEY (twin_id) REFERENCES collectible_twins(twin_id)
);
CREATE INDEX IF NOT EXISTS idx_price_evidence_twin_id ON price_evidence (twin_id);
CREATE INDEX IF NOT EXISTS idx_price_evidence_evidence_date ON price_evidence (evidence_date);

-- ownership_records
CREATE TABLE IF NOT EXISTS ownership_records (
    ownership_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    twin_id UUID NOT NULL,
    owner_id UUID NOT NULL, -- Represents the UUID of the owner (e.g., user, organization)
    ownership_start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ownership_end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    FOREIGN KEY (twin_id) REFERENCES collectible_twins(twin_id)
);
CREATE INDEX IF NOT EXISTS idx_ownership_records_twin_id ON ownership_records (twin_id);
CREATE INDEX IF NOT EXISTS idx_ownership_records_owner_id ON ownership_records (owner_id);

-- possession_records
CREATE TABLE IF NOT EXISTS possession_records (
    possession_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    twin_id UUID NOT NULL,
    possessor_id UUID NOT NULL, -- Represents the UUID of the possessor
    possession_start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    possession_end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    FOREIGN KEY (twin_id) REFERENCES collectible_twins(twin_id)
);
CREATE INDEX IF NOT EXISTS idx_possession_records_twin_id ON possession_records (twin_id);
CREATE INDEX IF NOT EXISTS idx_possession_records_possessor_id ON possession_records (possessor_id);

-- custody_records
CREATE TABLE IF NOT EXISTS custody_records (
    custody_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    twin_id UUID NOT NULL,
    custodian_id UUID NOT NULL, -- Represents the UUID of the custodian
    custody_start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    custody_end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    FOREIGN KEY (twin_id) REFERENCES collectible_twins(twin_id)
);
CREATE INDEX IF NOT EXISTS idx_custody_records_twin_id ON custody_records (twin_id);
CREATE INDEX IF NOT EXISTS idx_custody_records_custodian_id ON custody_records (custodian_id);

-- location_records
CREATE TABLE IF NOT EXISTS location_records (
    location_record_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    twin_id UUID NOT NULL,
    location_description TEXT NOT NULL,
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    FOREIGN KEY (twin_id) REFERENCES collectible_twins(twin_id)
);
CREATE INDEX IF NOT EXISTS idx_location_records_twin_id ON location_records (twin_id);
CREATE INDEX IF NOT EXISTS idx_location_records_recorded_at ON location_records (recorded_at);

-- liquidity_preferences
CREATE TABLE IF NOT EXISTS liquidity_preferences (
    preference_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    twin_id UUID NOT NULL,
    preferred_price_cents INTEGER,
    min_price_cents INTEGER,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    is_for_sale BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    FOREIGN KEY (twin_id) REFERENCES collectible_twins(twin_id)
);
CREATE INDEX IF NOT EXISTS idx_liquidity_preferences_twin_id ON liquidity_preferences (twin_id);

-- offers (stub)
CREATE TABLE IF NOT EXISTS offers (
    offer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    twin_id UUID NOT NULL,
    offered_price_cents INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    offeror_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL, -- e.g., 'pending', 'accepted', 'rejected'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    FOREIGN KEY (twin_id) REFERENCES collectible_twins(twin_id)
);
CREATE INDEX IF NOT EXISTS idx_offers_twin_id ON offers (twin_id);
CREATE INDEX IF NOT EXISTS idx_offers_offeror_id ON offers (offeror_id);

-- play_entitlement (stub)
CREATE TABLE IF NOT EXISTS play_entitlement (
    entitlement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    twin_id UUID NOT NULL,
    entitlement_type VARCHAR(255) NOT NULL,
    granted_to_id UUID NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    FOREIGN KEY (twin_id) REFERENCES collectible_twins(twin_id)
);
CREATE INDEX IF NOT EXISTS idx_play_entitlement_twin_id ON play_entitlement (twin_id);
CREATE INDEX IF NOT EXISTS idx_play_entitlement_granted_to_id ON play_entitlement (granted_to_id);

-- partners (stub)
CREATE TABLE IF NOT EXISTS partners (
    partner_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_name VARCHAR(255) NOT NULL,
    partner_type VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_partners_partner_name ON partners (partner_name);

-- audit_events
CREATE TABLE IF NOT EXISTS audit_events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL, -- The ID of the entity being audited (e.g., twin_id, ownership_id)
    entity_type VARCHAR(100) NOT NULL, -- The type of entity (e.g., 'collectible_twin', 'ownership_record')
    event_type VARCHAR(100) NOT NULL, -- e.g., 'create', 'update', 'delete', 'transfer'
    actor_id UUID, -- The ID of the user or system performing the action
    event_data JSONB, -- Stores details of the change
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity_id_type ON audit_events (entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events (created_at);