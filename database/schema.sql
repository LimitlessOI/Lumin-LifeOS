```sql
CREATE TABLE drones (
    id SERIAL PRIMARY KEY,
    model VARCHAR(255),
    status VARCHAR(50),
    battery_level INT,
    last_maintenance DATE
);

CREATE TABLE deliveries (
    id SERIAL PRIMARY KEY,
    drone_id INT REFERENCES drones(id),
    hub_id INT REFERENCES delivery_hubs(id),
    destination VARCHAR(255),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drone_flight_logs (
    id SERIAL PRIMARY KEY,
    drone_id INT REFERENCES drones(id),
    flight_path JSON,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(50)
);

CREATE TABLE delivery_hubs (
    id SERIAL PRIMARY KEY,
    location VARCHAR(255),
    capacity INT
);
```