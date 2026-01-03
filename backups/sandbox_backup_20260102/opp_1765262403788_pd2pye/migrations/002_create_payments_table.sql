CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(50),
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);