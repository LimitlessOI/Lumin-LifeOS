-- SYNOPSIS: SQL — 2023_04_01_1200_create_users_table.sql.
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100),
    role ENUM('educator', 'content_developer') DEFAULT 'educator',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);