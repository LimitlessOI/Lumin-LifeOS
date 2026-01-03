CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password CHAR(60) -- assuming bcrypt for hashing passwords; this may vary based on actual security requirements.
);