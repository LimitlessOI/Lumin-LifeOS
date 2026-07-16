-- SYNOPSIS: Database migration — virtual_real_estate_curriculum_structure.sql.
-- db/migrations/virtual_real_estate_curriculum_structure.sql
-- This file is intentionally a no-op. The original CREATE TABLE statements duplicate
-- the schema already owned by earlier migrations (e.g. 002_create_students_table.sql)
-- and were missing `IF NOT EXISTS`, causing migration preflight failures on boot.
DO $$
BEGIN
  -- no-op
END $$;
