-- SYNOPSIS: Database migration — 20261015_marketing_r2_bucket_env.sql.
-- db/migrations/20261015_marketing_r2_bucket_env.sql

-- Migration to set environment variables for Cloudflare R2 bucket and Railway

-- Create the env_config table if it does not exist
CREATE TABLE IF NOT EXISTS env_config (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT NOT NULL
);

-- Insert environment variables into the env_config table
INSERT INTO env_config (key, value) VALUES
('CLOUDFLARE_R2_BUCKET_NAME', 'your-bucket-name'),
('CLOUDFLARE_R2_ACCESS_KEY_ID', 'your-access-key-id'),
('CLOUDFLARE_R2_SECRET_ACCESS_KEY', 'your-secret-access-key'),
('RAILWAY_ENV_VAR_1', 'value1'),
('RAILWAY_ENV_VAR_2', 'value2');

-- Ensure to replace 'your-bucket-name', 'your-access-key-id', 'your-secret-access-key', 
-- and other placeholder values with actual data.

-- Validate if the insertion was successful
SELECT * FROM env_config WHERE key LIKE 'CLOUDFLARE%' OR key LIKE 'RAILWAY%';
