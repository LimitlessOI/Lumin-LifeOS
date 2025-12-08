```sql
CREATE TABLE digital_twins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE iot_devices (
    id SERIAL PRIMARY KEY,
    twin_id INT REFERENCES digital_twins(id),
    device_type VARCHAR(255),
    last_active TIMESTAMP
);

CREATE TABLE twin_telemetry (
    id SERIAL PRIMARY KEY,
    device_id INT REFERENCES iot_devices(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data JSONB
);

CREATE TABLE predictive_alerts (
    id SERIAL PRIMARY KEY,
    twin_id INT REFERENCES digital_twins(id),
    alert_type VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ar_sessions (
    id SERIAL PRIMARY KEY,
    twin_id INT REFERENCES digital_twins(id),
    session_data JSONB,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```