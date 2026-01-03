-- File: migrations/002_create_orders_table.sql
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
    product_link VARCHAR(255),
    purchase_status ENUM('pending', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENTCTETIER) DOC TO JSONB,
);