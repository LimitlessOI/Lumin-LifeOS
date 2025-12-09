```sql
CREATE TABLE energy_nodes (
    id SERIAL PRIMARY KEY,
    node_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50),
    capacity FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE energy_transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(255) UNIQUE NOT NULL,
    from_node_id VARCHAR(255) NOT NULL,
    to_node_id VARCHAR(255) NOT NULL,
    amount FLOAT,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_node_id) REFERENCES energy_nodes(node_id),
    FOREIGN KEY (to_node_id) REFERENCES energy_nodes(node_id)
);

CREATE TABLE grid_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(255),
    node_id VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (node_id) REFERENCES energy_nodes(node_id)
);

CREATE TABLE federated_models (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(255) UNIQUE NOT NULL,
    version INT,
    parameters BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```