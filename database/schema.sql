```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE fetin_threat_indicators (
    id SERIAL PRIMARY KEY,
    indicator_type VARCHAR(255),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fetin_federated_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255),
    version INTEGER,
    parameters BYTEA,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fetin_inference_logs (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES fetin_federated_models(id),
    input_data JSONB,
    result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fetin_node_registry (
    id SERIAL PRIMARY KEY,
    node_name VARCHAR(255),
    ip_address INET,
    registered_at TIMESTAMPTZ DEFAULT NOW()
);
```