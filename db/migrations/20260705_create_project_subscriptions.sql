-- SYNOPSIS: Database migration — 20260705_create_project_subscriptions.sql.
-- Create project_subscriptions table for project-level subscription details
CREATE TABLE IF NOT EXISTS project_subscriptions (
  subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL
);

-- Index for project-based subscription lookups
CREATE INDEX IF NOT EXISTS idx_project_subscriptions_project_id
  ON project_subscriptions (project_id);

-- Index for subscription status filtering
CREATE INDEX IF NOT EXISTS idx_project_subscriptions_status
  ON project_subscriptions (status);