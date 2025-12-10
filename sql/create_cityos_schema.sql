```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE city_sensors (
    id SERIAL PRIMARY KEY,
    sensor_id VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    location GEOGRAPHY(Point, 4326),
    data JSONB NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE city_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    description TEXT,
    location GEOGRAPHY(Point, 4326),
    event_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE citizen_feedback (
    id SERIAL PRIMARY KEY,
    citizen_id VARCHAR(255) NOT NULL,
    feedback TEXT NOT NULL,
    category VARCHAR(100),
    submission_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE infrastructure_assets (
    id SERIAL PRIMARY KEY,
    asset_name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(100),
    location GEOGRAPHY(Point, 4326),
    status VARCHAR(100) NOT NULL,
    last_maintenance TIMESTAMP
);

CREATE TABLE city_analytics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(255) NOT NULL,
    metric_value DOUBLE PRECISION,
    calculation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```