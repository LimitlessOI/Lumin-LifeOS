-- SYNOPSIS: Database migration — 20260601_builder_runtime_config.sql.
CREATE TABLE IF NOT EXISTS builder_runtime_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL DEFAULT 'run',
  updated_at timestamptz DEFAULT now(),
  updated_by text
);

CREATE TABLE IF NOT EXISTS builder_mode_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL,
  triggered_by text,
  receipt_payload jsonb,
  created_at timestamptz DEFAULT now()
);