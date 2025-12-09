```sql
CREATE TABLE smart_materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specifications JSONB NOT NULL,
    performance_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE material_tests (
    id SERIAL PRIMARY KEY,
    material_id INT REFERENCES smart_materials(id),
    test_results JSONB NOT NULL,
    conducted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE manufacturing_partners (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    api_endpoint VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE client_products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    material_id INT REFERENCES smart_materials(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```