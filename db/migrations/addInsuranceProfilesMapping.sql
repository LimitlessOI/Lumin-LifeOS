-- SYNOPSIS: Database migration — addInsuranceProfilesMapping.sql.
CREATE TABLE IF NOT EXISTS insurance_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
    insurance_provider_name VARCHAR(255) NOT NULL,
    policy_number VARCHAR(255),
    group_number VARCHAR(255),
    member_id VARCHAR(255),
    plan_type VARCHAR(255),
    start_date DATE,
    end_date DATE,
    is_primary_insurance BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_insurance_profiles_user_id ON insurance_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_profiles_policy_number ON insurance_profiles (policy_number);

-- This table stores insurance profiles for users, including payer names, policy numbers, group numbers, and member IDs.
-- It allows for multiple insurance profiles per user.
-- The mapping of specific form fields to these columns would be handled at the application level.
