-- Voice Rail — which department answered (ChC, Hist, SNT, …)
ALTER TABLE voice_rail_messages
  ADD COLUMN IF NOT EXISTS department TEXT;

CREATE INDEX IF NOT EXISTS idx_voice_rail_messages_dept
  ON voice_rail_messages (session_id, department)
  WHERE department IS NOT NULL;
