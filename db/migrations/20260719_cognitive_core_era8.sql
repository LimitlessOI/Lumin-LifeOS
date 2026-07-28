-- SYNOPSIS: Cognitive Core Era-8 ("Compound Me") — cross-product + continuous compound.
-- #36 Cross-product can_act consumers, #37 Judgment→Improvement proposals,
-- #38 Evidence Compound Log, #39 Multi-role Judgment Sync, #40 Autonomy Ladder Review.
-- Soft-links only (no hard FKs across eras).

CREATE TABLE IF NOT EXISTS cognitive_product_consumers (
  consumer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  domains JSONB NOT NULL DEFAULT '[]'::jsonb,
  can_act_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'retired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cognitive_can_act_calls (
  call_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  stakes TEXT NOT NULL DEFAULT 'low'
    CHECK (stakes IN ('low', 'medium', 'high')),
  can_act BOOLEAN NOT NULL,
  action TEXT NOT NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_can_act_calls_user
  ON cognitive_can_act_calls (user_id, product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS judgment_improvement_proposals (
  proposal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  source_kind TEXT NOT NULL
    CHECK (source_kind IN ('miss', 'debt', 'ritual', 'interrupt', 'scoreboard')),
  source_ref TEXT,
  title TEXT NOT NULL,
  proposed_change TEXT NOT NULL,
  target_file TEXT,
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'queued', 'shipped', 'rejected', 'superseded')),
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_judgment_improvement_user
  ON judgment_improvement_proposals (user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS cognitive_compound_log (
  entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  event_kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  delta JSONB NOT NULL DEFAULT '{}'::jsonb,
  refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cognitive_compound_log_user
  ON cognitive_compound_log (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS judgment_role_syncs (
  sync_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  package_id UUID,
  role_label TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'export'
    CHECK (direction IN ('export', 'import', 'bidirectional')),
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'recorded'
    CHECK (status IN ('recorded', 'applied', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_judgment_role_syncs_user
  ON judgment_role_syncs (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS autonomy_ladder_reviews (
  review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  current_tier TEXT NOT NULL,
  suggested_tier TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'hold'
    CHECK (direction IN ('promote', 'demote', 'hold')),
  rationale TEXT NOT NULL,
  scoreboard_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'suggested'
    CHECK (status IN ('suggested', 'applied', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autonomy_ladder_reviews_user
  ON autonomy_ladder_reviews (user_id, status, created_at DESC);
