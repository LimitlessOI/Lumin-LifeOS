-- SYNOPSIS: Database migration — amendment_21_layer_12.sql.
CREATE TABLE IF NOT EXISTS layer_12_users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS layer_12_orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES layer_12_users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS layer_12_products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS layer_12_order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES layer_12_orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES layer_12_products(product_id) ON DELETE CASCADE
);

ALTER TABLE layer_12_users
    ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

ALTER TABLE layer_12_products
    ADD COLUMN IF NOT EXISTS description TEXT;