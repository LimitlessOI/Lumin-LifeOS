```sql
-- Table for storing patient information
CREATE TABLE healthcare_patients (
    patient_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    birth_date DATE NOT NULL,
    gender VARCHAR(10),
    contact_info JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing treatment plans
CREATE TABLE treatment_plans (
    plan_id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES healthcare_patients(patient_id),
    plan_details JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing health metrics from wearables and EHRs
CREATE TABLE health_metrics (
    metric_id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES healthcare_patients(patient_id),
    metric_type VARCHAR(255) NOT NULL,
    metric_value JSONB,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for managing federated learning models
CREATE TABLE federated_models (
    model_id SERIAL PRIMARY KEY,
    model_version VARCHAR(50),
    model_data BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);