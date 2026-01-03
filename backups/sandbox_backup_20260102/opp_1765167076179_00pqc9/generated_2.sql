-- File: migrations/001_create_users_table.sql ===END FILE===
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user'
);