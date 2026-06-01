-- Command Center C2 Communication Layer v1
-- Typed/threaded communication history for real C2-backed operator messaging
-- @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md

ALTER TABLE command_center_communications
  ADD COLUMN IF NOT EXISTS thread_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS thread_title TEXT,
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'exchange',
  ADD COLUMN IF NOT EXISTS transport TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'recorded',
  ADD COLUMN IF NOT EXISTS selected_voice TEXT,
  ADD COLUMN IF NOT EXISTS playback_rate NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS explicit_send BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS parent_message_id UUID,
  ADD COLUMN IF NOT EXISTS command_control_job_id UUID;

CREATE INDEX IF NOT EXISTS idx_cc_comm_thread_created
  ON command_center_communications(thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cc_comm_message_type
  ON command_center_communications(message_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cc_comm_status
  ON command_center_communications(status, created_at DESC);
