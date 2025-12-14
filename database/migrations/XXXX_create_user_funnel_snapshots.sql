CREATE TABLE user_funnel_snapshots (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    funnel_stage VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data JSONB,
    FOREIGN KEY (user_id) REFERENCES users(id)
);