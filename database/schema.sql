CREATE TABLE quantum_simulations (
    id SERIAL PRIMARY KEY,
    partner_id INT NOT NULL,
    simulation_data JSONB NOT NULL,
    result_data JSONB,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (partner_id) REFERENCES pharma_partners(id)
);

CREATE TABLE pharma_partners (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE molecular_optimizations (
    id SERIAL PRIMARY KEY,
    simulation_id INT NOT NULL,
    optimized_structure JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (simulation_id) REFERENCES quantum_simulations(id)
);