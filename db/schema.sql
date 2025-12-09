-- Create table for wildlife observations
CREATE TABLE IF NOT EXISTS wildlife_observations (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    species VARCHAR(255),
    observed_by VARCHAR(255),
    observation_data JSONB
);

-- Create table for conservation devices
CREATE TABLE IF NOT EXISTS conservation_devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(255),
    location GEOGRAPHY(POINT, 4326),
    status VARCHAR(50),
    last_maintenance TIMESTAMP
);

-- Create table for habitat alerts
CREATE TABLE IF NOT EXISTS habitat_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(255),
    triggered_at TIMESTAMP NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    details JSONB,
    resolved BOOLEAN DEFAULT FALSE
);

-- Create table for predictive models
CREATE TABLE IF NOT EXISTS predictive_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255),
    version VARCHAR(50),
    parameters JSONB,
    accuracy FLOAT,
    last_updated TIMESTAMP
);