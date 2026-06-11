-- Voice Rail v1 — durable sessions (non-private only)
CREATE TABLE IF NOT EXISTS voice_rail_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'conversation',
  tag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_rail_sessions_user ON voice_rail_sessions(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS voice_rail_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES voice_rail_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  intent TEXT,
  is_interim BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_rail_messages_session ON voice_rail_messages(session_id, created_at ASC);

CREATE TABLE IF NOT EXISTS voice_rail_staged_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID,
  user_id BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  utterance TEXT NOT NULL,
  intent TEXT NOT NULL DEFAULT 'command',
  status TEXT NOT NULL DEFAULT 'staged',
  executed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_rail_staged_user ON voice_rail_staged_commands(user_id, created_at DESC);
