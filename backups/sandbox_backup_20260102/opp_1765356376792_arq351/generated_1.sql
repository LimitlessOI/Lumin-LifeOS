CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    status ENUM('active', 'inactive') DEFAULT 'active' -- assuming the new requirement for a custom enum-like type handling active/inactive states. Assuming PostgreSQL; modify as needed if using MySQL or another DBMS:
);