```sql
CREATE TABLE iot_sensors (
    id SERIAL PRIMARY KEY,
    sensor_id VARCHAR(255) NOT NULL,
    sensor_type VARCHAR(255),
    location GEOGRAPHY(POINT, 4326),
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE edge_nodes (
    id SERIAL PRIMARY KEY,
    node_id VARCHAR(255) NOT NULL,
    status VARCHAR(50),
    last_heartbeat TIMESTAMP
);

CREATE TABLE blockchain_transactions (
    id SERIAL PRIMARY KEY,
    transaction_hash VARCHAR(255),
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mobility_services (
    id SERIAL PRIMARY KEY,
    service_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    api_key VARCHAR(255),
    usage_count INT DEFAULT 0
);

CREATE TABLE predictive_analytics (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(255),
    prediction_results JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```