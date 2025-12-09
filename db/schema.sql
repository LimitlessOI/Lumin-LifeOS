```sql
CREATE TABLE drones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    model VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    battery_level INT NOT NULL,
    last_maintenance DATE
);

CREATE TABLE deliveries (
    id SERIAL PRIMARY KEY,
    drone_id INT REFERENCES drones(id),
    origin VARCHAR(255),
    destination VARCHAR(255),
    status VARCHAR(50),
    pickup_time TIMESTAMP,
    delivery_time TIMESTAMP
);

CREATE TABLE mesh_nodes (
    id SERIAL PRIMARY KEY,
    node_name VARCHAR(255),
    location POINT,
    status VARCHAR(50)
);

CREATE TABLE weather_conditions (
    id SERIAL PRIMARY KEY,
    location POINT,
    temperature DECIMAL,
    wind_speed DECIMAL,
    precipitation DECIMAL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drone_telemetry (
    id SERIAL PRIMARY KEY,
    drone_id INT REFERENCES drones(id),
    location POINT,
    speed DECIMAL,
    battery_level INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```