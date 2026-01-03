-- File: migrations/create_orders_table.sql - SQL command to create an Orders table in Neon PostgreSQL with appropriate indexes for fast retrieval of user-specific order data 
CREATE TABLE IF NOT EXISTS orders (
    OrderId SERIAL PRIMARY KEY,
    UserId INT REFERENCES users(UserId) ON DELETE CASCADE -- Ensures referential integrity and allows foreign key constraints to be used. In a production environment ensure proper cascading rules based on the expected business logic in case of user deletions or updates that could affect order data (considerations for soft/hard delete scenarios, etc.).
);
CREATE INDEX IF NOT EXISTS idx_user ON orders(UserId); -- Composite index with UserId to speed up frequent queries regarding a specific user's transaction statuses. This assumes the Orders table has been created beforehand and is connected via foreign key constraint as shown above in create_orders_table.sql file (for performance reasons).