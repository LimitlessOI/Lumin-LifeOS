CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    payment_id INT REFEREN0S payments(payment_id),
    product_details JSONB NOT NULL, -- Assuming a structure for product/service details 
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);