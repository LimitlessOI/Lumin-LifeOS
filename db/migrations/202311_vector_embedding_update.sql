-- SYNOPSIS: Database migration — 202311_vector_embedding_update.sql.
-- @ssot docs/products/memory-system/PRODUCT_HOME.md
ALTER TABLE IF EXISTS embeddings
ADD COLUMN IF NOT EXISTS vector_embedding vector;