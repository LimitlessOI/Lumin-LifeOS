-- SYNOPSIS: Database migration — 202311_capsule_id_format.sql.
ALTER TABLE capsules
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

UPDATE capsules
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE capsules
  ALTER COLUMN id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'capsules_id_uuid_v4_check'
  ) THEN
    ALTER TABLE capsules
      ADD CONSTRAINT capsules_id_uuid_v4_check
      CHECK (id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$');
  END IF;
END $$;