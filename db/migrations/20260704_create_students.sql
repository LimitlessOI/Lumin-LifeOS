-- SYNOPSIS: Database migration — 20260704_create_students.sql.
-- LU-P1-001: Create students table to store student data.

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_owner_id ON students (owner_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON students (email);