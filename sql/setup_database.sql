```sql
CREATE TABLE biohybrid_panels (
    id SERIAL PRIMARY KEY,
    panel_id VARCHAR(255) UNIQUE NOT NULL,
    manufacture_date TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL
);

CREATE TABLE panel_sensor_data (
    id SERIAL PRIMARY KEY,
    panel_id VARCHAR(255) REFERENCES biohybrid_panels(panel_id),
    sensor_type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE construction_projects (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(255) UNIQUE NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    status VARCHAR(50) NOT NULL
);

CREATE TABLE material_provenance (
    id SERIAL PRIMARY KEY,
    material_id VARCHAR(255) UNIQUE NOT NULL,
    source VARCHAR(255) NOT NULL,
    details JSONB NOT NULL
);
```