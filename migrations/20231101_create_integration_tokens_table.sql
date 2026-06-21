-- SYNOPSIS: Database migration — 20231101_create_integration_tokens_table.sql.
```sql
CREATE TABLE integration_tokens (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(50) NOT NULL,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```