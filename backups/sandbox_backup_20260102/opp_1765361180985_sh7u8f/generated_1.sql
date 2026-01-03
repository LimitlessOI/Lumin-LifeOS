===FILE:migrations/001_create_users_table.sql===
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE
);