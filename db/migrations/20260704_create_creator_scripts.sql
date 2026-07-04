-- SYNOPSIS: Database migration — 20260704_create_creator_scripts.sql.
-- CMOS-P1-003: Table for storing scripts for media content
-- Product: Creator Media OS

CREATE TABLE IF NOT EXISTS creator_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL,
  content_goal TEXT,
  format TEXT,
  script_text TEXT,
  hook_variants_json JSONB,
  cta_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_creator_scripts_channel_id
  ON creator_scripts (channel_id);