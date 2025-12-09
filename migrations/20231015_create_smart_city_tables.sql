```sql
-- Migration for creating smart city tables

CREATE TABLE smart_city_devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    location VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    last_communication TIMESTAMP
);

CREATE TABLE city_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(255) NOT NULL,
    value FLOAT NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE citizen_feedback (
    id SERIAL PRIMARY KEY,
    citizen_id INTEGER NOT NULL,
    feedback TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE traffic_patterns (
    id SERIAL PRIMARY KEY,
    road_id VARCHAR(255) NOT NULL,
    average_speed FLOAT NOT NULL,
    congestion_level INTEGER NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE energy_grid (
    id SERIAL PRIMARY KEY,
    region VARCHAR(255) NOT NULL,
    energy_consumed FLOAT NOT NULL,
    energy_generated FLOAT NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance optimization if needed
CREATE INDEX idx_device_status ON smart_city_devices(status);
CREATE INDEX idx_metric_name ON city_metrics(metric_name);
CREATE INDEX idx_road_id ON traffic_patterns(road_id);
CREATE INDEX idx_region ON energy_grid(region);
```