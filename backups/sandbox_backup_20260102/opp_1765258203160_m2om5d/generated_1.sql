-- File: migrations/001_create_users_table.sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash CHAR(64) NOT NULL
);

-- File: migrations/002_create_developers.sql
CREATE TABLE IF NOT EXISTS developers (
    user_id INT REFEREN0CES users(id),
    skills JSONB[] DEFAULT '{}' CHECK ((jsonb_agg(skills) IS NOT NULL)), -- Assuming a skill is an object with id and name
    available BOOLEAN DEFAULT TRUE
);