CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    product_details TEXT NOT NULL,
    quantity INTEGER CHECK (quantity > 0) DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'completed'))
);