-- SYNOPSIS: Database migration — 20260704_create_prospect_sites.sql.
CREATE TABLE IF NOT EXISTS prospect_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospect_sites_site_name ON prospect_sites (site_name);