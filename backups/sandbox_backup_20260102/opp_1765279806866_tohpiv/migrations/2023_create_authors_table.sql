CREATE TABLE IF NOT EXISTS authors (
    author_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150), -- assuming unique for now as an example; implement a UNIQUE constraint in practice
    bio TEXT
);