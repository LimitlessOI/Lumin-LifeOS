-- SYNOPSIS: Database migration — 003_add_search_provider_config.sql.
CREATE TABLE IF NOT EXISTS search_provider_config (
    id SERIAL PRIMARY KEY,
    provider_name VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) NOT NULL,
    endpoint_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_name ON search_provider_config (provider_name);