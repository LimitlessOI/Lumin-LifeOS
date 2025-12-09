```sql
CREATE TABLE packaging (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    dimensions VARCHAR(100),
    weight DECIMAL(10, 2),
    material VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recommendations (
    id SERIAL PRIMARY KEY,
    packaging_id INT REFERENCES packaging(id),
    recommendation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```