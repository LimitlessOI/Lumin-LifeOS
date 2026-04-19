-- Migration: 20260418_lifeos_chat
-- Lumin — LifeOS conversational AI interface
--
-- "Lumin" is the name of the AI you talk to anytime. Like Alexa, but it knows
-- everything about your life. You can ask it anything, tell it anything, and it
-- responds as a trusted advisor with full context of your LifeOS data.
--
-- Chat threads are persistent. Each thread has a topic/mode. Messages are stored
-- so Lumin can reference what was said and build on it over time.
-- The response variety + communication profile engines are applied to every reply.
--
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

BEGIN;

-- ── Chat threads ──────────────────────────────────────────────────────────────
-- A thread is a persistent conversation. You can have multiple threads
-- (general, finance, health, relationship, etc.) or just one ongoing one.
CREATE TABLE IF NOT EXISTS lumin_threads (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  title        TEXT,                          -- auto-generated from first message
  mode         TEXT NOT NULL DEFAULT 'general'
               CHECK (mode IN (
                 'general',       -- anything goes
                 'mirror',        -- daily reflection
                 'coach',         -- focused coaching session
                 'finance',       -- financial clarity
                 'relationship',  -- relationship / conflict
                 'health',        -- health + energy
                 'planning'       -- weekly / goal planning
               )),
  pinned       BOOLEAN NOT NULL DEFAULT FALSE,
  archived     BOOLEAN NOT NULL DEFAULT FALSE,
  last_message_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lumin_threads_user ON lumin_threads(user_id, last_message_at DESC);

-- ── Messages ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lumin_messages (
  id          BIGSERIAL PRIMARY KEY,
  thread_id   BIGINT NOT NULL REFERENCES lumin_threads(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content     TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text'
              CHECK (content_type IN ('text', 'voice_transcript', 'image')),
  tokens_used  INT,
  model_used   TEXT,
  reaction     TEXT,    -- 'thumbs_up' | 'thumbs_down' | null (feedback signal)
  pinned       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lumin_messages_thread ON lumin_messages(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_lumin_messages_user ON lumin_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lumin_messages_pinned ON lumin_messages(thread_id) WHERE pinned = TRUE;

-- ── Message search (full-text) ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_lumin_messages_fts
  ON lumin_messages USING gin(to_tsvector('english', content));

COMMIT;
