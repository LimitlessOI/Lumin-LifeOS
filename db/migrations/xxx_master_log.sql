-- SQL for creating master_log table (idempotent).
-- NOTE: Filename kept as xxx_master_log.sql to preserve the existing row
-- in schema_migrations; do NOT rename. Auto-migrator in startup/database.js
-- tracks migrations by exact filename.
CREATE TABLE IF NOT EXISTS master_log (
    id SERIAL PRIMARY KEY,
    model VARCHAR(255),
    input TEXT,
    result TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
