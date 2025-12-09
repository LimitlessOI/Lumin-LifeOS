```sql
CREATE TABLE smart_materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    properties JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE material_batches (
    id SERIAL PRIMARY KEY,
    material_id INT REFERENCES smart_materials(id),
    batch_number VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE damage_events (
    id SERIAL PRIMARY KEY,
    batch_id INT REFERENCES material_batches(id),
    damage_type VARCHAR(100) NOT NULL,
    severity INT NOT NULL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE industry_applications (
    id SERIAL PRIMARY KEY,
    material_id INT REFERENCES smart_materials(id),
    industry VARCHAR(255) NOT NULL,
    application_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);