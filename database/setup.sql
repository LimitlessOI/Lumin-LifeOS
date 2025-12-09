-- Create table for neuro_patients
CREATE TABLE neuro_patients (
    patient_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    dob DATE NOT NULL,
    gender VARCHAR(10),
    contact_info JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for neuro_sessions
CREATE TABLE neuro_sessions (
    session_id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL,
    session_date TIMESTAMP NOT NULL,
    session_data JSONB,
    FOREIGN KEY (patient_id) REFERENCES neuro_patients(patient_id) ON DELETE CASCADE
);

-- Create table for neuro_predictive_triggers
CREATE TABLE neuro_predictive_triggers (
    trigger_id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL,
    trigger_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES neuro_patients(patient_id) ON DELETE CASCADE
);

-- Create table for neuro_blockchain_records
CREATE TABLE neuro_blockchain_records (
    record_id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL,
    transaction_hash VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES neuro_patients(patient_id) ON DELETE CASCADE
);

-- Create table for neuro_wearable_data
CREATE TABLE neuro_wearable_data (
    data_id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL,
    wearable_type VARCHAR(50),
    data JSONB,
    recorded_at TIMESTAMP NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES neuro_patients(patient_id) ON DELETE CASCADE
);

-- Indexes for optimization
CREATE INDEX idx_sessions_patient_id ON neuro_sessions(patient_id);
CREATE INDEX idx_triggers_patient_id ON neuro_predictive_triggers(patient_id);
CREATE INDEX idx_blockchain_patient_id ON neuro_blockchain_records(patient_id);
CREATE INDEX idx_wearable_patient_id ON neuro_wearable_data(patient_id);