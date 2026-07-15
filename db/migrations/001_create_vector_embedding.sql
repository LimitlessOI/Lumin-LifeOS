-- SYNOPSIS: Database migration — 001_create_vector_embedding.sql.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS vector_embeddings (
    id SERIAL PRIMARY KEY,
    embedding VECTOR(1536),
    metadata JSONB
);