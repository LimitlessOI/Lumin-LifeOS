```sql
CREATE TABLE organ_modules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vascular_patterns (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL,
    scan_data BYTEA NOT NULL,
    generated_pattern BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES organ_modules(id)
);

CREATE TABLE bioink_formulations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    properties JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE perfusion_sessions (
    id SERIAL PRIMARY KEY,
    module_id INT NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    data BYTEA,
    FOREIGN KEY (module_id) REFERENCES organ_modules(id)
);
```