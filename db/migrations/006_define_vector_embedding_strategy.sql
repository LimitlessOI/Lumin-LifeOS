-- SYNOPSIS: Database migration — 006_define_vector_embedding_strategy.sql.
-- db/migrations/006_define_vector_embedding_strategy.sql
-- This file is intentionally a no-op. The vector embedding strategy is documented
-- in product homes and implemented at the application layer. Keeping it as a
-- migration-safe no-op prevents migration preflight failures.
DO $$
BEGIN
  -- no-op
END $$;
