```sql
-- Table for supply chain entities
CREATE TABLE supply_chain_entities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for IoT sensor registry
CREATE TABLE iot_sensor_registry (
    id SERIAL PRIMARY KEY,
    sensor_id VARCHAR(100) NOT NULL UNIQUE,
    entity_id INT REFERENCES supply_chain_entities(id),
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for supply chain events
CREATE TABLE supply_chain_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    entity_id INT REFERENCES supply_chain_entities(id),
    sensor_id VARCHAR(100) REFERENCES iot_sensor_registry(sensor_id),
    data JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for ZKP compliance proofs
CREATE TABLE zkp_compliance_proofs (
    id SERIAL PRIMARY KEY,
    proof_data BYTEA NOT NULL,
    entity_id INT REFERENCES supply_chain_entities(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for token incentives
CREATE TABLE token_incentives (
    id SERIAL PRIMARY KEY,
    entity_id INT REFERENCES supply_chain_entities(id),
    token_amount DECIMAL(10, 2) NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```