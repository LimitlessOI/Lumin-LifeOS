```sql
CREATE TABLE health_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(255),
    date_of_birth DATE,
    gender VARCHAR(50),
    contact_info JSONB,
    medical_history JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE biometric_streams (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    device_id VARCHAR(255),
    timestamp TIMESTAMP NOT NULL,
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE health_interventions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    intervention_type VARCHAR(255),
    description TEXT,
    status VARCHAR(50),
    scheduled_date TIMESTAMP,
    result JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clinician_validations (
    id SERIAL PRIMARY KEY,
    clinician_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    validation_type VARCHAR(255),
    notes TEXT,
    validation_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE nudging_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    nudge_type VARCHAR(255),
    message TEXT,
    status VARCHAR(50),
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```