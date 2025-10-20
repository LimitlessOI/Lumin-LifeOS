CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    messages JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    title VARCHAR(255),
    tags VARCHAR(255)[]
);