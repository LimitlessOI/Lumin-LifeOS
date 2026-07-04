-- SYNOPSIS: Database migration — 20260704_create_replacement_plans.sql.
-- LOS-P1-002: replacement_plans table
CREATE TABLE IF NOT EXISTS replacement_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_tools JSONB NOT NULL,
  business_goals JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_replacement_plans_created_at
  ON replacement_plans (created_at);