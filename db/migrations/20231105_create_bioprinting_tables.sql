-- SYNOPSIS: Database migration — 20231105_create_bioprinting_tables.sql.
CREATE TABLE IF NOT EXISTS organs (
    id SERIAL PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    design_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bioprinters (
    id SERIAL PRIMARY KEY,
    model VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    location VARCHAR(100),
    last_maintenance TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_scans (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL,
    scan_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transplant_logs (
    id SERIAL PRIMARY KEY,
    organ_id INT NOT NULL REFERENCES organs(id),
    patient_id INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    log_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);