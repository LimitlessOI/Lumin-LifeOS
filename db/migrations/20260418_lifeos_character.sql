-- Migration: 20260418_lifeos_character
-- LifeOS Children's App — Character Building Module
-- Integrity, generosity, and courage taught through story and action.
-- No lectures. No grades. Only story-driven moments and a living evidence record.
--
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

BEGIN;

-- ── Character traits ─────────────────────────────────────────────────────────
-- Each child has a character profile tracking growth across 3 core virtues.
CREATE TABLE IF NOT EXISTS character_profiles (
  id             BIGSERIAL PRIMARY KEY,
  child_id       BIGINT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  integrity_pts  INT NOT NULL DEFAULT 0,
  generosity_pts INT NOT NULL DEFAULT 0,
  courage_pts    INT NOT NULL DEFAULT 0,
  level          INT NOT NULL DEFAULT 1,   -- overall character level (1–10)
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(child_id)
);

-- ── Character stories (AI-generated, trait-specific) ────────────────────────
CREATE TABLE IF NOT EXISTS character_stories (
  id           BIGSERIAL PRIMARY KEY,
  child_id     BIGINT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  trait        TEXT NOT NULL CHECK (trait IN ('integrity', 'generosity', 'courage')),
  title        TEXT NOT NULL,
  story_text   TEXT NOT NULL,    -- age-appropriate story with the child as protagonist
  choice_a     TEXT NOT NULL,    -- first decision option
  choice_b     TEXT NOT NULL,    -- second decision option
  good_choice  TEXT NOT NULL CHECK (good_choice IN ('a', 'b')),
  age_group    TEXT NOT NULL DEFAULT '6-9',  -- '4-5'|'6-9'|'10-12'|'13+'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_char_stories_child ON character_stories(child_id);
CREATE INDEX IF NOT EXISTS idx_char_stories_trait ON character_stories(trait);

-- ── Story responses (what the child chose + outcome) ────────────────────────
CREATE TABLE IF NOT EXISTS character_story_responses (
  id          BIGSERIAL PRIMARY KEY,
  story_id    BIGINT NOT NULL REFERENCES character_stories(id) ON DELETE CASCADE,
  child_id    BIGINT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  choice      TEXT NOT NULL CHECK (choice IN ('a', 'b')),
  pts_earned  INT NOT NULL DEFAULT 0,
  reflection  TEXT,   -- what the child said about their choice
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_char_responses_child ON character_story_responses(child_id);

-- ── Real-world character moments (parent-logged) ─────────────────────────────
-- When a parent sees their child act with courage, integrity, or generosity
-- in real life, they log it here. This is the evidence base — not the stories.
CREATE TABLE IF NOT EXISTS character_moments (
  id           BIGSERIAL PRIMARY KEY,
  child_id     BIGINT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  logged_by    BIGINT REFERENCES lifeos_users(id),  -- parent who logged it
  trait        TEXT NOT NULL CHECK (trait IN ('integrity', 'generosity', 'courage')),
  title        TEXT NOT NULL,        -- "Told the truth even when it was hard"
  description  TEXT,                 -- what happened
  pts_awarded  INT NOT NULL DEFAULT 5,
  celebrated   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_char_moments_child ON character_moments(child_id);

-- ── Seed character profiles for existing child profiles (if any) ─────────────
INSERT INTO character_profiles (child_id)
SELECT id FROM child_profiles
ON CONFLICT (child_id) DO NOTHING;

COMMIT;
