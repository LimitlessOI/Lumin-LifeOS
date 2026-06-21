-- SYNOPSIS: SQL — 003_create_logs_table.sql.
```sql
CREATE TABLE logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    INDEX (timestamp),
    INDEX (level)
);
```