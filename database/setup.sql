```sql
CREATE TABLE edge_devices (
    id SERIAL PRIMARY KEY,
    device_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    last_online TIMESTAMP
);

CREATE TABLE anomaly_logs (
    id SERIAL PRIMARY KEY,
    device_id INT REFERENCES edge_devices(id),
    anomaly_timestamp TIMESTAMP NOT NULL,
    anomaly_data JSONB NOT NULL
);

CREATE TABLE digital_twin_scenarios (
    id SERIAL PRIMARY KEY,
    scenario_name VARCHAR(255) NOT NULL,
    parameters JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE performance_metrics (
    id SERIAL PRIMARY KEY,
    device_id INT REFERENCES edge_devices(id),
    metric_name VARCHAR(255) NOT NULL,
    metric_value DOUBLE PRECISION,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```