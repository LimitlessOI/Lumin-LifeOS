-- SYNOPSIS: Database migration — 20260601_builder_runtime_config.sql.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS builder_runtime_config (
  id text PRIMARY KEY,
  mode text NOT NULL DEFAULT 'run',
  updated_at timestamptz DEFAULT now(),
  updated_by text
);

INSERT INTO builder_runtime_config (id, mode, updated_by)
VALUES ('builder_runtime_config_singleton', 'run', 'migration')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS builder_mode_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL,
  triggered_by text,
  receipt_payload jsonb,
  created_at timestamptz DEFAULT now()
);