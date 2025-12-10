```sql
-- Migration script to create logistics-related tables

CREATE TABLE logistics_hubs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    capacity INTEGER NOT NULL
);

CREATE TABLE autonomous_vehicles (
    id SERIAL PRIMARY KEY,
    vehicle_id VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    last_maintenance DATE
);

CREATE TABLE deliveries (
    id SERIAL PRIMARY KEY,
    delivery_id VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL,
    origin GEOGRAPHY(POINT, 4326),
    destination GEOGRAPHY(POINT, 4326),
    vehicle_id INTEGER REFERENCES autonomous_vehicles(id),
    scheduled_time TIMESTAMP
);

CREATE TABLE route_optimization_logs (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES autonomous_vehicles(id),
    route JSONB,
    optimization_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```