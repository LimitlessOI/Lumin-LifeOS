-- Table for microgrid nodes
CREATE TABLE microgrid_nodes (
    node_id SERIAL PRIMARY KEY,
    node_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for energy transactions
CREATE TABLE energy_transactions (
    transaction_id SERIAL PRIMARY KEY,
    node_id INT REFERENCES microgrid_nodes(node_id),
    energy_amount DECIMAL(10, 2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for optimization schedules
CREATE TABLE optimization_schedules (
    schedule_id SERIAL PRIMARY KEY,
    node_id INT REFERENCES microgrid_nodes(node_id),
    schedule_time TIMESTAMP NOT NULL,
    optimization_parameters JSONB
);

-- Table for grid services
CREATE TABLE grid_services (
    service_id SERIAL PRIMARY KEY,
    service_name VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE
);