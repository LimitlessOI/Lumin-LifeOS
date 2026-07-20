-- SYNOPSIS: Cognitive Core — Outcome Oracle (closes the predict→observe loop from real receipts).
-- Layer A: resolve a decision's outcome from a deploy SHA / SENTRY / revert / CI receipt,
-- with provenance, no human retype. Adds a decide-gate audit log so the gate is load-bearing.
-- Depth on Era-1 (judgment) — NOT a new era. Judgment migration sorts first, so FK target exists.

-- Allow receipts to be a first-class outcome source (fail-closed: still never 'inferred').
ALTER TABLE judgment_outcomes DROP CONSTRAINT IF EXISTS judgment_outcomes_captured_how_check;
ALTER TABLE judgment_outcomes ADD CONSTRAINT judgment_outcomes_captured_how_check
  CHECK (captured_how IN ('explicit', 'deferred_review', 'chair_confirm', 'inferred_forbidden', 'receipt_verified'));

-- Provenance for every oracle-resolved outcome — which real receipt closed the loop.
CREATE TABLE IF NOT EXISTS judgment_receipt_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  decision_id UUID NOT NULL REFERENCES judgment_decisions(decision_id) ON DELETE CASCADE,
  receipt_kind TEXT NOT NULL
    CHECK (receipt_kind IN ('deploy', 'sentry', 'revert', 'ci', 'manual')),
  receipt_ref TEXT,
  verdict TEXT NOT NULL
    CHECK (verdict IN ('pass', 'fail', 'mixed', 'reverted')),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_judgment_receipt_links_user
  ON judgment_receipt_links (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_judgment_receipt_links_decision
  ON judgment_receipt_links (decision_id);

-- Every decide-gate call, auditable. Makes proceed/verify/abstain a real, logged action.
CREATE TABLE IF NOT EXISTS judgment_decide_log (
  decide_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'general',
  stated_prob DOUBLE PRECISION NOT NULL,
  recalibrated_prob DOUBLE PRECISION NOT NULL,
  stake DOUBLE PRECISION NOT NULL DEFAULT 1,
  threshold DOUBLE PRECISION NOT NULL,
  verdict TEXT NOT NULL
    CHECK (verdict IN ('proceed', 'verify', 'abstain')),
  n INTEGER NOT NULL DEFAULT 0,
  e_value DOUBLE PRECISION,
  applied_correction BOOLEAN NOT NULL DEFAULT FALSE,
  rationale TEXT,
  decision_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_judgment_decide_log_user
  ON judgment_decide_log (user_id, created_at DESC);
