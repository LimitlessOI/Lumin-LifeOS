-- SYNOPSIS: Database migration — 202311_schema_update.sql.
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE memory_capsules
ADD COLUMN IF NOT EXISTS embedding vector(1536);

ALTER TABLE working_memory_entries
ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX IF NOT EXISTS memory_capsules_embedding_idx
ON memory_capsules
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS working_memory_entries_embedding_idx
ON working_memory_entries
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);