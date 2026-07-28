-- SYNOPSIS: Cognitive Core Era-2 ("Improve Me") — programs (deep patterns as hypotheses),
-- program activations, decision replay, counterfactuals, relationship twins, learning style.
-- Law 1: every model is a hypothesis (confidence, evidence, change trajectory) — never truth.
-- Soft-links decision_id (UUID, no hard FK) so this migration is order-independent of the
-- Era-1 judgment migration on a fresh database (auto-runner sorts alphabetically).

-- Layer 2 — Programs: deep recurring mechanisms modeled as evolving hypotheses.
CREATE TABLE IF NOT EXISTS judgment_programs (
  program_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  label TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  origin TEXT,
  triggers JSONB NOT NULL DEFAULT '[]'::jsonb,
  typical_behavior TEXT,
  protective_purpose TEXT,
  current_cost TEXT,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.3
    CHECK (confidence >= 0 AND confidence <= 1),
  evidence_for JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_against JSONB NOT NULL DEFAULT '[]'::jsonb,
  change_trajectory TEXT NOT NULL DEFAULT 'stable'
    CHECK (change_trajectory IN ('strengthening', 'stable', 'weakening', 'context_dependent')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'retired')),
  domain TEXT,
  last_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_judgment_programs_user_status
  ON judgment_programs (user_id, status);

-- Program activations: which programs the compiler believes drove a given decision.
CREATE TABLE IF NOT EXISTS judgment_program_activations (
  activation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES judgment_programs(program_id) ON DELETE CASCADE,
  decision_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  weight DOUBLE PRECISION NOT NULL DEFAULT 0.5
    CHECK (weight >= 0 AND weight <= 1),
  explained_outcome BOOLEAN,
  source TEXT NOT NULL DEFAULT 'prediction'
    CHECK (source IN ('prediction', 'miss_loop')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_program_activations_decision
  ON judgment_program_activations (decision_id);
CREATE INDEX IF NOT EXISTS idx_program_activations_program
  ON judgment_program_activations (program_id);

-- Decision replay: re-run a past decision with today's programs/knowledge.
CREATE TABLE IF NOT EXISTS judgment_replays (
  replay_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  todays_prediction TEXT,
  would_change BOOLEAN NOT NULL DEFAULT FALSE,
  what_changed TEXT,
  programs_now JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.5
    CHECK (confidence >= 0 AND confidence <= 1),
  compiler_version TEXT NOT NULL DEFAULT 'era2-v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_judgment_replays_decision
  ON judgment_replays (decision_id);

-- Counterfactual engine: plausible second/third-order effects of the road not taken.
CREATE TABLE IF NOT EXISTS judgment_counterfactuals (
  cf_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  alternative_option TEXT NOT NULL,
  second_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  third_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  net_assessment TEXT,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.4
    CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_judgment_counterfactuals_decision
  ON judgment_counterfactuals (decision_id);

-- Relationship twins: hypotheses about people the user interacts with (never "truth").
CREATE TABLE IF NOT EXISTS relationship_twins (
  twin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  person_label TEXT NOT NULL,
  relationship TEXT,
  communication_style TEXT,
  values_hypotheses JSONB NOT NULL DEFAULT '[]'::jsonb,
  triggers JSONB NOT NULL DEFAULT '[]'::jsonb,
  what_works JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.3
    CHECK (confidence >= 0 AND confidence <= 1),
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, person_label)
);

CREATE INDEX IF NOT EXISTS idx_relationship_twins_user
  ON relationship_twins (user_id);

-- Learning-style model: how the user actually learns best (modality hypotheses).
CREATE TABLE IF NOT EXISTS learning_style_profile (
  user_id TEXT PRIMARY KEY,
  modality_hypotheses JSONB NOT NULL DEFAULT '{}'::jsonb,
  best_via TEXT,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.3
    CHECK (confidence >= 0 AND confidence <= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
