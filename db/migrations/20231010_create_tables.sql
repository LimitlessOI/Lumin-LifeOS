```sql
CREATE TABLE construction_panels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    variant_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE panel_sensor_data (
    id SERIAL PRIMARY KEY,
    panel_id INT REFERENCES construction_panels(id),
    sensor_type VARCHAR(50),
    value NUMERIC,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE digital_twins (
    id SERIAL PRIMARY KEY,
    panel_id INT REFERENCES construction_panels(id),
    twin_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sustainability_credentials (
    id SERIAL PRIMARY KEY,
    panel_id INT REFERENCES construction_panels(id),
    credential_data JSONB,
    issued_at TIMESTAMP
);

CREATE TABLE panel_variants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE,
    specifications JSONB
);
```