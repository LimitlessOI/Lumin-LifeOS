-- File: migrations/001_create_users_table.sql ===END FILE===
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY, 
    username VARCHAR(50) UNIQUE NOT NULL, 
    email VARCHAR(255) UNIQUE NOT NULL, 
    password TEXT NOT NULL
);