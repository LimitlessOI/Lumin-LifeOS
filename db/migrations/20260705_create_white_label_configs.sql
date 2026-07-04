-- SYNOPSIS: Database migration — 20260705_create_white_label_configs.sql.
-- WL-P1-001: White-label partner configurations
CREATE TABLE IF NOT EXISTS white_label_configs (
  client_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL,
  hide_tiers BOOLEAN NOT NULL,
  hide_models BOOLEAN NOT NULL,
  hide_costs BOOLEAN NOT NULL,
  hide_architecture BOOLEAN NOT NULL,
  custom_domain TEXT NOT NULL,
  custom_logo TEXT NOT NULL,
  api_response_format TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_white_label_configs_brand_name
  ON white_label_configs (brand_name);