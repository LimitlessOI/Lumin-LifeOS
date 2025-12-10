CREATE TABLE drone_fleet (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES urban_farms(id),
    drone_identifier VARCHAR(100) NOT NULL UNIQUE,
    drone_type VARCHAR(50) NOT NULL,
    battery_level DECIMAL(5, 2) NOT NULL,
    current_task VARCHAR(255),
    last_maintenance DATE,
    status VARCHAR(50) NOT NULL
);