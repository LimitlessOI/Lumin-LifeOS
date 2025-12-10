```sql
CREATE TABLE printers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    capabilities JSONB,
    location GEOGRAPHY(POINT)
);

CREATE TABLE print_jobs (
    id SERIAL PRIMARY KEY,
    printer_id INT REFERENCES printers(id),
    file_path VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE design_analyses (
    id SERIAL PRIMARY KEY,
    job_id INT REFERENCES print_jobs(id),
    analysis_results JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blockchain_records (
    id SERIAL PRIMARY KEY,
    job_id INT REFERENCES print_jobs(id),
    transaction_hash VARCHAR(255),
    ipfs_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);