```sql
CREATE TABLE farms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE iot_devices (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES farms(id),
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sensor_readings (
    id SERIAL PRIMARY KEY,
    device_id INT REFERENCES iot_devices(id),
    timestamp TIMESTAMP NOT NULL,
    temperature FLOAT,
    humidity FLOAT,
    moisture_level FLOAT
);

CREATE TABLE crop_analytics (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES farms(id),
    analysis_date DATE NOT NULL,
    disease_prediction VARCHAR(255),
    yield_forecast FLOAT,
    recommendations TEXT
);

CREATE TABLE automation_rules (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES farms(id),
    rule_name VARCHAR(255) NOT NULL,
    condition TEXT,
    action TEXT,
    enabled BOOLEAN DEFAULT TRUE
);

CREATE TABLE equipment_integrations (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES farms(id),
    equipment_name VARCHAR(255),
    api_endpoint VARCHAR(255),
    api_key VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```