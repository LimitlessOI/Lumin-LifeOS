```sql
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    age INT,
    condition VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE organ_modules (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(id),
    type VARCHAR(255),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE print_jobs (
    id SERIAL PRIMARY KEY,
    organ_module_id INT REFERENCES organ_modules(id),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ip_blocks (
    id SERIAL PRIMARY KEY,
    organ_module_id INT REFERENCES organ_modules(id),
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);