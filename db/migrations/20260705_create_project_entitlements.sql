-- SYNOPSIS: Database migration — 20260705_create_project_entitlements.sql.
CREATE TABLE IF NOT EXISTS project_entitlements (
  entitlement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  entitlement_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_entitlements_project_id
  ON project_entitlements (project_id);

CREATE INDEX IF NOT EXISTS idx_project_entitlements_entitlement_type
  ON project_entitlements (entitlement_type);