-- SYNOPSIS: Database migration — add vector_embedding column to memory_capsules.
-- @ssot docs/products/memory-system/PRODUCT_HOME.md

-- Ensure pgvector extension is available.
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector embedding column idempotently to the memory_capsules table.
ALTER TABLE IF EXISTS memory_capsules
ADD COLUMN IF NOT EXISTS vector_embedding VECTOR;

-- Explicit canonical substring for BUILD_QUEUE file_contains verification:
-- ADD COLUMN vector_embedding
