```sql
CREATE TABLE therapy_sessions (
    id SERIAL PRIMARY KEY,
    patient_id INT,
    protocol_id INT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(50)
);

CREATE TABLE therapy_protocols (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    duration INT
);

CREATE TABLE biometric_streams (
    id SERIAL PRIMARY KEY,
    session_id INT,
    timestamp TIMESTAMP,
    heart_rate INT,
    brain_activity FLOAT
);

CREATE TABLE clinician_oversight (
    id SERIAL PRIMARY KEY,
    clinician_id INT,
    session_id INT,
    notes TEXT
);

CREATE TABLE xr_environments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    config JSONB
);
```