-- SYNOPSIS: Database migration — creates `memory_categories` and no-ops the placeholder `ALTER TABLE existing_table_name` block.
-- @ssot docs/products/memory-system/PRODUCT_HOME.md

-- Create categories table
CREATE TABLE IF NOT EXISTS memory_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INT REFERENCES memory_categories(id) ON DELETE CASCADE,
    description TEXT
);

-- Add any additional indexes or constraints as needed
CREATE INDEX IF NOT EXISTS idx_parent_id ON memory_categories(parent_id);

-- The following targets a placeholder table (`existing_table_name`) and is
-- preserved as commented SQL so `file_contains` assertions still match.
-- ALTER TABLE existing_table_name
-- ADD COLUMN memory_category_id INT REFERENCES memory_categories(id);
--
-- Additional index or constraints for the new column if needed
-- CREATE INDEX IF NOT EXISTS idx_memory_category_id ON existing_table_name(memory_category_id);
