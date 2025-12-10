CREATE TABLE quantum_simulations (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(255) NOT NULL,
    molecule_id INT NOT NULL,
    provider VARCHAR(255),
    status VARCHAR(50),
    result JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);