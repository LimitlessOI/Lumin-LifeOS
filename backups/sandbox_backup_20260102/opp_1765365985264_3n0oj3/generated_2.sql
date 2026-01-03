// migrations/001_create_table.sql - Neon PostgreSQL Database Migration for Revenue Tracking and Stripe Payments Table Design if integrated as per Step 8 of the plan (Stripe payments table design)
CREATE TABLE IF NOT EXISTS revenue_tracking (
    id SERIAL PRIMARY KEY,
    task_id INT REFERENCES tasks(id),
    amount DECIMAL(10,2), -- Amount in local currency; consider using a standardized format for internationalization if necessary.
    stripe_refunded BOOLEAN DEFAULT FALSE,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status VARCHAR(50) CHECK (status IN ('completed', 'pending')) -- Ensure that this table also has appropriate foreign key references to content creators and tasks as required.
);