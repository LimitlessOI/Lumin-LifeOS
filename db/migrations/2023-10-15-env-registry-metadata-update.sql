-- SYNOPSIS: Database migration — 2023-10-15-env-registry-metadata-update.sql.
ALTER TABLE IF EXISTS ENV_REGISTRY
ADD COLUMN IF NOT EXISTS rotation_metadata JSONB,
ADD COLUMN IF NOT EXISTS crypto_tier VARCHAR(255);