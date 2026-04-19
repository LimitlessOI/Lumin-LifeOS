-- Migration: 20260418_lifeos_monetization
-- Bridges purpose_profiles.economic_paths → opt-in monetization + generated outreach.
-- Purpose discovery already produces economic_paths (JSONB array of {title, description,
-- market_demand, effort, revenue_potential}). Without explicit user opt-in nothing happens;
-- with opt-in the system can generate outreach tasks aligned to that path.
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

BEGIN;

-- 1. monetization_paths — per-path opt-in + status tracking
CREATE TABLE IF NOT EXISTS monetization_paths (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  path_index        INTEGER NOT NULL,                    -- index into purpose_profiles.economic_paths
  path_title        TEXT    NOT NULL,                    -- snapshot of title at opt-in
  path_description  TEXT,                                -- snapshot of description at opt-in
  market_demand     TEXT,                                -- snapshot
  effort            TEXT,                                -- snapshot
  revenue_potential TEXT,                                -- snapshot
  opted_in_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- user must explicitly opt-in
  opted_out_at      TIMESTAMPTZ,                         -- soft-delete; keeps history
  status            TEXT    NOT NULL DEFAULT 'active',   -- 'active' | 'paused' | 'archived'
  notes             TEXT,                                -- optional user note
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, path_index, opted_in_at)
);

CREATE INDEX IF NOT EXISTS idx_monetization_paths_user
  ON monetization_paths (user_id, status);

-- 2. monetization_outreach — generated outreach tasks per path (opt-in only gate)
CREATE TABLE IF NOT EXISTS monetization_outreach (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  path_id       BIGINT NOT NULL REFERENCES monetization_paths(id) ON DELETE CASCADE,
  task_type     TEXT    NOT NULL,                    -- 'outreach_email' | 'outreach_call' | 'content' | 'offer' | 'other'
  title         TEXT    NOT NULL,
  body          TEXT,                                -- draft body / talking points
  rationale     TEXT,                                -- why this task fits the path
  status        TEXT    NOT NULL DEFAULT 'draft',    -- 'draft' | 'approved' | 'sent' | 'declined' | 'archived'
  approved_at   TIMESTAMPTZ,
  sent_at       TIMESTAMPTZ,
  declined_at   TIMESTAMPTZ,
  source        TEXT    NOT NULL DEFAULT 'ai',       -- 'ai' | 'manual'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monetization_outreach_user
  ON monetization_outreach (user_id, status);
CREATE INDEX IF NOT EXISTS idx_monetization_outreach_path
  ON monetization_outreach (path_id);

COMMIT;
