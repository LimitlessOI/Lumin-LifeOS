-- SYNOPSIS: Database migration — 202311_capsule_id_format.sql.
ALTER TABLE IF EXISTS capsules
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'capsules'
      AND column_name = 'id'
      AND udt_name = 'uuid'
  ) THEN
    ALTER TABLE capsules
      ALTER COLUMN id SET DATA TYPE uuid
      USING id::uuid;
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;