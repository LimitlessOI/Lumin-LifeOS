CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    price NUMERIC CHECK (price > 0)
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password CHAR(64), -- Storing SHA-256 of the plain text password. We should never store raw passwords in production code for security reasons but this is a placeholder example 
);
  
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    userId INT REFEREN0S users(id), -- Assuming we have an existing `users` table with primary key as ID
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    start_date DATE, 
    end_date DATE,
    status VARCHAR(20), -- 'active' or 'inactive' subscription types
);
  
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    userId INT REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE, 
    product_id INTEGER NOT NULL REFERENCES products(id), -- Relationship with the Products table. Each subscription corresponds to a single transaction record here for payments made by Stripe API integration (Stripe ID).
    price NUMERIC CHECK (price > 0) DECIMAL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- The date and time of the charge to track performance. We might want this for refunds too if we decide on that service being added later on...
);