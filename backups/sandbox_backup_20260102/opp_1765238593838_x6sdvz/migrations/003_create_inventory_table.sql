CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id), -- Assume a 'products' table exists with relevant fields and relationships defined elsewhere for foreign key constraint to work properly
    quantity INT CHECK (quantity >= 0) DEFAULT 0,
    reorder_threshold INT NOT NULL CHECK (reorder_threshold > 0), -- A non-zero threshold indicates when an inventory refresh is needed.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);