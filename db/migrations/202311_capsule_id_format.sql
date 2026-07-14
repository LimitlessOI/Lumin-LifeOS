-- SYNOPSIS: Database migration — 202311_capsule_id_format.sql.
ALTER TABLE capsules
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE capsules
  ALTER COLUMN id SET DATA TYPE uuid
  USING id::uuid;

CREATE EXTENSION IF NOT EXISTS pgcrypto;