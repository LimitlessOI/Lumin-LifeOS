-- SYNOPSIS: Audit trail for judgment_outcomes — every prior state is preserved
-- before an overwrite, not silently lost. Closes a real integrity gap: outcomes
-- could previously be corrected with zero trace of what the old value was, when
-- it changed, or how many times. Founder directive (2026-07-20): "we cannot just
-- take AI at its word. We have to inspect what we expect."
CREATE TABLE IF NOT EXISTS judgment_outcome_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES judgment_decisions(decision_id) ON DELETE CASCADE,
  outcome_id UUID NOT NULL,
  prior_actual_option TEXT NOT NULL,
  prior_stated_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  prior_captured_how TEXT NOT NULL,
  prior_captured_at TIMESTAMPTZ NOT NULL,
  superseded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_by_actual_option TEXT,
  superseded_by_captured_how TEXT
);

CREATE INDEX IF NOT EXISTS idx_judgment_outcome_history_decision
  ON judgment_outcome_history (decision_id, superseded_at DESC);
