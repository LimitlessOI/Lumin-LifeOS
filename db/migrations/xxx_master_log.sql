-- SQL for creating master_log table
CREATE TABLE master_log (
    id SERIAL PRIMARY KEY,
    model VARCHAR(255),
    input TEXT,
    result TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);