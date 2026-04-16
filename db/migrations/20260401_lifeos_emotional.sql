-- Migration: 20260401_lifeos_emotional.sql
-- LifeOS Phase 5 — Emotional Intelligence + Parenting schema
-- Emotional patterns, parenting moments, repair actions, inner work effectiveness

BEGIN;

-- 1. emotional_patterns — recurring emotional patterns identified for a user
CREATE TABLE IF NOT EXISTS emotional_patterns (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  pattern_name          TEXT    NOT NULL,  -- e.g. 'defensive_when_criticized'
  trigger_description   TEXT,             -- what triggers this pattern
  response_description  TEXT,             -- what the person does when triggered
  frequency             TEXT    DEFAULT 'occasional',  -- 'rare'|'occasional'|'frequent'
  first_observed        DATE,
  last_observed         DATE,
  times_observed        INTEGER NOT NULL DEFAULT 1,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, pattern_name)
);

-- 2. parenting_moments — significant parenting interactions logged for debrief
CREATE TABLE IF NOT EXISTS parenting_moments (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  moment_date         DATE    NOT NULL DEFAULT CURRENT_DATE,
  child_name          TEXT,
  child_age_years     INTEGER,
  what_happened       TEXT    NOT NULL,
  user_response       TEXT,             -- what the parent did/said
  what_user_felt      TEXT,             -- emotional state during
  debrief_text        TEXT,             -- AI-generated debrief
  repair_path         TEXT,             -- specific repair suggestion
  generational_note   TEXT,             -- pattern the system identified
  repair_done         BOOLEAN NOT NULL DEFAULT FALSE,
  repair_done_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. repair_actions — logged repair actions after ruptures
CREATE TABLE IF NOT EXISTS repair_actions (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  context           TEXT    NOT NULL,  -- 'parenting'|'relationship'|'friendship'|'work'
  linked_moment_id  BIGINT,            -- references parenting_moments or conversation_debriefs
  what_i_did        TEXT    NOT NULL,
  how_it_landed     TEXT,              -- what happened when repair was attempted
  outcome           TEXT,              -- 'healed'|'partial'|'not_yet'|'rejected'
  repair_date       DATE    NOT NULL DEFAULT CURRENT_DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. inner_work_effectiveness — which practices correlate with behavior change
CREATE TABLE IF NOT EXISTS inner_work_effectiveness (
  id                                    BIGSERIAL PRIMARY KEY,
  user_id                               BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  practice_type                         TEXT    NOT NULL,
  commitment_follow_through_correlation NUMERIC(4,2),  -- 0-1
  integrity_score_correlation           NUMERIC(4,2),
  joy_score_correlation                 NUMERIC(4,2),
  observation                           TEXT,           -- AI-generated insight
  computed_at                           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, practice_type)
);

COMMIT;
