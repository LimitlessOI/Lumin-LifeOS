-- Voice Rail — link staged founder commands to BuilderOS command-control jobs
BEGIN;

ALTER TABLE voice_rail_staged_commands
  ADD COLUMN IF NOT EXISTS command_control_job_id UUID,
  ADD COLUMN IF NOT EXISTS execution_receipt JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_voice_rail_staged_job
  ON voice_rail_staged_commands(command_control_job_id)
  WHERE command_control_job_id IS NOT NULL;

COMMIT;
