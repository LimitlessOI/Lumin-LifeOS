-- SYNOPSIS: Database migration — 006_define_vector_embedding_strategy.sql.
-- db/migrations/006_define_vector_embedding_strategy.sql

-- This migration defines the vector embedding strategy by creating a table
-- to store the chosen strategy, allowing for flexibility between pgvector and Pinecone.

CREATE TABLE IF NOT EXISTS vector_embedding_strategy (
  id SERIAL PRIMARY KEY,
  strategy_name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert the default strategy. Adjust as necessary for your application.
INSERT INTO vector_embedding_strategy (strategy_name) VALUES ('pgvector');
