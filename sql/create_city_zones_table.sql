CREATE TABLE city_zones (
    id SERIAL PRIMARY KEY,
    zone_name VARCHAR(255) NOT NULL,
    coordinates GEOMETRY NOT NULL,
    population_density FLOAT NOT NULL,
    infrastructure_score INTEGER NOT NULL
);