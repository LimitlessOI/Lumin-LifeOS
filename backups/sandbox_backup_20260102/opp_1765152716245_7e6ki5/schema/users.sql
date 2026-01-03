CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL CHECK (email ~* '^[a-zA-Z][a-zA-Z0-9_.+-]+@[a-zA-Z0-9_]+\.[a-zA-Z0-9_\.-]+$')
);