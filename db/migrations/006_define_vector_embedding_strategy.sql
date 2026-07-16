-- db/migrations/006_define_vector_embedding_strategy.sql
-- SYNOPSIS: Defines the vector embedding strategy by creating a table to store the chosen strategy.

-- This migration defines the vector embedding strategy by creating a table
-- to store the chosen strategy, allowing for flexibility between pgvector and Pinecone.

CREATE TABLE IF NOT EXISTS vector_embedding_strategy (
  id SERIAL PRIMARY KEY,
  strategy_name VARCHAR(50) NOT NULL CHECK (strategy_name IN ('pgvector', 'Pinecone')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert the default strategy. Adjust as necessary for your application.
INSERT INTO vector_embedding_strategy (strategy_name) VALUES ('pgvector');
-- To switch to Pinecone, use the following insert statement:
-- INSERT INTO vector_embedding_strategy (strategy_name) VALUES ('Pinecone');
