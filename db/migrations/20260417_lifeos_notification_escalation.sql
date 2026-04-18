-- LifeOS notification escalation support.
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

ALTER TABLE lifeos_notification_queue
  ADD COLUMN IF NOT EXISTS escalation_group TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_lifeos_notif_escalation_group
  ON lifeos_notification_queue (escalation_group)
  WHERE escalation_group IS NOT NULL;
