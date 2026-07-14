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
      CHECK (uuid_version(id) = 4);
  END IF;
END $$;