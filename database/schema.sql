```sql
CREATE TABLE drones (
    id SERIAL PRIMARY KEY,
    model VARCHAR(255) NOT NULL,
    battery_level FLOAT NOT NULL,
    last_maintenance DATE NOT NULL,
    status VARCHAR(50) NOT NULL
);

CREATE TABLE deliveries (
    id SERIAL PRIMARY KEY,
    drone_id INTEGER REFERENCES drones(id),
    pickup_location VARCHAR(255) NOT NULL,
    dropoff_location VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    scheduled_time TIMESTAMP NOT NULL
);

CREATE TABLE drone_telemetry (
    id SERIAL PRIMARY KEY,
    drone_id INTEGER REFERENCES drones(id),
    timestamp TIMESTAMP NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    altitude FLOAT NOT NULL,
    speed FLOAT NOT NULL
);

CREATE TABLE compliance_logs (
    id SERIAL PRIMARY KEY,
    drone_id INTEGER REFERENCES drones(id),
    timestamp TIMESTAMP NOT NULL,
    compliance_status VARCHAR(255) NOT NULL,
    details TEXT
);
```