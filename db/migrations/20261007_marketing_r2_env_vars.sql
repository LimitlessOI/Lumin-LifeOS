-- SYNOPSIS: Database migration — 20261007_marketing_r2_env_vars.sql.
-- Creates the env_vars table idempotently (PostgreSQL-compatible).
CREATE TABLE IF NOT EXISTS env_vars (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(255) NOT NULL,
    var_name VARCHAR(255) NOT NULL,
    var_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
