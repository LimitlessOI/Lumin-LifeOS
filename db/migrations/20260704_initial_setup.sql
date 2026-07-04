-- SYNOPSIS: Database migration — 20260704_initial_setup.sql.
-- Universal Overlay
-- Blueprint step: UO-P1-001
-- Purpose: Create tables for storing user context and interaction data with the overlay.

CREATE TABLE IF NOT EXISTS overlay_user_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  context JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS overlay_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  interaction_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_overlay_user_context_owner_id
  ON overlay_user_context (owner_id);

CREATE INDEX IF NOT EXISTS idx_overlay_user_context_created_at
  ON overlay_user_context (created_at);

CREATE INDEX IF NOT EXISTS idx_overlay_interactions_owner_id
  ON overlay_interactions (owner_id);

CREATE INDEX IF NOT EXISTS idx_overlay_interactions_created_at
  ON overlay_interactions (created_at);