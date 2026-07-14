-- SYNOPSIS: Database migration — 202311_capsule_id_format.sql.
ALTER TABLE capsules
  ALTER COLUMN id TYPE uuid USING id::uuid,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();