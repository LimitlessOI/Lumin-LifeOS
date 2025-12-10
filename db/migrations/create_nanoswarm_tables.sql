```sql
CREATE TABLE nanoswarm_treatments (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL,
    treatment_parameters JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE nanoparticle_batches (
    id SERIAL PRIMARY KEY,
    batch_code VARCHAR(100) UNIQUE NOT NULL,
    composition JSONB NOT NULL,
    manufacturing_date DATE NOT NULL
);

CREATE TABLE treatment_monitoring (
    id SERIAL PRIMARY KEY,
    treatment_id INT NOT NULL REFERENCES nanoswarm_treatments(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diagnostic_data JSONB NOT NULL
);
```