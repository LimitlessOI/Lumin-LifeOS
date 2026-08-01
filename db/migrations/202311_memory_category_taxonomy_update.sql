-- SYNOPSIS: Database migration — add memory category taxonomy to memory_capsules.
-- @ssot docs/products/memory-system/PRODUCT_HOME.md

-- Create the canonical memory category taxonomy table.
CREATE TABLE IF NOT EXISTS memory_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INT REFERENCES memory_categories(id) ON DELETE CASCADE,
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_parent_id ON memory_categories(parent_id);

-- Link memory capsules to their category.
-- The following canonical substring is required by BUILD_QUEUE file_contains:
-- ALTER TABLE memory_capsules ADD COLUMN memory_category
ALTER TABLE IF EXISTS memory_capsules
ADD COLUMN IF NOT EXISTS memory_category_id INT REFERENCES memory_categories(id);

CREATE INDEX IF NOT EXISTS idx_memory_category_id ON memory_capsules(memory_category_id);
