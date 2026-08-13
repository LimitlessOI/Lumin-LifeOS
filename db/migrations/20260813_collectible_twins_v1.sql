-- SYNOPSIS: Collectibles V1 Vault schema — collectible_twins + evidence + stubs
-- @ssot docs/products/collectibles/PRODUCT_HOME.md
-- Source: docs/products/collectibles/SCHEMA_CONTRACTS.md (V1)

CREATE TABLE IF NOT EXISTS collectible_twins (
  id UUID PRIMARY KEY,
  owner_user_id UUID NOT NULL,
  household_id UUID,
  category_id TEXT NOT NULL,
  adapter_id TEXT NOT NULL,
  representation_level INT NOT NULL CHECK (representation_level BETWEEN 1 AND 4),
  identity_status TEXT NOT NULL CHECK (identity_status IN (
    'unregistered', 'owned_unverified', 'owned_canonical',
    'owned_physical_scan', 'owned_condition_verified', 'reverification'
  )),
  needs_review BOOLEAN NOT NULL DEFAULT FALSE,
  needs_review_reasons JSONB,
  display_name TEXT NOT NULL,
  canonical_ref JSONB,
  condition_estimate TEXT,
  condition_confidence NUMERIC,
  defects JSONB,
  sentimental_tags JSONB,
  utility_tags JSONB,
  acquisition JSONB,
  guest_claim_token_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_collectible_twins_owner_deleted
  ON collectible_twins (owner_user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_collectible_twins_household
  ON collectible_twins (household_id);
CREATE INDEX IF NOT EXISTS idx_collectible_twins_category_review
  ON collectible_twins (category_id, needs_review);
CREATE INDEX IF NOT EXISTS idx_collectible_twins_owner_identity
  ON collectible_twins (owner_user_id, identity_status);

CREATE TABLE IF NOT EXISTS category_adapters (
  adapter_id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  version TEXT NOT NULL,
  capabilities JSONB NOT NULL,
  certification_status TEXT NOT NULL DEFAULT 'draft',
  ip_permission_required BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_evidence (
  id UUID PRIMARY KEY,
  twin_id UUID NOT NULL REFERENCES collectible_twins(id),
  kind TEXT NOT NULL,
  storage_backend TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INT NOT NULL,
  sha256 TEXT NOT NULL,
  width INT,
  height INT,
  capture_provenance JSONB NOT NULL,
  is_hero_candidate BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_media_evidence_twin_kind ON media_evidence (twin_id, kind);
CREATE INDEX IF NOT EXISTS idx_media_evidence_sha256 ON media_evidence (sha256);

CREATE TABLE IF NOT EXISTS price_evidence (
  id UUID PRIMARY KEY,
  twin_id UUID NOT NULL REFERENCES collectible_twins(id),
  currency TEXT NOT NULL DEFAULT 'USD',
  market_min_cents INT,
  market_max_cents INT,
  confidence NUMERIC NOT NULL,
  freshness_at TIMESTAMPTZ NOT NULL,
  sources JSONB NOT NULL,
  liquidity_value_cents INT,
  quick_sale_value_cents INT,
  expected_net_cents INT,
  completeness_effect JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_evidence_twin_active ON price_evidence (twin_id, is_active);

CREATE TABLE IF NOT EXISTS ownership_records (
  id UUID PRIMARY KEY,
  twin_id UUID NOT NULL REFERENCES collectible_twins(id),
  owner_user_id UUID NOT NULL,
  ownership_type TEXT NOT NULL,
  fraction_bps INT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  transfer_reason TEXT,
  evidence_ref JSONB
);

CREATE INDEX IF NOT EXISTS idx_ownership_records_twin ON ownership_records (twin_id, ended_at);

CREATE TABLE IF NOT EXISTS possession_records (
  id UUID PRIMARY KEY,
  twin_id UUID NOT NULL REFERENCES collectible_twins(id),
  possessor_type TEXT NOT NULL,
  possessor_id UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  note TEXT
);

CREATE TABLE IF NOT EXISTS custody_records (
  id UUID PRIMARY KEY,
  twin_id UUID NOT NULL REFERENCES collectible_twins(id),
  custodian_partner_id UUID,
  custody_state TEXT NOT NULL,
  contract_ref TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  verification_evidence JSONB
);

CREATE TABLE IF NOT EXISTS location_records (
  id UUID PRIMARY KEY,
  twin_id UUID NOT NULL REFERENCES collectible_twins(id),
  location_kind TEXT NOT NULL,
  label TEXT NOT NULL,
  structured JSONB,
  geo_precision TEXT NOT NULL DEFAULT 'none',
  geo JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_location_records_twin ON location_records (twin_id, ended_at);

CREATE TABLE IF NOT EXISTS liquidity_preferences (
  twin_id UUID PRIMARY KEY REFERENCES collectible_twins(id),
  posture TEXT NOT NULL CHECK (posture IN (
    'never_sell', 'surprise_me', 'open_to_offers', 'private_threshold', 'actively_selling'
  )),
  private_threshold_cents INT,
  currency TEXT NOT NULL DEFAULT 'USD',
  allow_invisible_listing BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY,
  twin_id UUID NOT NULL REFERENCES collectible_twins(id),
  buyer_user_id UUID NOT NULL,
  seller_user_id UUID NOT NULL,
  amount_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  state TEXT NOT NULL,
  quality_score NUMERIC,
  message TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offers_seller_state ON offers (seller_user_id, state);
CREATE INDEX IF NOT EXISTS idx_offers_buyer_state ON offers (buyer_user_id, state);
CREATE INDEX IF NOT EXISTS idx_offers_twin_state ON offers (twin_id, state);

CREATE TABLE IF NOT EXISTS play_entitlements (
  id UUID PRIMARY KEY,
  twin_id UUID NOT NULL REFERENCES collectible_twins(id),
  owner_user_id UUID NOT NULL,
  entitlement_status TEXT NOT NULL DEFAULT 'stub',
  notes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY,
  display_name TEXT NOT NULL,
  legal_name TEXT,
  home_city TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_capabilities (
  id UUID PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES partners(id),
  capability TEXT NOT NULL,
  jurisdictions JSONB NOT NULL DEFAULT '[]'::jsonb,
  revenue_share_bps INT,
  status TEXT NOT NULL DEFAULT 'gated'
);

CREATE TABLE IF NOT EXISTS collectible_audit_events (
  id UUID PRIMARY KEY,
  twin_id UUID,
  actor_user_id UUID,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collectible_audit_twin ON collectible_audit_events (twin_id, created_at);
