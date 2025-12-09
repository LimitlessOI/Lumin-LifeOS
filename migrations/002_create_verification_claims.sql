CREATE TABLE verification_claims (
    id SERIAL PRIMARY KEY,
    identity_id INT REFERENCES identity_profiles(id),
    claim_data JSONB NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);