-- SYNOPSIS: Database migration — 202311_capsule_id_format.sql.
ALTER TABLE capsules
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE capsules
  ALTER COLUMN id SET DATA TYPE uuid
  USING id::uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'capsules_id_check'
  ) THEN
    ALTER TABLE capsules
      ADD CONSTRAINT capsules_id_check
      CHECK (id IS NOT NULL);
  END IF;
END $$;