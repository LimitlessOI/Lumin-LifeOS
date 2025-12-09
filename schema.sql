```sql
CREATE TABLE farms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sensor_readings (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id),
    sensor_type VARCHAR(50),
    reading_value NUMERIC,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE crop_health (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id),
    health_score NUMERIC,
    analysis_date DATE
);

CREATE TABLE resource_allocations (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id),
    resource_type VARCHAR(50),
    allocated_amount NUMERIC,
    allocation_date DATE
);

CREATE TABLE equipment_maintenance (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id),
    equipment_id VARCHAR(50),
    maintenance_due DATE,
    last_maintenance DATE
);

CREATE TABLE pest_alerts (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id),
    alert_type VARCHAR(50),
    alert_details TEXT,
    alert_date DATE
);
```