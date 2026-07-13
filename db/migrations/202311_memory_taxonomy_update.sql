-- SYNOPSIS: Database migration — 202311_memory_taxonomy_update.sql.
-- Add memory category taxonomy to conversation_memory
ALTER TABLE conversation_memory
ADD COLUMN IF NOT EXISTS memory_category TEXT;

-- Constrain memory_category to supported taxonomy values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_memory_memory_category_check'
  ) THEN
    ALTER TABLE conversation_memory
    ADD CONSTRAINT conversation_memory_memory_category_check
    CHECK (memory_category IN ('user_preference', 'decision', 'context', 'fact'));
  END IF;
END $$;

-- Index for filtering by taxonomy
CREATE INDEX IF NOT EXISTS idx_conversation_memory_memory_category
ON conversation_memory (memory_category);

-- Add memory category taxonomy to memory_capsules data as first-class column
ALTER TABLE memory_capsules
ADD COLUMN IF NOT EXISTS memory_category TEXT;

-- Constrain memory_category to supported taxonomy values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'memory_capsules_memory_category_check'
  ) THEN
    ALTER TABLE memory_capsules
    ADD CONSTRAINT memory_capsules_memory_category_check
    CHECK (memory_category IN ('user_preference', 'decision', 'context', 'fact'));
  END IF;
END $$;

-- Index for filtering by taxonomy
CREATE INDEX IF NOT EXISTS idx_memory_capsules_memory_category
ON memory_capsules (memory_category);