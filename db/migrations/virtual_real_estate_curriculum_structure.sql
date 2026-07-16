-- db/migrations/virtual_real_estate_curriculum_structure.sql
-- SYNOPSIS: No-op migration — the original CREATE TABLE statements duplicate earlier migrations and are replaced with a safe no-op.

DO $$
BEGIN
  -- no-op: schema owned by earlier migrations
END $$;
