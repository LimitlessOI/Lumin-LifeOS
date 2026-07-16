-- SYNOPSIS: SQL — 2023_04_15_init_users_table.sql.
BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    encrypted_password TEXT NOT NULL,
    preferences JSONB DEFAULT '{}'::JSONB
);
CREATE INDEX ON users (email);
COMMIT;