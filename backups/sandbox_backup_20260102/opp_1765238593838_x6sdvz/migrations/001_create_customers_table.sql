CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100),
    hashed_password TEXT, -- Assume password is stored as a hash for security
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);