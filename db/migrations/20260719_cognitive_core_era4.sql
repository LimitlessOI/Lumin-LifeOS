-- SYNOPSIS: Cognitive Core Era-4 ("Trust Me") — earned delegation + inform/override.
-- #19 Expert Collaboration Mode, #20 Memory Compression, #21 Legacy Recorder,
-- #22 Apprenticeship Mode, #23 Delegation Confidence, #24 Autonomous Advisor.
-- Law 2: autonomy is earned from scoreboard evidence — never a flipped flag.
-- Soft-links decision_id (UUID, no hard FK) so ordering is independent of Era-1–3.

-- #19 Expert Collaboration — structured multi-advisor debate before synthesis.
CREATE TABLE IF NOT EXISTS expert_debates (
  debate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  decision_id UUID,
  question TEXT NOT NULL,
  advisor_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  rounds JSONB NOT NULL DEFAULT '[]'::jsonb,
  synthesis TEXT,
  tension_summary TEXT,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.4
    CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT NOT NULL DEFAULT 'explicit'
    CHECK (source IN ('explicit', 'judgment_turn', 'autonomous')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expert_debates_user
  ON expert_debates (user_id, created_at DESC);

-- #20 Memory Compression — evolving high-level mental models (not raw dumps).
CREATE TABLE IF NOT EXISTS mental_models (
  model_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  label TEXT NOT NULL,
  summary TEXT NOT NULL,
  domain TEXT,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.4
    CHECK (confidence >= 0 AND confidence <= 1),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'retired', 'superseded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mental_models_user
  ON mental_models (user_id, status);

-- #21 Legacy Recorder — principles / heuristics / stories / failures / lessons.
CREATE TABLE IF NOT EXISTS legacy_entries (
  entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'principle'
    CHECK (kind IN ('principle', 'heuristic', 'story', 'failure', 'lesson')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  domain TEXT,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.5
    CHECK (confidence >= 0 AND confidence <= 1),
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legacy_entries_user
  ON legacy_entries (user_id, kind, status);

-- #22 Apprenticeship Mode — teach the reasoning process, not just the conclusion.
CREATE TABLE IF NOT EXISTS apprenticeship_lessons (
  lesson_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  decision_id UUID,
  question TEXT,
  process_explanation TEXT NOT NULL,
  teachable_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  traps_to_avoid JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.4
    CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apprenticeship_user
  ON apprenticeship_lessons (user_id, created_at DESC);

-- #23 Delegation Confidence — approved scopes earned from scoreboard (Law 2).
CREATE TABLE IF NOT EXISTS delegation_scopes (
  scope_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  delegation_tier TEXT NOT NULL DEFAULT 'refuse'
    CHECK (delegation_tier IN ('refuse', 'ask', 'suggest', 'allow')),
  stakes_max TEXT NOT NULL DEFAULT 'low'
    CHECK (stakes_max IN ('low', 'medium', 'high')),
  approved_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  accuracy DOUBLE PRECISION,
  brier_score DOUBLE PRECISION,
  n INTEGER NOT NULL DEFAULT 0,
  founder_approved BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'revoked')),
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_delegation_scopes_user
  ON delegation_scopes (user_id, status);

-- #24 Autonomous Advisor — bounded actions, always logged, always overridable.
CREATE TABLE IF NOT EXISTS autonomous_actions (
  action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  decision_id UUID,
  proposed_action TEXT NOT NULL,
  reasoning TEXT,
  stakes TEXT NOT NULL DEFAULT 'low'
    CHECK (stakes IN ('low', 'medium', 'high')),
  can_act_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'informed', 'executed', 'overridden', 'refused')),
  override_note TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autonomous_actions_user
  ON autonomous_actions (user_id, status, created_at DESC);
