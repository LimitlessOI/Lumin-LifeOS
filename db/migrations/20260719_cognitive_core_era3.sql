-- SYNOPSIS: Cognitive Core Era-3 ("Extend Me") — proactive partner surfaces.
-- Value drift monitor (#14), consequence simulator (#15), missing-information detector (#16),
-- idea evolution graph (#17), curiosity engine (#18), energy/performance model (#13).
-- Law 1: values, drift, energy windows, idea links are all HYPOTHESES with confidence/evidence.
-- Soft-links decision_id (UUID, no hard FK) so ordering is independent of Era-1/2 migrations.

-- #14 Value Drift Monitor — stated long-term principles (hypotheses) + divergence events.
CREATE TABLE IF NOT EXISTS judgment_values (
  value_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  principle TEXT NOT NULL,
  hypothesis TEXT,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.4
    CHECK (confidence >= 0 AND confidence <= 1),
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'stated'
    CHECK (source IN ('stated', 'revealed', 'inferred')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'retired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_judgment_values_user
  ON judgment_values (user_id, status);

CREATE TABLE IF NOT EXISTS value_drift_events (
  drift_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  decision_id UUID,
  value_id UUID REFERENCES judgment_values(value_id) ON DELETE SET NULL,
  principle TEXT,
  drift_description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low'
    CHECK (severity IN ('low', 'medium', 'high')),
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_value_drift_user
  ON value_drift_events (user_id, resolved);

-- #15 Consequence Simulator — PROSPECTIVE 2nd/3rd-order effects of an option on the table
-- (distinct from Era-2 counterfactuals, which are retrospective on the road not taken).
CREATE TABLE IF NOT EXISTS consequence_maps (
  map_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID,
  user_id TEXT NOT NULL,
  option TEXT NOT NULL,
  second_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  third_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  watch_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.4
    CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT NOT NULL DEFAULT 'judgment_turn'
    CHECK (source IN ('judgment_turn', 'explicit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consequence_maps_decision
  ON consequence_maps (decision_id);

-- #16 Missing Information Detector — the most valuable facts missing before deciding.
CREATE TABLE IF NOT EXISTS missing_info_findings (
  finding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID,
  user_id TEXT NOT NULL,
  missing_facts JSONB NOT NULL DEFAULT '[]'::jsonb,
  most_valuable TEXT,
  cheapest_way_to_learn TEXT,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.5
    CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_missing_info_decision
  ON missing_info_findings (decision_id);

-- #17 Idea Evolution Graph — where ideas came from, how they morphed/combined into breakthroughs.
CREATE TABLE IF NOT EXISTS idea_nodes (
  idea_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  origin TEXT,
  status TEXT NOT NULL DEFAULT 'seed'
    CHECK (status IN ('seed', 'evolving', 'breakthrough', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idea_nodes_user
  ON idea_nodes (user_id, status);

CREATE TABLE IF NOT EXISTS idea_edges (
  edge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  from_idea UUID NOT NULL REFERENCES idea_nodes(idea_id) ON DELETE CASCADE,
  to_idea UUID NOT NULL REFERENCES idea_nodes(idea_id) ON DELETE CASCADE,
  relation TEXT NOT NULL DEFAULT 'mutation'
    CHECK (relation IN ('mutation', 'combination', 'contradiction', 'breakthrough')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idea_edges_from ON idea_edges (from_idea);
CREATE INDEX IF NOT EXISTS idx_idea_edges_to ON idea_edges (to_idea);

-- #18 Curiosity Engine — learning targeted at current knowledge gaps (from misses + weak programs).
CREATE TABLE IF NOT EXISTS curiosity_prompts (
  prompt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  gap_source TEXT,
  topic TEXT NOT NULL,
  why TEXT,
  suggested_action TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'explored', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curiosity_user
  ON curiosity_prompts (user_id, status);

-- #13 Energy & Performance Model — hypothesized decision-quality windows (cache of computed advisory).
CREATE TABLE IF NOT EXISTS decision_energy_profile (
  user_id TEXT PRIMARY KEY,
  best_windows JSONB NOT NULL DEFAULT '[]'::jsonb,
  worst_windows JSONB NOT NULL DEFAULT '[]'::jsonb,
  degradation_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  n INTEGER NOT NULL DEFAULT 0,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.2
    CHECK (confidence >= 0 AND confidence <= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
