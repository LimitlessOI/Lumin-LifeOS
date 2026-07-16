-- SYNOPSIS: Database migration — 202311_memory_category_taxonomy_update.sql.
   -- Create categories table
   CREATE TABLE IF NOT EXISTS memory_categories (
       id SERIAL PRIMARY KEY,
       name VARCHAR(255) NOT NULL,
       parent_id INT REFERENCES memory_categories(id) ON DELETE CASCADE,
       description TEXT
   );
   
   -- Add any additional indexes or constraints as needed
   CREATE INDEX IF NOT EXISTS idx_parent_id ON memory_categories(parent_id);
   