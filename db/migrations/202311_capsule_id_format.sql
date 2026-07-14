-- SYNOPSIS: Database migration — 202311_capsule_id_format.sql.
-- Ensure capsule IDs use UUID v4 by default
-- This migration is intended to run safely on existing schemas.
-- It assumes PostgreSQL and gen_random_uuid() availability.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  tbl regclass;
BEGIN
  IF to_regclass('public.capsules') IS NOT NULL THEN
    tbl := 'public.capsules'::regclass;

    -- Set default to UUID v4
    EXECUTE format(
      'ALTER TABLE %s ALTER COLUMN id SET DEFAULT gen_random_uuid()',
      tbl
    );

    -- If the column is not already uuid, convert it
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'capsules'
        AND column_name = 'id'
        AND data_type <> 'uuid'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %s ALTER COLUMN id TYPE uuid USING id::uuid',
        tbl
      );
    END IF;
  END IF;
END
$$;