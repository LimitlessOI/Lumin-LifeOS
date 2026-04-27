-- Migration: decision_review_queue
-- Description: Create table for tracking scheduled decision reviews (30-day, 90-day, 1-year)

CREATE TABLE decision_review_queue (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    decision_log_id INTEGER REFERENCES decision_logs(id) ON DELETE SET NULL,
    review_due_at TIMESTAMPTZ NOT NULL,
    review_type TEXT NOT NULL CHECK (review_type IN ('30_day', '90_day', '1_year')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'skipped')),
    completed_at TIMESTAMPTZ,
    hindsight_notes TEXT,
    outcome_rating INTEGER CHECK (outcome_rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_decision_review_queue_user_due ON decision_review_queue(user_id, review_due_at);
CREATE INDEX idx_decision_review_queue_user_status ON decision_review_queue(user_id, status);

-- Comment for documentation
COMMENT ON TABLE decision_review_queue IS 'Scheduled reviews for decisions at 30-day, 90-day, and 1-year intervals';