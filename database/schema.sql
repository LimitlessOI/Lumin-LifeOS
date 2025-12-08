```sql
CREATE TABLE biodegradable_materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    composition JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE electronics_prototypes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    design JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE manufacturing_runs (
    id SERIAL PRIMARY KEY,
    prototype_id INT REFERENCES electronics_prototypes(id),
    status VARCHAR(50) NOT NULL,
    run_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    results JSON
);
```