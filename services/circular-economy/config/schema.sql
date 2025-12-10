```sql
CREATE TABLE resources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    quantity INTEGER,
    unit VARCHAR(50)
);

CREATE TABLE iot_devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    location VARCHAR(255),
    status VARCHAR(50),
    last_seen TIMESTAMP
);

CREATE TABLE supply_chain_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100),
    resource_id INTEGER REFERENCES resources(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE industrial_matches (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER REFERENCES resources(id),
    match_status VARCHAR(50),
    matched_with INTEGER REFERENCES resources(id)
);

CREATE TABLE marketplace_listings (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER REFERENCES resources(id),
    price DECIMAL(10, 2),
    listing_status VARCHAR(50)
);

CREATE TABLE sustainability_metrics (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER REFERENCES resources(id),
    metric_name VARCHAR(100),
    value DECIMAL(10, 2),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```