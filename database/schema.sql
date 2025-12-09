```sql
CREATE TABLE wildlife_observations (
    id SERIAL PRIMARY KEY,
    device_id INT NOT NULL,
    species_id INT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    location GEOGRAPHY(POINT, 4326),
    data JSONB
);

CREATE TABLE conservation_alerts (
    id SERIAL PRIMARY KEY,
    observation_id INT REFERENCES wildlife_observations(id),
    alert_type VARCHAR(50),
    severity INT,
    message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE iot_devices (
    id SERIAL PRIMARY KEY,
    device_name VARCHAR(100),
    location GEOGRAPHY(POINT, 4326),
    status VARCHAR(20),
    last_active TIMESTAMP
);

CREATE TABLE species_catalog (
    id SERIAL PRIMARY KEY,
    scientific_name VARCHAR(255),
    common_name VARCHAR(255),
    conservation_status VARCHAR(50),
    habitat TEXT
);
```