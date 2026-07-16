-- SYNOPSIS: SQL — 2023_04_15_100001_create_tasks_table.sql.
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to INT REFERENCES users(id),
    status ENUM('pending', 'in progress', 'completed') DEFAULT 'pending'
);