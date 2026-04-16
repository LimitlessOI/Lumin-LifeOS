-- Migration: 20260329_lifeos_healing
-- LifeOS Memory & Healing — grief therapy, regression therapy,
-- loved-one reconstruction, childhood home walkthrough, completion conversations,
-- inner child healing. All sessions are AI-assisted and therapeutically framed.
-- Requires professional therapeutic support disclaimer on every session start.

BEGIN;

-- Core healing sessions (all therapy types share this table)
CREATE TABLE IF NOT EXISTS healing_sessions (
  id                 BIGSERIAL PRIMARY KEY,
  user_id            BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  session_type       TEXT NOT NULL,   -- grief | regression | memory_walk | completion | inner_child | memorial
  title              TEXT,
  status             TEXT NOT NULL DEFAULT 'open',  -- open | complete | paused
  conversation       JSONB NOT NULL DEFAULT '[]',
  summary            TEXT,
  insights           JSONB,           -- extracted key moments / realizations
  professional_framing_shown BOOLEAN NOT NULL DEFAULT FALSE,
  consent_given      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_healing_sessions_user ON healing_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_healing_sessions_type ON healing_sessions(session_type);

-- Artifacts: photos, videos, audio provided by the user for reconstruction work
CREATE TABLE IF NOT EXISTS healing_artifacts (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  session_id     BIGINT REFERENCES healing_sessions(id) ON DELETE SET NULL,
  artifact_type  TEXT NOT NULL,  -- photo | video | audio | text_description
  subject        TEXT,           -- 'mom', 'childhood home', 'grandpa', etc.
  description    TEXT,           -- user's words about what this is
  url            TEXT,           -- stored file URL (user-uploaded)
  metadata       JSONB,          -- extracted details: approximate year, location, mood
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_healing_artifacts_user    ON healing_artifacts(user_id);
CREATE INDEX IF NOT EXISTS idx_healing_artifacts_session ON healing_artifacts(session_id);

-- AI-generated healing videos (extends future_videos pattern)
CREATE TABLE IF NOT EXISTS healing_videos (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  session_id        BIGINT REFERENCES healing_sessions(id) ON DELETE SET NULL,
  video_type        TEXT NOT NULL,  -- memorial | memory_reconstruction | inner_child | regression
  prompt            TEXT,
  script            TEXT,
  replicate_id      TEXT,
  status            TEXT NOT NULL DEFAULT 'queued',  -- queued | processing | completed | failed
  video_url         TEXT,
  duration_seconds  INT,
  ethical_framing   TEXT,  -- stored disclaimer shown alongside video
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_healing_videos_user    ON healing_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_healing_videos_session ON healing_videos(session_id);

-- Completion conversations: saying what was never said to someone who passed
CREATE TABLE IF NOT EXISTS completion_conversations (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  session_id        BIGINT REFERENCES healing_sessions(id) ON DELETE SET NULL,
  person_name       TEXT NOT NULL,
  relationship      TEXT,             -- 'mother', 'father', 'friend', etc.
  what_happened     TEXT,             -- brief context: "passed away 3 years ago, we never resolved..."
  unsaid_things     TEXT,             -- what the user wants to say
  ai_response       TEXT,             -- AI writing in voice of the person (clearly labeled as AI)
  user_reply        TEXT,
  felt_complete     BOOLEAN,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_completion_conversations_user ON completion_conversations(user_id);

-- Memory palace: significant memories anchored to a place or time
CREATE TABLE IF NOT EXISTS memory_palace (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  memory_title   TEXT NOT NULL,
  place          TEXT,          -- 'childhood bedroom', 'grandma's kitchen', etc.
  approximate_age INT,
  memory_text    TEXT,
  sensory_details JSONB,        -- { sights, sounds, smells, feels }
  emotion        TEXT,
  significance   TEXT,
  artifact_ids   BIGINT[],      -- linked healing_artifacts
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_memory_palace_user ON memory_palace(user_id);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_healing_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_healing_sessions_updated_at') THEN
    CREATE TRIGGER trg_healing_sessions_updated_at
      BEFORE UPDATE ON healing_sessions
      FOR EACH ROW EXECUTE FUNCTION update_healing_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_healing_videos_updated_at') THEN
    CREATE TRIGGER trg_healing_videos_updated_at
      BEFORE UPDATE ON healing_videos
      FOR EACH ROW EXECUTE FUNCTION update_healing_updated_at();
  END IF;
END;
$$;

COMMIT;
