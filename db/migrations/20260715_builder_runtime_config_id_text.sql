-- SYNOPSIS: Fix builder_runtime_config.id type from uuid to text and seed the sentinel row.
-- The original 20260601 migration recorded the table with id uuid on deployed DBs.
-- This migration idempotently aligns the column with the string sentinel used by
-- services/builder-runtime-mode-service.js (builder_runtime_config_singleton).

-- Only change the type if it is not already text; this is safe to re-run.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'builder_runtime_config'
      AND column_name = 'id'
      AND data_type != 'text'
  ) THEN
    ALTER TABLE builder_runtime_config ALTER COLUMN id TYPE text USING id::text;
  END IF;
END $$;

-- Ensure the sentinel row exists for the running mode service.
INSERT INTO builder_runtime_config (id, mode, updated_by, updated_at)
VALUES ('builder_runtime_config_singleton', 'run', 'migration', now())
ON CONFLICT (id) DO UPDATE SET
  mode = EXCLUDED.mode,
  updated_by = EXCLUDED.updated_by,
  updated_at = EXCLUDED.updated_at
WHERE builder_runtime_config.mode IS NULL;
