-- SYNOPSIS: Database migration — 003_create_vendor_price_book.sql.
CREATE TABLE IF NOT EXISTS vendor_price_book (
    id SERIAL PRIMARY KEY,
    vendor_id INT NOT NULL,
    product_id INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    review_score DECIMAL(3, 2),
    review_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);