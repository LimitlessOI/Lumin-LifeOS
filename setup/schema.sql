```sql
-- Table for farms
CREATE TABLE farms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table for edge devices
CREATE TABLE edge_devices (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id),
    device_name VARCHAR(255) NOT NULL,
    status VARCHAR(50),
    last_update TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table for federated models
CREATE TABLE federated_models (
    id SERIAL PRIMARY KEY,
    version INTEGER NOT NULL,
    model_data BYTEA,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table for energy logs
CREATE TABLE energy_logs (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES edge_devices(id),
    energy_consumed FLOAT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Table for subscription events
CREATE TABLE subscription_events (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id),
    event_type VARCHAR(255),
    event_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```