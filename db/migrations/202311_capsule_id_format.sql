-- SYNOPSIS: Database migration — 202311_capsule_id_format.sql.
ALTER TABLE capsule
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE capsule
  ALTER COLUMN id TYPE uuid
  USING id::uuid;