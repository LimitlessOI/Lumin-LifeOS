CREATE TABLE microgrids (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE energy_transactions (
    id SERIAL PRIMARY KEY,
    microgrid_id INT REFERENCES microgrids(id),
    energy_amount DECIMAL(10, 2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT transaction_type_check CHECK (transaction_type IN ('buy', 'sell'))
);

CREATE TABLE grid_predictions (
    id SERIAL PRIMARY KEY,
    microgrid_id INT REFERENCES microgrids(id),
    prediction_data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE edge_nodes (
    id SERIAL PRIMARY KEY,
    microgrid_id INT REFERENCES microgrids(id),
    node_data JSON NOT NULL,
    last_active TIMESTAMP
);

CREATE TABLE federated_models (
    id SERIAL PRIMARY KEY,
    model_data BYTEA NOT NULL,
    version INT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);