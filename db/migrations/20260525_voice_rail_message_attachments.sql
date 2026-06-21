-- SYNOPSIS: Database migration — 20260525_voice_rail_message_attachments.sql.
-- Voice Rail — optional file/image attachments on messages (JSON metadata + preview URLs)
ALTER TABLE voice_rail_messages
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_voice_rail_messages_attachments
  ON voice_rail_messages ((attachments IS NOT NULL AND attachments <> '[]'::jsonb))
  WHERE attachments <> '[]'::jsonb;
