```sql
CREATE TABLE health_metrics (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL,
    metric_type VARCHAR(50),
    value FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE predictive_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE health_alerts (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL,
    alert_type VARCHAR(50),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clinician_access (
    id SERIAL PRIMARY KEY,
    clinician_id INT NOT NULL,
    patient_id INT NOT NULL,
    access_level VARCHAR(50),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```