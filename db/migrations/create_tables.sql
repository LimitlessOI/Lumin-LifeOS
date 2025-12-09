CREATE TABLE drone_fleet (
    id SERIAL PRIMARY KEY,
    drone_id VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20),
    last_maintenance DATE
);

CREATE TABLE delivery_missions (
    id SERIAL PRIMARY KEY,
    mission_code VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    drone_id VARCHAR(50) REFERENCES drone_fleet(drone_id)
);

CREATE TABLE landing_pads (
    id SERIAL PRIMARY KEY,
    location POINT,
    available BOOLEAN DEFAULT TRUE,
    last_used TIMESTAMP
);

CREATE TABLE air_corridors (
    id SERIAL PRIMARY KEY,
    start_point POINT,
    end_point POINT,
    width FLOAT
);
--