-- SYNOPSIS: Database migration — 20231020_create_vapi_integration.sql.
CREATE TABLE IF NOT EXISTS vapi_integration (
    id SERIAL PRIMARY KEY,
    api_key VARCHAR(255) NOT NULL,
    endpoint_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vapi_integration_api_key ON vapi_integration(api_key);