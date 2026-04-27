CREATE TABLE IF NOT EXISTS decision_review_queue (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  decision_log_id BIGINT REFERENCES decision_logs(id) ON DELETE CASCADE,
  review_due_at TIMESTAMPTZ NOT NULL,
  review_type VARCHAR(16) NOT NULL CHECK (review_type IN ('30_day','90_day')),
  status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','skipped')),
  completed_at TIMESTAMPTZ,
  hindsight_notes TEXT,
  outcome_rating SMALLINT CHECK (outcome_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decision_review_user_due ON decision_review_queue(user_id, review_due_at) WHERE status='pending';