CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password CHAR(64) NOT NULL, -- assuming bcrypt for hashing passwords before storing in the database.
    user_token UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    preferences JSONB
);