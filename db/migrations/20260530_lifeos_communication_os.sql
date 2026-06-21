-- SYNOPSIS: Database migration — 20260530_lifeos_communication_os.sql.
-- LifeOS Communication OS — extended comm memory (NOT epistemic_facts / BuilderOS proof memory)
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

ALTER TABLE command_center_communications
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS contributors JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS linked_projects JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS linked_amendments JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS linked_builds JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS meeting_transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS identity_json JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_cc_comm_topic ON command_center_communications(topic);
CREATE INDEX IF NOT EXISTS idx_cc_comm_tags ON command_center_communications USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_cc_comm_participants ON command_center_communications USING GIN (participants);
