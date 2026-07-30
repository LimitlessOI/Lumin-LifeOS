-- SYNOPSIS: Database migration — 001_create_vector_embedding.sql.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS vector_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding VECTOR(1536)
);

CREATE INDEX IF NOT EXISTS idx_vector_embeddings_embedding ON vector_embeddings USING HNSW (embedding vector_l2_ops);