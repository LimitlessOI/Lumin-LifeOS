CREATE TABLE resource_usage (
    id SERIAL PRIMARY KEY,
    utility_type VARCHAR(255) NOT NULL,
    zone_id INTEGER NOT NULL,
    consumption FLOAT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    predicted_demand FLOAT
);