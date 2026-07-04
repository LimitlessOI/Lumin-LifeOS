-- SYNOPSIS: Database migration — 20260705_create_commitments_table.sql.
-- Word Keeper WK-P1-001
-- Create commitments table to store user commitments.

CREATE TABLE IF NOT EXISTS commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  commitment_text TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  integrity_score_impact INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_commitments_user_id ON commitments (user_id);
CREATE INDEX IF NOT EXISTS idx_commitments_due_date ON commitments (due_date);
CREATE INDEX IF NOT EXISTS idx_commitments_status ON commitments (status);