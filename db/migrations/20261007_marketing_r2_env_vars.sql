-- SYNOPSIS: Database migration — 20261007_marketing_r2_env_vars.sql.
-- Migration script to manage environment variables for Cloudflare R2 and Railway

BEGIN;

-- Create a table to store environment variables if it doesn't exist
CREATE TABLE IF NOT EXISTS env_vars (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(255) NOT NULL,
    var_name VARCHAR(255) NOT NULL,
    var_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert example records for Cloudflare R2
INSERT INTO env_vars (service_name, var_name, var_value) VALUES
('Cloudflare R2', 'CLOUDFLARE_ACCOUNT_ID', 'example_account_id'),
('Cloudflare R2', 'CLOUDFLARE_ACCESS_KEY', 'example_access_key'),
('Cloudflare R2', 'CLOUDFLARE_SECRET_KEY', 'example_secret_key');

-- Insert example records for Railway
INSERT INTO env_vars (service_name, var_name, var_value) VALUES
('Railway', 'RAILWAY_PROJECT_ID', 'example_project_id'),
('Railway', 'RAILWAY_API_KEY', 'example_api_key');

COMMIT;
