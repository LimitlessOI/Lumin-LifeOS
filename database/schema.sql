CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE iot_sensors (
    sensor_id SERIAL PRIMARY KEY,
    sensor_type VARCHAR(50),
    location GEOGRAPHY(POINT),
    last_active TIMESTAMP
);

CREATE TABLE edge_nodes (
    node_id SERIAL PRIMARY KEY,
    node_name VARCHAR(50),
    location GEOGRAPHY(POINT),
    status VARCHAR(20)
);

CREATE TABLE data_transactions (
    transaction_id SERIAL PRIMARY KEY,
    sensor_id INT REFERENCES iot_sensors(sensor_id),
    node_id INT REFERENCES edge_nodes(node_id),
    data_payload JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mobility_services (
    service_id SERIAL PRIMARY KEY,
    service_name VARCHAR(50),
    description TEXT,
    api_endpoint VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);