CREATE TABLE consent_records (
    id SERIAL PRIMARY KEY,
    identity_id INT REFERENCES identity_profiles(id),
    consent_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);