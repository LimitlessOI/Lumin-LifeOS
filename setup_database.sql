CREATE TABLE quantum_jobs (
    job_id SERIAL PRIMARY KEY,
    details JSONB,
    status VARCHAR(50),
    provider_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quantum_algorithms (
    algorithm_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE qpu_providers (
    provider_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE,
    api_endpoint VARCHAR(255),
    api_key VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);