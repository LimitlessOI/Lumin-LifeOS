-- SYNOPSIS: Database migration — 004_create_vector_embedding_strategy.sql.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS embeddings (
    id SERIAL PRIMARY KEY,
    vector VECTOR(3)
);