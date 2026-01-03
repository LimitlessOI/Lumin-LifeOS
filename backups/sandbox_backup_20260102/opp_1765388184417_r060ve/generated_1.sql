-- Create users table (assumed migration filename: `2019_04_07_000000_create_users_table.sql` for YYYYMMDDHHMMSS format)
CREATE TABLE IF NOT EXISTS Users(
    id SERIAL PRIMARY KEY, 
    email VARCHAR(100) UNIQUE NOT NULL, 
    password TEXT NOT NULL
);