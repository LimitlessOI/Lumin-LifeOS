```sql
CREATE TABLE biodegradable_materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    decomposition_time INTEGER,
    environmental_rating INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE eco_devices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    material_id INTEGER REFERENCES biodegradable_materials(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE device_components (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES eco_devices(id),
    name VARCHAR(255) NOT NULL,
    recyclable BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE environmental_impact_logs (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES eco_devices(id),
    impact_score INTEGER,
    log_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```