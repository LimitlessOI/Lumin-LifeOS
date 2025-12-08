```sql
CREATE TABLE IF NOT EXISTS eco_materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    composition JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS material_suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_info JSONB,
    eco_material_id INT REFERENCES eco_materials(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS material_tests (
    id SERIAL PRIMARY KEY,
    eco_material_id INT REFERENCES eco_materials(id),
    test_type VARCHAR(255),
    results JSONB,
    tested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS construction_projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    eco_material_id INT REFERENCES eco_materials(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);