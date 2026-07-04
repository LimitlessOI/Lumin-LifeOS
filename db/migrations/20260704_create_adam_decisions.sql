-- SYNOPSIS: Database migration — 20260704_create_adam_decisions.sql.
CREATE TABLE IF NOT EXISTS adam_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision TEXT NOT NULL
);