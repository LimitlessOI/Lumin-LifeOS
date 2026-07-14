-- SYNOPSIS: Database migration — 202311_capsule_id_format.sql.
ALTER TABLE IF EXISTS capsules
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

UPDATE capsules
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE IF EXISTS capsules
  ALTER COLUMN id SET NOT NULL;