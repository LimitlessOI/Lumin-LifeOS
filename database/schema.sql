```sql
CREATE TABLE healthcare_drones (
    id SERIAL PRIMARY KEY,
    model VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    battery_level INT NOT NULL,
    current_location GEOGRAPHY(Point, 4326),
    last_maintenance TIMESTAMP
);

CREATE TABLE medical_pods (
    id SERIAL PRIMARY KEY,
    temperature FLOAT NOT NULL,
    is_occupied BOOLEAN NOT NULL,
    drone_id INT,
    FOREIGN KEY (drone_id) REFERENCES healthcare_drones(id) ON DELETE SET NULL
);

CREATE TABLE healthcare_deliveries (
    id SERIAL PRIMARY KEY,
    delivery_status VARCHAR(20) NOT NULL,
    drone_id INT,
    pod_id INT,
    delivery_time TIMESTAMP,
    FOREIGN KEY (drone_id) REFERENCES healthcare_drones(id) ON DELETE SET NULL,
    FOREIGN KEY (pod_id) REFERENCES medical_pods(id) ON DELETE SET NULL
);

CREATE TABLE charging_stations (
    id SERIAL PRIMARY KEY,
    location GEOGRAPHY(Point, 4326),
    capacity INT NOT NULL
);

CREATE TABLE mesh_network_nodes (
    id SERIAL PRIMARY KEY,
    node_location GEOGRAPHY(Point, 4326),
    status VARCHAR(20) NOT NULL
);

CREATE INDEX idx_drone_status ON healthcare_drones(status);
CREATE INDEX idx_pod_occupation ON medical_pods(is_occupied);
CREATE INDEX idx_delivery_status ON healthcare_deliveries(delivery_status);
```