-- SYNOPSIS: Database migration — 20260705_create_billing_projects.sql.
CREATE TABLE IF NOT EXISTS billing_projects (
  project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_projects_owner_id
  ON billing_projects (owner_id);

CREATE INDEX IF NOT EXISTS idx_billing_projects_created_at
  ON billing_projects (created_at);