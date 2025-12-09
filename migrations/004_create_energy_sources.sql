CREATE TABLE energy_sources (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES urban_farms(id),
    source_type VARCHAR(50) NOT NULL,
    capacity_kw DECIMAL(10, 2) NOT NULL,
    current_output DECIMAL(10, 2),
    storage_level DECIMAL(10, 2),
    grid_feed_enabled BOOLEAN DEFAULT FALSE
);