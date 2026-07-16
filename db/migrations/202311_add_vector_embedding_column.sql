-- SYNOPSIS: Database migration — 202311_add_vector_embedding_column.sql.
-- Migration script to add 'vector_embedding' column
-- This assumes you are using a PostgreSQL database with support for vector types, such as the 'cube' extension or a similar feature.

BEGIN;

-- Example for a table named 'items', adjust table names as needed
ALTER TABLE items
ADD COLUMN vector_embedding VECTOR; -- Replace VECTOR with the appropriate data type for your use case

-- Repeat the above ALTER TABLE statement for each applicable table
-- ALTER TABLE another_table
-- ADD COLUMN vector_embedding VECTOR;

COMMIT;
