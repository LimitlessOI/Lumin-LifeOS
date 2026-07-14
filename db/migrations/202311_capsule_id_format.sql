-- SYNOPSIS: Database migration — 202311_capsule_id_format.sql.
ALTER TABLE capsules
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'capsules'
      AND column_name = 'id'
      AND data_type = 'uuid'
  ) THEN
    -- no-op: keep UUID type, default updated above
    NULL;
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;