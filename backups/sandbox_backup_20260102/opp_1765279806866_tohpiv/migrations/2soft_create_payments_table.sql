CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    amount DECIMAL(10, 2) CHECK (amount > 0), -- assuming USD for simplicity; handle currency conversion as needed.
    status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIMEZONDEFAULTCURRENT_TIMESTAMP)
);