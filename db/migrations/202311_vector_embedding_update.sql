-- SYNOPSIS: Database migration — 202311_vector_embedding_update.sql.
-- Migration script to add a vector embedding column to the specified table.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'your_actual_table_name'
    AND column_name = 'vector_embedding'
  ) THEN
    ALTER TABLE your_actual_table_name ADD COLUMN vector_embedding VECTOR;
  END IF;
END $$;
