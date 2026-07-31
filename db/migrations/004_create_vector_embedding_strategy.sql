-- SYNOPSIS: Database migration — 004_create_vector_embedding_strategy.sql.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name TEXT NOT NULL,
    text_content TEXT NOT NULL,
    embedding VECTOR(1536) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_embeddings_model_name ON embeddings (model_name);
CREATE INDEX IF NOT EXISTS idx_embeddings_created_at ON embeddings (created_at);