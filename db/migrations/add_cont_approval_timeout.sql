-- SYNOPSIS: Database migration — add_cont_approval_timeout.sql
-- Adds the approvals table and a 48-hour auto-reject trigger.
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID,
  subject_id UUID,
  scope TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_approvals_status_created ON approvals(status, created_at);
ALTER TABLE approvals DROP COLUMN IF EXISTS approval_timeout;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS approval_timeout TIMESTAMPTZ;
CREATE OR REPLACE FUNCTION auto_reject_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' AND NEW.created_at + INTERVAL '48 hours' <= NOW() THEN
    NEW.status = 'rejected';
    NEW.approval_timeout = NEW.created_at + INTERVAL '48 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS auto_reject_approval_trigger ON approvals;
CREATE TRIGGER auto_reject_approval_trigger
BEFORE INSERT OR UPDATE ON approvals
FOR EACH ROW
EXECUTE FUNCTION auto_reject_approval();
UPDATE approvals
SET status = 'rejected',
    approval_timeout = created_at + INTERVAL '48 hours'
WHERE status = 'pending'
  AND created_at + INTERVAL '48 hours' <= NOW();