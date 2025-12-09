CREATE TABLE health_risk_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    risk_factors JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE genomic_data (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE federated_models (
    id SERIAL PRIMARY KEY,
    model_data BYTEA NOT NULL,
    version INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE intervention_pathways (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    intervention_details JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blockchain_consent (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    consent_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE health_risk_profiles ADD COLUMN encrypted_data BYTEA;
ALTER TABLE genomic_data ADD COLUMN encrypted_data BYTEA;
-- Add audit logging triggers and functions as needed
--