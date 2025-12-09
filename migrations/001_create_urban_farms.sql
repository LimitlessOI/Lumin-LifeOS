CREATE TABLE urban_farms (
    id SERIAL PRIMARY KEY,
    skyscraper_name VARCHAR(255) NOT NULL,
    location_coords GEOGRAPHY(Point, 4326),
    total_floors INT NOT NULL,
    operational_status VARCHAR(50) NOT NULL,
    energy_autonomy_percentage DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);