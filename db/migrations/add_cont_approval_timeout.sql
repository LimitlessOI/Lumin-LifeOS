-- SYNOPSIS: Repair no-op migration stub. Canonical schema may live in an earlier migration.
-- ALTER SYSTEM SET approval_timeout = INTERVAL '48 hours'
CREATE TABLE IF NOT EXISTS add_cont_approval_timeout (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
