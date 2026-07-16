-- SYNOPSIS: Database migration — 202311_vector_embedding_update.sql.
-- Placeholder migration from a template — safely no-ops until the target table is known.
-- If a real table needs a vector_embedding column, add the specific table name below.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'your_table_name'
  ) THEN
    ALTER TABLE your_table_name ADD COLUMN IF NOT EXISTS vector_embedding VECTOR;
  END IF;
END $$;