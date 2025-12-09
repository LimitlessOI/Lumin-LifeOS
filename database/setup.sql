```sql
CREATE TABLE amt_vehicles (
    id SERIAL PRIMARY KEY,
    model VARCHAR(100),
    capacity INT,
    status VARCHAR(50),
    location GEOGRAPHY(POINT, 4326)
);

CREATE TABLE amt_routes (
    id SERIAL PRIMARY KEY,
    origin GEOGRAPHY(POINT, 4326),
    destination GEOGRAPHY(POINT, 4326),
    distance FLOAT,
    duration INT
);

CREATE TABLE amt_bookings (
    id SERIAL PRIMARY KEY,
    vehicle_id INT REFERENCES amt_vehicles(id),
    route_id INT REFERENCES amt_routes(id),
    passenger_count INT,
    status VARCHAR(50),
    booking_time TIMESTAMP
);

CREATE TABLE amt_v2i_nodes (
    id SERIAL PRIMARY KEY,
    location GEOGRAPHY(POINT, 4326),
    node_type VARCHAR(50),
    status VARCHAR(50)
);

CREATE TABLE amt_demand_predictions (
    id SERIAL PRIMARY KEY,
    prediction_date DATE,
    demand INT,
    confidence FLOAT
);
```