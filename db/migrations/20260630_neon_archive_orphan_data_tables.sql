-- SYNOPSIS: Database migration — 20260630_neon_archive_orphan_data_tables.sql.
-- Move legacy orphan tables (has rows, zero live code references) public → archive.
-- Verified by scripts/neon-schema-audit.mjs REVIEW tier 2026-06-29.
-- Restore: ALTER TABLE archive.<name> SET SCHEMA public;

CREATE SCHEMA IF NOT EXISTS archive;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'task_outputs',
    'compression_stats',
    'build_metrics',
    'orch_runs',
    'orch_claims',
    'builder_lock_receipts',
    'execution_log',
    'builder_queue_tasks',
    'shared_memory',
    'builder_partial_recovery_receipts',
    'orch_pods',
    'council_reviews',
    'build_requests',
    'builder_queue_runs',
    'approval_queue',
    'builder_conductor_sessions',
    'builder_founder_safe_mode',
    'debate_log',
    'self_tasks',
    'token_usage'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relkind = 'r'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA archive', t);
      RAISE NOTICE 'Archived orphan table: %', t;
    END IF;
  END LOOP;
END $$;
