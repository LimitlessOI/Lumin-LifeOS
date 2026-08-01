-- SYNOPSIS: Repair no-op migration stub. Canonical schema may live in an earlier migration.
-- ALTER TABLE tasks ADD COLUMN income_priority
CREATE TABLE IF NOT EXISTS add_income_priority_to_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
