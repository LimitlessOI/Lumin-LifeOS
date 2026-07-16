-- SYNOPSIS: SQL — 2023_04_xx_xxxxxx_create_projects.sql.
BEGIN;
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT
);
COMMIT;