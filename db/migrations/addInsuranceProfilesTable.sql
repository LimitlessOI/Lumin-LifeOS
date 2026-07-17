-- SYNOPSIS: Database migration — addInsuranceProfilesTable.sql.
-- Create insurance_profiles table
CREATE TABLE IF NOT EXISTS insurance_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_id VARCHAR(255) NOT NULL,
    group_number VARCHAR(255),
    payer_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
