-- SYNOPSIS: Founder intake queue for member product feedback (never builder execute).
CREATE TABLE IF NOT EXISTS lifeos_member_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER,
  handle TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  body TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'triaged', 'accepted', 'declined', 'archived')),
  operator_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lifeos_member_feedback_status_idx
  ON lifeos_member_feedback (status, created_at DESC);
