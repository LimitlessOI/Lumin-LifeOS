-- SYNOPSIS: SQL — 20231010_create_energy_assets.sql.
```sql
CREATE TABLE energy_assets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    capacity DECIMAL NOT NULL,
    location GEOGRAPHY(POINT) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);