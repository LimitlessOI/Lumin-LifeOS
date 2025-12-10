```sql
CREATE TABLE iot_device_readings (
    id SERIAL PRIMARY KEY,
    device_id INT NOT NULL,
    reading JSONB NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);