```sql
CREATE TABLE energy_mesh_nodes (
    node_id SERIAL PRIMARY KEY,
    node_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    status VARCHAR(50) NOT NULL
);

CREATE TABLE energy_transactions (
    transaction_id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES energy_mesh_nodes(node_id),
    amount DECIMAL(10, 2) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE energy_predictions (
    prediction_id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES energy_mesh_nodes(node_id),
    predicted_value DECIMAL(10, 2) NOT NULL,
    prediction_time TIMESTAMP NOT NULL
);

CREATE TABLE regulatory_profiles (
    profile_id SERIAL PRIMARY KEY,
    region VARCHAR(255) NOT NULL,
    compliance_rules JSONB NOT NULL
);
```