```sql
CREATE TABLE IF NOT EXISTS bioreactor_units (
    id SERIAL PRIMARY KEY,
    unit_name VARCHAR(255) NOT NULL,
    capacity FLOAT NOT NULL,
    status VARCHAR(50) NOT NULL,
    location GEOMETRY(POINT, 4326),
    last_maintenance TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```