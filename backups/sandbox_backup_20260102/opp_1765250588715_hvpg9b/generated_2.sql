-- Assuming you have created a schema called 'code_review' in PostgreSQL and set it as default for your Rails project:
CREATE TABLE IF NOT EXISTS code_review.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- Store hashed passwords for security reasons
    role VARCHAR(20) CHECK (role IN ('freelancer', 'client')) NOT NULL
);