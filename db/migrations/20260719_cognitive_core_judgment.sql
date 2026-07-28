-- SYNOPSIS: Cognitive Core Era-1 — decision journal, predictions, outcomes, miss reports, domain trust.
-- Aligns with Am 39 historian loop (decision/reason/prediction/outcome/lesson) for personal judgment.

CREATE TABLE IF NOT EXISTS judgment_decisions (
  decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'general',
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  situation_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  worn_capsule_ids TEXT[] NOT NULL DEFAULT '{}',
  stakes TEXT NOT NULL DEFAULT 'medium'
    CHECK (stakes IN ('low', 'medium', 'high')),
  source_surface TEXT,
  thread_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_judgment_decisions_user_created
  ON judgment_decisions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_judgment_decisions_domain
  ON judgment_decisions (user_id, domain);

CREATE TABLE IF NOT EXISTS judgment_predictions (
  prediction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES judgment_decisions(decision_id) ON DELETE CASCADE,
  predicted_option TEXT,
  predicted_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  activated_program_ids TEXT[] NOT NULL DEFAULT '{}',
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.5
    CHECK (confidence >= 0 AND confidence <= 1),
  tension_ledger JSONB NOT NULL DEFAULT '[]'::jsonb,
  synthesis_summary TEXT,
  compiler_version TEXT NOT NULL DEFAULT 'era1-v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_judgment_predictions_decision
  ON judgment_predictions (decision_id);

CREATE TABLE IF NOT EXISTS judgment_outcomes (
  outcome_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES judgment_decisions(decision_id) ON DELETE CASCADE,
  actual_option TEXT NOT NULL,
  stated_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  captured_how TEXT NOT NULL DEFAULT 'explicit'
    CHECK (captured_how IN ('explicit', 'deferred_review', 'chair_confirm', 'inferred_forbidden')),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (decision_id)
);

CREATE TABLE IF NOT EXISTS judgment_miss_reports (
  miss_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES judgment_decisions(decision_id) ON DELETE CASCADE,
  prediction_id UUID REFERENCES judgment_predictions(prediction_id) ON DELETE SET NULL,
  failure_class TEXT NOT NULL
    CHECK (failure_class IN (
      'missing_program',
      'known_not_activated',
      'activated_underweighted',
      'situation_misread',
      'novel_change'
    )),
  earliest_divergence TEXT,
  correction_hypothesis TEXT,
  retest_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_judgment_miss_decision
  ON judgment_miss_reports (decision_id);

CREATE TABLE IF NOT EXISTS judgment_trust_by_domain (
  user_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  correct_n INTEGER NOT NULL DEFAULT 0,
  accuracy DOUBLE PRECISION NOT NULL DEFAULT 0,
  brier_score DOUBLE PRECISION,
  delegation_tier TEXT NOT NULL DEFAULT 'refuse'
    CHECK (delegation_tier IN ('refuse', 'ask', 'suggest', 'allow')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, domain)
);
