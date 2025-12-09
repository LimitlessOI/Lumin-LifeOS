-- Drones table
CREATE TABLE drones (
    id SERIAL PRIMARY KEY,
    model VARCHAR(50),
    status VARCHAR(20),
    current_location GEOGRAPHY(POINT),
    battery_level INTEGER
);

-- Charging stations table
CREATE TABLE charging_stations (
    id SERIAL PRIMARY KEY,
    location GEOGRAPHY(POINT),
    capacity INTEGER
);

-- Delivery routes table
CREATE TABLE delivery_routes (
    id SERIAL PRIMARY KEY,
    drone_id INTEGER REFERENCES drones(id),
    start_location GEOGRAPHY(POINT),
    end_location GEOGRAPHY(POINT),
    status VARCHAR(20),
    estimated_time TIMESTAMP
);

-- Payload containers table
CREATE TABLE payload_containers (
    id SERIAL PRIMARY KEY,
    capacity INTEGER,
    current_weight INTEGER
);

-- Retail partners table
CREATE TABLE retail_partners (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    api_endpoint VARCHAR(200)
);