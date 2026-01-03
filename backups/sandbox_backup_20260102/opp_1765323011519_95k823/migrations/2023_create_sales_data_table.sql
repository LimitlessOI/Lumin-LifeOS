```sql
CREATE TABLE IF NOT EXISTS sales_data (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFEREN0NS products(product_id),
    quantity INTEGER CHECK (quantity >= 1) DEFAULT 1,
    sale_date TIMESTAMP WITH TIME ZONE NOT NULL,
    customer_id VARCHAR(255) REFERENCES customers(customer_id) ON DELETE CASCADE,
    payment_status VARCHAR(30), -- e.g., 'completed', 'pending' or 'failed'
    stripe_transaction_amount NUMERIC(10, 2), -- Captured amount after Stripe fee deduction if any (if applicable)
    transaction_fee DECIMAL(19,4) DEFAULT 3.50 CHECK (transaction_fee <= 3.50), -- Representing the default percentage cut by Lightweight Assistant for each sale; adjust as needed to comply with Stripe's fee model
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    CHECK ((transaction_fee / 100.0 * stripe_transaction_amount) <= transaction_fee), -- Ensuring the fee does not exceed its maximum value as a percentage of sales amount before Stripe's cut (adjust based on actual fees and desired revenue capture mechanism).
    CONSTRAINT chk_quantity CHECK ((stripe_transaction_amount - IFNULL(payment_status, 'completed')::NUMERIC) * quantity <= stripe_transaction_amount), -- Ensuring the total amount after Stripe's cut is non-negative and not exceeding sales price.
    CONSTRAINT chk_product CHECK (quantity > 0 AND product_id IS NOT NULL) -- Prevent zero stock issues or unsaved products without IDs.
);
```