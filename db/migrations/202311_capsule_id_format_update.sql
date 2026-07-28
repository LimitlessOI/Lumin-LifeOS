-- SYNOPSIS: Database migration — 202311_capsule_id_format_update.sql.
-- Migration to update Capsule ID to UUID v4 format
-- ALLOW_DESTRUCTIVE_MIGRATION: already applied 2026-07-16 (real, historical
-- run against the since-removed `capsules` table — superseded by
-- `memory_capsules`; `capsules` no longer exists in the schema at all).
-- Banner added retroactively to satisfy the migration-idempotency static
-- check honestly (a real UPDATE-without-WHERE, not a false positive) —
-- this file will never run again (already recorded in schema_migrations).

-- Ensure the 'uuid-ossp' extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Alter the 'capsules' table to change the 'id' column to UUID v4
ALTER TABLE IF EXISTS capsules
ALTER COLUMN id SET DATA TYPE UUID USING (uuid_generate_v4());

-- Update existing entries with new UUIDs
UPDATE capsules SET id = uuid_generate_v4();
