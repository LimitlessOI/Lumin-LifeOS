CREATE TABLE IF NOT EXISTS stripe_payments (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(8,2), -- Amount in cents to ensure precision for small transactions without decimals.
    currency VARCHAR(3) DEFAULT 'usd', // Specify appropriate default based on your business requirements if necessary.
    payment_intent UUID NOT NULL UNIQUE, 
    status ENUM('created', 'paid') NOT NULL, -- Add more as required for different transaction states.
    created_at TIMESTAMP WITHOCTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH (timezone) ON UPDATE CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULLABLE -- For recording when the payment is actually processed.
);