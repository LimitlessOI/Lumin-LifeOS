-- SYNOPSIS: Database migration — 20260704_create_conversation_messages.sql.
-- conversation_messages table for Life Coaching chat storage
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  role TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_role
  ON conversation_messages (role);