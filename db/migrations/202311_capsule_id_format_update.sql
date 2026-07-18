-- SYNOPSIS: Database migration — 202311_capsule_id_format_update.sql.
-- Migration to update Capsule ID to UUID v4 format

-- Ensure the 'uuid-ossp' extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Alter the 'capsules' table to change the 'id' column to UUID v4
ALTER TABLE IF EXISTS capsules
ALTER COLUMN id SET DATA TYPE UUID USING (uuid_generate_v4());

-- Update existing entries with new UUIDs
UPDATE capsules SET id = uuid_generate_v4();
