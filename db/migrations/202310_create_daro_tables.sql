```sql
CREATE TABLE daro_nodes (
    id SERIAL PRIMARY KEY,
    node_identifier VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resource_pools (
    id SERIAL PRIMARY KEY,
    pool_name VARCHAR(255) UNIQUE NOT NULL,
    capacity INTEGER NOT NULL,
    used_resources INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE smart_contracts (
    id SERIAL PRIMARY KEY,
    contract_hash VARCHAR(255) UNIQUE NOT NULL,
    contract_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workload_forecasts (
    id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES daro_nodes(id),
    forecast_data JSONB,
    forecast_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reputation_events (
    id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES daro_nodes(id),
    event_type VARCHAR(50),
    event_description TEXT,
    event_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);