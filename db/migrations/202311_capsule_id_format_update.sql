-- SYNOPSIS: Database migration — 202311_capsule_id_format_update.sql.
ALTER TABLE capsules
ALTER COLUMN capsule_id SET DATA TYPE UUID USING capsule_id::UUID;