-- SYNOPSIS: Database migration — 003_create_credential_verification.sql.
CREATE TABLE IF NOT EXISTS credential_verification_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id UUID NOT NULL,
    provider TEXT NOT NULL,
    verification_status TEXT NOT NULL,
    verification_details JSONB,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credential_verification_results_credential_id ON credential_verification_results (credential_id);
CREATE INDEX IF NOT EXISTS idx_credential_verification_results_provider ON credential_verification_results (provider);