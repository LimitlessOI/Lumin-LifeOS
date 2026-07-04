-- SYNOPSIS: Database migration — 20260704_create_memory_capsules.sql.
-- MS-P1-001 repair: assert the canonical capsule schema before adding indexes.

DO $$
BEGIN
  IF to_regclass('public.memory_capsules') IS NULL THEN
    RAISE EXCEPTION
      'memory_capsules is missing; expected db/migrations/20260521_memory_capsule_core.sql to create the canonical capsule_id schema first';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'memory_capsules'
      AND column_name = 'capsule_id'
  ) THEN
    RAISE EXCEPTION
      'memory_capsules has an incompatible schema; expected canonical capsule_id primary key';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'memory_capsules'
      AND column_name = 'owner_id'
  ) THEN
    RAISE EXCEPTION
      'memory_capsules has obsolete owner_id schema from a duplicate migration; repair manually before continuing';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_memory_capsules_created_at
  ON memory_capsules (created_at);

CREATE INDEX IF NOT EXISTS idx_memory_capsules_fact_id
  ON memory_capsules (fact_id);

CREATE INDEX IF NOT EXISTS idx_memory_capsules_trust_level
  ON memory_capsules (trust_level);