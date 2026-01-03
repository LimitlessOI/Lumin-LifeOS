CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    status ENUM('pending', 'in-progress', 'completed') DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id SERIAL PRIMARY KEY,
    amount DECIMAL(19,4),
    status ENUM('pending', 'completed') DEFAULT 'pending',
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analytics_data (
    data_id SERIAL PRIMARY KEY,
    action VARCHAR(255),
    outcome TEXT,
    timestamp TIMESTAMP WITHO0UT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_status ON tasks (status);
CREATE INDEX idx_user_id ON transactions (user_id);