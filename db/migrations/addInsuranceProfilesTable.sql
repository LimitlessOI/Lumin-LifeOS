-- SYNOPSIS: Database migration — addInsuranceProfilesTable.sql.
CREATE TABLE IF NOT EXISTS insurance_profiles (
    id SERIAL PRIMARY KEY,
    member_id VARCHAR(255) NOT NULL,
    group_number VARCHAR(255),
    payer_name VARCHAR(255),
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);