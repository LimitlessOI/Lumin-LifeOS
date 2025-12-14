```sql
CREATE TABLE supplier_ethical_profiles (
    id SERIAL PRIMARY KEY,
    supplier_id INT NOT NULL,
    ethical_score DECIMAL(5, 2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```