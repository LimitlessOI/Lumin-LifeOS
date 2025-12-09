```sql
CREATE TABLE farms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location GEOGRAPHY(POINT),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE iot_devices (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES farms(id),
    device_type VARCHAR(100),
    serial_number VARCHAR(100) UNIQUE,
    installed_at TIMESTAMP,
    last_maintenance TIMESTAMP
);

CREATE TABLE sensor_readings (
    id SERIAL PRIMARY KEY,
    device_id INT REFERENCES iot_devices(id),
    reading_type VARCHAR(50),
    value NUMERIC,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drone_flights (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES farms(id),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    flight_data JSONB
);

CREATE TABLE ai_predictions (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES farms(id),
    prediction_type VARCHAR(50),
    predicted_value NUMERIC,
    prediction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resource_allocations (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES farms(id),
    resource_type VARCHAR(50),
    allocated_amount NUMERIC,
    allocation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);