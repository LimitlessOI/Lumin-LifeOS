-- SYNOPSIS: Database migration — 20260704_create_children_table.sql.
-- KOS-P1-001: children table for Kids OS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  birthdate TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_children_name ON children (name);
CREATE INDEX IF NOT EXISTS idx_children_birthdate ON children (birthdate);