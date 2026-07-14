-- SYNOPSIS: Database migration — 202311_capsule_id_format.sql.
ALTER TABLE capsule
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

UPDATE capsule
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE capsule
  ALTER COLUMN id SET NOT NULL;