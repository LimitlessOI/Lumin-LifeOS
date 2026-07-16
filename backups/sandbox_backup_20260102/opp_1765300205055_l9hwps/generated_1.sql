-- SYNOPSIS: SQL — generated_1.sql.
CREATE TABLE IF NOT EXISTS employees (
    employee_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL
);