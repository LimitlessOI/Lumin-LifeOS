-- SYNOPSIS: Database migration — 20260705_create_users_table.sql.
-- Create users table for consent and emotional state data
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent BOOLEAN NOT NULL DEFAULT false,
  emotional_state TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_consent ON users (consent);
CREATE INDEX IF NOT EXISTS idx_users_emotional_state ON users (emotional_state);