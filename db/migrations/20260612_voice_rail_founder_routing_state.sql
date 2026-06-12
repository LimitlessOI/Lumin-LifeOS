-- Voice Rail — founder session routing state (tier boost / escalation memory)
BEGIN;

ALTER TABLE voice_rail_sessions
  ADD COLUMN IF NOT EXISTS founder_routing_state JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMIT;
