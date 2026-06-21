-- SYNOPSIS: Database migration — 20231015_create_learning_modules.sql.
```sql
CREATE TABLE learning_modules (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```