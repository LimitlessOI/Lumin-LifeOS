-- SYNOPSIS: Database migration — 20260630_neon_archive_abandoned_tables.sql.
-- Move empty abandoned prototype tables from public → archive schema (reversible, not DROP).
-- Generated from neon-schema-audit ARCHIVE_CANDIDATE tier (empty + no live code reference).
-- Restore: ALTER TABLE archive.<name> SET SCHEMA public;

CREATE SCHEMA IF NOT EXISTS archive;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'agent_decisions',
    'ai_usage_log',
    'air_corridors',
    'build_steps',
    'builder_decisions',
    'code_deployments',
    'conversation_archive',
    'conversation_ideas',
    'conversation_mining',
    'crypto_portfolio',
    'decision_history',
    'delivery_missions',
    'drone_fleet',
    'extracted_features',
    'file_storage',
    'idea_deduplication',
    'ip_vault_audit_log',
    'landing_pads',
    'missed_calls',
    'overlay_states',
    'performance_baselines',
    'real_estate_properties',
    'roadmap_items',
    'session_dicts',
    'subconscious',
    'system_logs',
    'tco_savings_summary',
    'ubi_distributions',
    'ubi_users'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relkind = 'r'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA archive', t);
      RAISE NOTICE 'Archived table: %', t;
    END IF;
  END LOOP;
END $$;
