```sql
CREATE TABLE edge_devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    device_type VARCHAR(100),
    location VARCHAR(255),
    last_active TIMESTAMP
);

CREATE TABLE sensor_readings (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) REFERENCES edge_devices(device_id),
    timestamp TIMESTAMP NOT NULL,
    sensor_type VARCHAR(100),
    value NUMERIC,
    unit VARCHAR(50)
);

CREATE TABLE predictive_alerts (
    id SERIAL PRIMARY KEY,
    reading_id INT REFERENCES sensor_readings(id),
    alert_type VARCHAR(100),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roi_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100),
    metric_value NUMERIC,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE federated_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100),
    version INT,
    parameters BYTEA,
    trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```