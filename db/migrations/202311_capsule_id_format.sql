-- SYNOPSIS: Database migration — 202311_capsule_id_format.sql.
ALTER TABLE capsules
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

UPDATE capsules
SET id = id
WHERE id IS NOT NULL;

ALTER TABLE capsules
  ALTER COLUMN id SET NOT NULL;