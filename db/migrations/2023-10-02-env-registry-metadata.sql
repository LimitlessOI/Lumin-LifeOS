-- SYNOPSIS: Database migration — 2023-10-02-env-registry-metadata.sql.
ALTER TABLE env_registry
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}' NOT NULL;

CREATE TABLE IF NOT EXISTS env_registry_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    env_registry_id UUID NOT NULL REFERENCES env_registry(id) ON DELETE CASCADE,
    metadata_key VARCHAR(255) NOT NULL,
    metadata_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(env_registry_id, metadata_key)
);

CREATE INDEX IF NOT EXISTS idx_env_registry_metadata_env_registry_id ON env_registry_metadata(env_registry_id);

-- Add rotation metadata to env_registry.metadata
-- Example:
-- UPDATE env_registry
-- SET metadata = jsonb_set(metadata, '{rotation}', '{"enabled": true, "interval_days": 90, "crypto_tier": "FIPS_140_2_LEVEL_3"}'::jsonb, true)
-- WHERE id = 'your_env_registry_id';

-- Add crypto tier labels to metadata section
-- This is handled by allowing 'crypto_tier' within the rotation metadata or as a separate key.
-- Example for crypto_tier within rotation:
-- UPDATE env_registry
-- SET metadata = jsonb_set(metadata, '{rotation,crypto_tier}', '"FIPS_140_2_LEVEL_3"'::jsonb, true)
-- WHERE id = 'your_env_registry_id';
-- Example for crypto_tier as a separate top-level key:
-- UPDATE env_registry
-- SET metadata = jsonb_set(metadata, '{crypto_tier}', '"FIPS_140_2_LEVEL_3"'::jsonb, true)
-- WHERE id = 'your_env_registry_id';