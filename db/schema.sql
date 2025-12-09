```sql
-- Enable PostGIS extension for geospatial data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Table for waste materials
CREATE TABLE waste_materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for IoT sensor readings
CREATE TABLE iot_sensor_readings (
    id SERIAL PRIMARY KEY,
    sensor_id VARCHAR(255) NOT NULL,
    material_id INT REFERENCES waste_materials(id),
    value NUMERIC,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    location GEOGRAPHY(POINT, 4326)
);

-- Table for collection routes
CREATE TABLE collection_routes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    route_points GEOMETRY(LINESTRING, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for marketplace listings
CREATE TABLE marketplace_listings (
    id SERIAL PRIMARY KEY,
    material_id INT REFERENCES waste_materials(id),
    price NUMERIC NOT NULL,
    available_quantity INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for user rewards
CREATE TABLE user_rewards (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    points INT NOT NULL,
    badge VARCHAR(255),
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```