```sql
CREATE TABLE ev_charging_stations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location GEOGRAPHY NOT NULL,
    status VARCHAR(50) NOT NULL
);

CREATE TABLE charging_sessions (
    id SERIAL PRIMARY KEY,
    station_id INT REFERENCES ev_charging_stations(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    energy_consumed FLOAT NOT NULL
);

CREATE TABLE energy_allocations (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES charging_sessions(id),
    allocation_time TIMESTAMP NOT NULL,
    energy_amount FLOAT NOT NULL
);

CREATE TABLE green_miles_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    subscription_start TIMESTAMP NOT NULL,
    subscription_end TIMESTAMP NOT NULL
);

CREATE TABLE grid_service_events (
    id SERIAL PRIMARY KEY,
    event_time TIMESTAMP NOT NULL,
    service_type VARCHAR(255) NOT NULL,
    details JSONB
);
```