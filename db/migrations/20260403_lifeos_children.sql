-- Migration: 20260403_lifeos_children.sql
-- LifeOS Phase 7 — Children's App schema
-- Child profiles, dreams, sessions, curiosity threads
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

BEGIN;

-- 1. child_profiles
CREATE TABLE IF NOT EXISTS child_profiles (
  id              BIGSERIAL PRIMARY KEY,
  parent_user_id  BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,
  birth_date      DATE,
  age_years       INTEGER,  -- computed from birth_date or manually set
  interests       TEXT[]  DEFAULT '{}',
  learning_style  TEXT,     -- 'visual'|'kinesthetic'|'auditory'|'reading'
  access_level    TEXT    NOT NULL DEFAULT 'guided',  -- 'guided'|'semi-independent'|'independent'
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. child_dreams
CREATE TABLE IF NOT EXISTS child_dreams (
  id              BIGSERIAL PRIMARY KEY,
  child_id        BIGINT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  title           TEXT    NOT NULL,
  description     TEXT,
  first_step      TEXT,        -- age-appropriate first step the system suggested
  progress_notes  TEXT[]  DEFAULT '{}',
  status          TEXT    NOT NULL DEFAULT 'active',  -- 'active'|'in_progress'|'completed'|'paused'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. child_sessions
CREATE TABLE IF NOT EXISTS child_sessions (
  id              BIGSERIAL PRIMARY KEY,
  child_id        BIGINT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  session_date    DATE    NOT NULL DEFAULT CURRENT_DATE,
  topic           TEXT,
  activity_type   TEXT,    -- 'curiosity_exploration'|'dream_building'|'story'|'game'|'learning'
  duration_min    INTEGER,
  summary         TEXT,    -- AI-generated session summary
  parent_visible  BOOLEAN NOT NULL DEFAULT TRUE,  -- always true: parents see everything
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. curiosity_threads
CREATE TABLE IF NOT EXISTS curiosity_threads (
  id                  BIGSERIAL PRIMARY KEY,
  child_id            BIGINT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  topic               TEXT    NOT NULL,
  depth_level         INTEGER NOT NULL DEFAULT 1,  -- 1=surface, 5=expert curious
  last_explored       DATE,
  exploration_notes   TEXT,
  connections         TEXT[]  DEFAULT '{}',  -- other topics this connects to (cross-domain)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(child_id, topic)
);

COMMIT;
