-- SYNOPSIS: Database migration — 20260705_create_agreements_table.sql.
-- Conflict Arbitrator: agreements table for post-mediation user agreements
CREATE TABLE IF NOT EXISTS agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agreement TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agreements_user_id ON agreements (user_id);