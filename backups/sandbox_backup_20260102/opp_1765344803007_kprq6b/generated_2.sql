-- migrations/001_create_products_table.sql ===START OF SQL MIGRATION OMITTED FOR BREVITY, ADDITIONAL CODE FOLLOWS===
BEGIN;

CREATE TABLE IF NOT EXISTS products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2),
    niche_market_tags JSON, -- Assuming tags are stored as a JSON array for flexibility; otherwise use text or similar suitable datatype.
    roi_target INT DEFAULT 0,
    enhancement_status VARCHAR(50) CHECK (enhancement_status IN ('pending', 'completed', 'rejected'))
);

CREATE TABLE IF NOT EXISTS transactions_log (
    transaction_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id), -- Assuming a separate `users` table exists; adjust as necessary.
    product_id INT REFERENCES products(product_id),
    timestamp TIMESTAMP WITHOCTESTMICS,
    amount DECIMAL(10, 2),
    status VARCHAR(50) CHECK (status IN ('completed', 'pending', 'rejected')) -- Assuming a separate `users` table exists; adjust as necessary.
);

COMMIT;