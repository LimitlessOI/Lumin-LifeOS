-- Migration: 20260331_lifeos_family.sql
-- LifeOS Phase 4 — Family OS schema
-- Household links, shared commitments, relationship check-ins, conversation debriefs

BEGIN;

-- 1. household_links — links two lifeos_users together
CREATE TABLE IF NOT EXISTS household_links (
  id              BIGSERIAL PRIMARY KEY,
  user_id_a       BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  user_id_b       BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  relationship    TEXT    NOT NULL DEFAULT 'partner',  -- 'partner'|'family'|'friend'
  permissions     JSONB   NOT NULL DEFAULT '{}',        -- {a_sees_b: ['commitments','joy'], b_sees_a: [...]}
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id_a, user_id_b)
);

-- 2. shared_commitments — commitments shared to household view
CREATE TABLE IF NOT EXISTS shared_commitments (
  id                    BIGSERIAL PRIMARY KEY,
  commitment_id         BIGINT NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
  shared_with_user_id   BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  shared_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(commitment_id, shared_with_user_id)
);

-- 3. relationship_checkins — periodic relationship health pulse
CREATE TABLE IF NOT EXISTS relationship_checkins (
  id                    BIGSERIAL PRIMARY KEY,
  initiator_user_id     BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  partner_user_id       BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  checkin_date          DATE    NOT NULL DEFAULT CURRENT_DATE,
  connection_score      INTEGER CHECK (connection_score BETWEEN 1 AND 10),
  conflict_level        INTEGER CHECK (conflict_level BETWEEN 1 AND 10),
  what_is_working       TEXT,
  what_needs_attention  TEXT,
  gratitude_note        TEXT,
  private               BOOLEAN NOT NULL DEFAULT TRUE,  -- only visible to both partners
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. conversation_debriefs — post-conversation AI analysis (private per user)
CREATE TABLE IF NOT EXISTS conversation_debriefs (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  debrief_date          DATE    NOT NULL DEFAULT CURRENT_DATE,
  conversation_context  TEXT    NOT NULL,  -- what the user said happened
  what_was_said         TEXT,
  underlying_need       TEXT,              -- what each person was actually needing
  emotional_tone        TEXT,
  ai_insight            TEXT,              -- system analysis
  repair_path           TEXT,              -- specific repair suggestion
  user_acknowledged     BOOLEAN NOT NULL DEFAULT FALSE,
  private               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
