-- SYNOPSIS: Database migration — 202311_capsule_id_format.sql.
ALTER TABLE capsules
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'capsules_id_uuid_v4_check'
  ) THEN
    ALTER TABLE capsules
      ADD CONSTRAINT capsules_id_uuid_v4_check
      CHECK (
        id IS NULL
        OR id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      ) NOT VALID;
  END IF;
END $$;