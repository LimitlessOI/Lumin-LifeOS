```sql
CREATE TABLE supply_chain_entities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL
);

CREATE TABLE iot_devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    entity_id INT REFERENCES supply_chain_entities(id)
);

CREATE TABLE carbon_footprint_records (
    id SERIAL PRIMARY KEY,
    entity_id INT REFERENCES supply_chain_entities(id),
    carbon_footprint DECIMAL(10, 2) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE federated_learning_sessions (
    id SERIAL PRIMARY KEY,
    session_name VARCHAR(255) NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE token_transactions (
    id SERIAL PRIMARY KEY,
    transaction_hash VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL
);
```