-- SYNOPSIS: Database migration — 20260705_lifeos_users.sql.
CREATE TABLE IF NOT EXISTS lifeos_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT UNIQUE NOT NULL,
  name TEXT
);

CREATE INDEX IF NOT EXISTS idx_lifeos_users_owner_id
  ON lifeos_users (owner_id);

CREATE INDEX IF NOT EXISTS idx_lifeos_users_created_at
  ON lifeos_users (created_at);