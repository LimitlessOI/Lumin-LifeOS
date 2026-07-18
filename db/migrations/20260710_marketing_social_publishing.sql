-- SYNOPSIS:
-- @ssot docs/products/marketingos/PRODUCT_HOME.md
-- Idempotent additive Phase 5 schema migration for MarketingOS social publishing support.
-- Creates:
--   1) marketing_social_connections
--   2) marketing_social_posting_templates
--   3) marketing_publish_records
-- No existing marketing_* tables are altered or dropped.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS marketing_social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'linkedin', 'x', 'facebook')),
  auth_mode TEXT NOT NULL DEFAULT 'browser_session' CHECK (auth_mode IN ('browser_session', 'oauth')),
  session_state_encrypted TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'expired', 'revoked', 'needs_human')),
  connected_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (owner_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_marketing_social_connections_owner_id
  ON marketing_social_connections (owner_id);

CREATE TABLE IF NOT EXISTS marketing_social_posting_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  goal_key TEXT NOT NULL,
  steps_json JSONB NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  last_verified_ok_at TIMESTAMPTZ,
  site_version_hint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (platform, goal_key)
);

CREATE TABLE IF NOT EXISTS marketing_publish_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  piece_id UUID NOT NULL REFERENCES marketing_content_pieces(id),
  platform TEXT NOT NULL,
  platform_post_id TEXT,
  published_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed', 'needs_human')),
  publisher_service TEXT NOT NULL DEFAULT 'browser_agent',
  error_detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_publish_records_piece_id
  ON marketing_publish_records (piece_id);

COMMIT;