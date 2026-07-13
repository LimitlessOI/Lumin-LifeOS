-- SYNOPSIS: Database migration — 20231010_create_boldtrail_contacts_table.sql.
CREATE TABLE IF NOT EXISTS boldtrail_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text,
  phone text,
  company text,
  tags text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);