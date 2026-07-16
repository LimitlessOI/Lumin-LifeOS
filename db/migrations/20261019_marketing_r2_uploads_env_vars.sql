-- SYNOPSIS: Database migration — 20261019_marketing_r2_uploads_env_vars.sql.
-- Migration for setting up environment variables for R2 bucket and Railway

CREATE TABLE IF NOT EXISTS marketing_r2_uploads_env_vars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT now(),
    r2_bucket_name TEXT NOT NULL,
    r2_access_key TEXT NOT NULL,
    r2_secret_key TEXT NOT NULL,
    railway_env TEXT NOT NULL
);

-- Required Environment Variables:
-- R2_BUCKET_NAME: Name of the R2 bucket for audio uploads
-- R2_ACCESS_KEY: Access key for the R2 bucket
-- R2_SECRET_KEY: Secret key for the R2 bucket
-- RAILWAY_ENV: Railway environment identifier
