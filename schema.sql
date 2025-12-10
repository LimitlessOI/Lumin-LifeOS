```sql
CREATE TABLE delivery_swarms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE delivery_stations (
    id SERIAL PRIMARY KEY,
    location GEOGRAPHY NOT NULL,
    capacity INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE delivery_routes (
    id SERIAL PRIMARY KEY,
    swarm_id INT REFERENCES delivery_swarms(id),
    station_id INT REFERENCES delivery_stations(id),
    route_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE delivery_payloads (
    id SERIAL PRIMARY KEY,
    swarm_id INT REFERENCES delivery_swarms(id),
    weight DECIMAL(10, 2) NOT NULL,
    dimensions JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE delivery_demand_forecasts (
    id SERIAL PRIMARY KEY,
    station_id INT REFERENCES delivery_stations(id),
    forecast_data JSONB NOT NULL,
    forecast_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```