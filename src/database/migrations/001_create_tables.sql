```sql
CREATE TABLE edge_devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    location VARCHAR(255),
    last_maintenance TIMESTAMP
);

CREATE TABLE anomaly_detections (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    detected_at TIMESTAMP NOT NULL,
    anomaly_details JSONB,
    FOREIGN KEY (device_id) REFERENCES edge_devices(device_id)
);

CREATE TABLE maintenance_workflows (
    id SERIAL PRIMARY KEY,
    workflow_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50),
    created_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE supply_chain_logistics (
    id SERIAL PRIMARY KEY,
    part_id VARCHAR(255) UNIQUE NOT NULL,
    supplier VARCHAR(255),
    delivery_estimate TIMESTAMP
);

CREATE TABLE roi_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(255),
    value NUMERIC,
    recorded_at TIMESTAMP
);
```