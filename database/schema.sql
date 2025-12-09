```sql
CREATE TABLE sensors (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50),
    location VARCHAR(100),
    last_reading TIMESTAMP
);

CREATE TABLE sensor_data (
    id SERIAL PRIMARY KEY,
    sensor_id INT REFERENCES sensors(id),
    data JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drones (
    id SERIAL PRIMARY KEY,
    model VARCHAR(50),
    status VARCHAR(20),
    last_communication TIMESTAMP
);

CREATE TABLE drone_data (
    id SERIAL PRIMARY KEY,
    drone_id INT REFERENCES drones(id),
    data JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```