-- SYNOPSIS: Database migration — 20260624_coaching_conversation_monitor.sql.
CREATE TABLE IF NOT EXISTS lifeos_coaching_monitor_control (
  user_id BIGINT PRIMARY KEY REFERENCES lifeos_users(id) ON DELETE CASCADE,
  last_conversation_message_id BIGINT NOT NULL DEFAULT 0,
  last_scan_at TIMESTAMPTZ,
  last_lesson_count INTEGER NOT NULL DEFAULT 0,
  last_commitment_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaching_monitor_updated
  ON lifeos_coaching_monitor_control(updated_at DESC);
