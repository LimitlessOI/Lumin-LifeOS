-- SYNOPSIS: Database migration — addInsuranceProfilesTable.sql.
CREATE TABLE IF NOT EXISTS insurance_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_id VARCHAR(255) NOT NULL,
    group_number VARCHAR(255),
    payer_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_insurance_profiles_user_id ON insurance_profiles(user_id);