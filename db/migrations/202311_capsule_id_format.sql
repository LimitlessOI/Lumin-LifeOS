-- SYNOPSIS: Database migration — 202311_capsule_id_format.sql.
-- Ensure capsule_id defaults use UUID v4 via pgcrypto's gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Set default for memory_capsules.capsule_id to UUID v4
ALTER TABLE IF EXISTS memory_capsules
  ALTER COLUMN capsule_id SET DEFAULT gen_random_uuid();

-- Backfill any NULL capsule_id values
UPDATE memory_capsules
SET capsule_id = gen_random_uuid()
WHERE capsule_id IS NULL;

-- Ensure capsule_id remains unique for reliable identity semantics
CREATE UNIQUE INDEX IF NOT EXISTS memory_capsules_capsule_id_unique_idx
  ON memory_capsules (capsule_id);