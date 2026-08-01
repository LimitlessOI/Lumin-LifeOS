-- SYNOPSIS: Database migration — 20260802_create_partner_configurations.sql.
CREATE TABLE IF NOT EXISTS partner_configurations (
  client_id UUID PRIMARY KEY,
  owner_id UUID NOT NULL,
  brand_name TEXT NOT NULL,
  custom_domain TEXT,
  custom_logo TEXT,
  api_response_format TEXT,
  hide_tiers BOOLEAN DEFAULT false,
  hide_models BOOLEAN DEFAULT false,
  hide_costs BOOLEAN DEFAULT false,
  hide_architecture BOOLEAN DEFAULT false,
  ai_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_configurations_owner_id ON partner_configurations(owner_id);
