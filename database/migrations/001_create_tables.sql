```sql
CREATE TABLE waste_materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE iot_sensor_readings (
    id SERIAL PRIMARY KEY,
    sensor_id VARCHAR(255) NOT NULL,
    material_id INT REFERENCES waste_materials(id),
    reading_value DECIMAL NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE
);

CREATE TABLE recycling_contracts (
    id SERIAL PRIMARY KEY,
    contract_name VARCHAR(255) NOT NULL,
    terms TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_gamification (
    user_id INT PRIMARY KEY,
    points INT DEFAULT 0,
    level INT DEFAULT 1,
    rewards JSONB,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE collection_routes (
    id SERIAL PRIMARY KEY,
    route_name VARCHAR(255) NOT NULL,
    waypoints JSONB NOT NULL,
    optimized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```