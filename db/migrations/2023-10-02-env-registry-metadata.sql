-- SYNOPSIS: Database migration — 2023-10-02-env-registry-metadata.sql.
CREATE TABLE IF NOT EXISTS env_registry (
    id SERIAL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS env_registry_metadata (
    id SERIAL PRIMARY KEY,
    env_registry_id INTEGER NOT NULL,
    crypto_tier_label VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (env_registry_id) REFERENCES env_registry(id)
);

ALTER TABLE IF EXISTS env_registry_metadata
ADD COLUMN IF NOT EXISTS crypto_tier_label VARCHAR(255);