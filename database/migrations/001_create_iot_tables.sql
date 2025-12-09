```sql
-- Migration for creating necessary tables

CREATE TABLE iot_sensors (
    id SERIAL PRIMARY KEY,
    sensor_id VARCHAR(255) UNIQUE NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sensor_data (
    id SERIAL PRIMARY KEY,
    sensor_id VARCHAR(255) REFERENCES iot_sensors(sensor_id),
    data JSONB,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE maintenance_logs (
    id SERIAL PRIMARY KEY,
    sensor_id VARCHAR(255) REFERENCES iot_sensors(sensor_id),
    maintenance_date TIMESTAMP,
    details TEXT
);
```