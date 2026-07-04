-- SYNOPSIS: Database migration — 20260705_create_fixed_obligations_table.sql.
-- PFO-P1-002: fixed obligations table
CREATE TABLE IF NOT EXISTS fixed_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fixed_obligations_owner_id
  ON fixed_obligations (owner_id);

CREATE INDEX IF NOT EXISTS idx_fixed_obligations_due_date
  ON fixed_obligations (due_date);