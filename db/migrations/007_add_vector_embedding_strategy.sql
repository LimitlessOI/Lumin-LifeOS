-- SYNOPSIS: Database migration — 007_add_vector_embedding_strategy.sql.
CREATE TABLE IF NOT EXISTS vector_embeddings (
    id SERIAL PRIMARY KEY,
    embedding VECTOR(256), -- Adjust the dimension size as necessary
    metadata JSONB
);
