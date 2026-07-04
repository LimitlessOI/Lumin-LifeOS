-- SYNOPSIS: Database migration — 20260704_create_conductor_session_savings.sql.
-- TAO-P1-005: conductor_session_savings
CREATE TABLE IF NOT EXISTS conductor_session_savings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE INDEX IF NOT EXISTS idx_conductor_session_savings_id
  ON conductor_session_savings (id);