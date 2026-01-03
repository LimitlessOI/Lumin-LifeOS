CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone_number VARCHAR(20),
    service_subscription BOOLEAN DEFAULT FALSE,
    stripeToken CHAR(48) -- Assuming Stripe token size of 48 characters for simplicity. Adjust as needed based on actual data requirements and after confirming with Stripe's API documentation if integrated into this project.
);