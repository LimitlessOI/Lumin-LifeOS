-- SYNOPSIS: SQL — create_generated_routes.sql.
```sql
CREATE TABLE generated_routes (
    id SERIAL PRIMARY KEY,
    route_path VARCHAR(255) NOT NULL,
    version INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);