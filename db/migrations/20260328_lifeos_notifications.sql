-- Migration: 20260328_lifeos_notifications
-- LifeOS notification queue and delivery log
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

BEGIN;

CREATE TABLE IF NOT EXISTS lifeos_notification_queue (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  -- 'commitment_prod'|'integrity_alert'|'joy_checkin_reminder'|'hard_truth'|'emergency'|'outreach_result'
  channel         TEXT NOT NULL DEFAULT 'overlay',
  -- 'overlay'|'sms'|'push'
  subject_id      BIGINT,       -- commitment_id, mirror_id, etc.
  subject_type    TEXT,
  message         TEXT NOT NULL,
  priority        INTEGER DEFAULT 5,  -- 1=emergency, 5=normal, 10=low
  status          TEXT NOT NULL DEFAULT 'pending',
  -- 'pending'|'delivered'|'acknowledged'|'failed'|'skipped'
  scheduled_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at    TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  failed_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifeos_notif_pending  ON lifeos_notification_queue (user_id, status, scheduled_at) WHERE status='pending';
CREATE INDEX IF NOT EXISTS idx_lifeos_notif_type     ON lifeos_notification_queue (user_id, type);

COMMIT;
