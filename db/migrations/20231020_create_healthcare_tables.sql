```sql
CREATE TABLE patient_profiles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10),
    contact_info JSONB
);

CREATE TABLE biomarker_streams (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patient_profiles(id),
    biomarker_data JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE treatment_pathways (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patient_profiles(id),
    treatment_plan JSONB,
    effectiveness_score FLOAT
);

CREATE TABLE physician_collaborations (
    id SERIAL PRIMARY KEY,
    physician_id INT,
    patient_id INT REFERENCES patient_profiles(id),
    collaboration_notes TEXT
);

CREATE TABLE compliance_logs (
    id SERIAL PRIMARY KEY,
    log_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```