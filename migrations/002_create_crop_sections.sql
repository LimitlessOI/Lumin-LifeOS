CREATE TABLE crop_sections (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES urban_farms(id),
    floor_number INT NOT NULL,
    crop_type VARCHAR(100) NOT NULL,
    growth_stage VARCHAR(50) NOT NULL,
    planting_date DATE NOT NULL,
    estimated_harvest_date DATE,
    current_yield_kg DECIMAL(10, 2),
    sensor_data_json JSONB
);