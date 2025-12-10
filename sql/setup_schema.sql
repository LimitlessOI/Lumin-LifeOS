CREATE TABLE healthcare_drones (
    id SERIAL PRIMARY KEY,
    drone_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50),
    battery_level INT,
    last_maintenance DATE
);

CREATE TABLE medical_pods (
    id SERIAL PRIMARY KEY,
    pod_id VARCHAR(255) UNIQUE NOT NULL,
    contents JSONB,
    status VARCHAR(50),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE delivery_missions (
    id SERIAL PRIMARY KEY,
    mission_id VARCHAR(255) UNIQUE NOT NULL,
    drone_id VARCHAR(255) REFERENCES healthcare_drones(drone_id),
    destination VARCHAR(255),
    status VARCHAR(50),
    launched_at TIMESTAMP
);

CREATE TABLE charging_stations (
    id SERIAL PRIMARY KEY,
    station_id VARCHAR(255) UNIQUE NOT NULL,
    location VARCHAR(255),
    capacity INT
);

CREATE TABLE mesh_network_nodes (
    id SERIAL PRIMARY KEY,
    node_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50),
    last_sync TIMESTAMP
);
--