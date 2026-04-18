CREATE TABLE IF NOT EXISTS lifeos_event_ingest_control (
  user_id BIGINT PRIMARY KEY REFERENCES lifeos_users(id) ON DELETE CASCADE,
  last_conversation_message_id BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
