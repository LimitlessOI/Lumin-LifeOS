CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to INT REFERENCES users(id),
    status ENUM('pending', 'in progress', 'completed') DEFAULT 'pending'
);