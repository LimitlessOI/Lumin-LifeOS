-- SYNOPSIS: Database migration — 003_add_search_provider_config.sql.
CREATE TABLE IF NOT EXISTS search_provider_configs (
    id SERIAL PRIMARY KEY,
    provider_name VARCHAR(255) UNIQUE NOT NULL,
    api_key_secret_name VARCHAR(255) NOT NULL,
    api_endpoint VARCHAR(255),
    config_json JSONB
);

-- Add a default provider if it doesn't exist
INSERT INTO search_provider_configs (provider_name, api_key_secret_name, api_endpoint, config_json)
VALUES ('default_provider', 'SEARCH_API_KEY', 'https://api.example.com/search', '{}')
ON CONFLICT (provider_name) DO NOTHING;