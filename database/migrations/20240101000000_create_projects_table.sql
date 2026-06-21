-- SYNOPSIS: SQL — 20240101000000_create_projects_table.sql.
```sql
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    client_id INTEGER,
    start_date DATE,
    end_date DATE,
    budget DECIMAL
);
```