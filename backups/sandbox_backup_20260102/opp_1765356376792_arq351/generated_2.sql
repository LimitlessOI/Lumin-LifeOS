CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    project_name VARCHAR(255) UNIQUE NOT NULL,
    status ENUM('open', 'in-review') DEFAULT 'open' -- assuming the new requirement for a custom enum handling open and in-review states: not yet implemented. Modify as needed if using PostgreSQL; modify to use an integer or create your own UUIDs on MySQL/MariaDB, etc.:
);