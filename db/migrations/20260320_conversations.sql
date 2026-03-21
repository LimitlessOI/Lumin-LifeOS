-- Migration: 20260320_conversations
-- Stores all conversations: Claude Code sessions, server AI calls, and any other channel

BEGIN;

-- If the conversations table already exists (legacy schema), add the new columns
ALTER TABLE conversations ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE conversations ALTER COLUMN messages DROP NOT NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS project TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS key_decisions TEXT[];
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS topics TEXT[];
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create fresh if it doesn't exist at all
CREATE TABLE IF NOT EXISTS conversations (
  id              BIGSERIAL PRIMARY KEY,
  session_id      TEXT,                    -- source session UUID
  source          TEXT NOT NULL,           -- 'claude_code'|'council_api'|'webhook'|'manual'
  project         TEXT,                    -- project path or name
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  message_count   INTEGER DEFAULT 0,
  summary         TEXT,                    -- AI-generated summary of what was decided
  key_decisions   TEXT[],                  -- extracted decisions from the conversation
  topics          TEXT[],                  -- topics discussed
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id              BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
  session_id      TEXT NOT NULL,
  role            TEXT NOT NULL,           -- 'user'|'assistant'|'system'
  content         TEXT NOT NULL,
  message_index   INTEGER,                 -- position in conversation
  timestamp       TIMESTAMPTZ,
  metadata        JSONB,                   -- model used, tokens, tool calls, etc.
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations (session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations (source);
CREATE INDEX IF NOT EXISTS idx_conversations_started ON conversations (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_messages_conversation ON conversation_messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_messages_session ON conversation_messages (session_id);
CREATE INDEX IF NOT EXISTS idx_conv_messages_role ON conversation_messages (role);

-- Full text search on message content
CREATE INDEX IF NOT EXISTS idx_conv_messages_content_fts
  ON conversation_messages USING GIN (to_tsvector('english', content));

COMMIT;
