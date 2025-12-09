```sql
CREATE TABLE health_profiles (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    profile_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wearable_data (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    timestamp TIMESTAMP NOT NULL
);

CREATE TABLE medical_records (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    record_data JSONB NOT NULL,
    encrypted_field BYTEA NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE federated_updates (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    update_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE provider_access (
    id SERIAL PRIMARY KEY,
    provider_id VARCHAR(255) NOT NULL,
    patient_id VARCHAR(255) NOT NULL,
    access_level VARCHAR(50) NOT NULL,
    audit_trail JSONB,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```