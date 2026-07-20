-- SYNOPSIS: Cognitive Core Era-7 ("Calibrate Me") — compression + calibration loops.
-- #31 Decision Compression, #32 Calibration Dashboard, #33 Cross-domain Trust Transfer,
-- #34 High-stakes Auto-Tree trigger log, #35 Recalibration Rituals.
-- Soft-links only (no hard FKs across eras).

CREATE TABLE IF NOT EXISTS decision_heuristics (
  heuristic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  rule TEXT NOT NULL,
  when_to_use TEXT,
  when_not_to_use TEXT,
  domain TEXT,
  source TEXT NOT NULL DEFAULT 'induced'
    CHECK (source IN ('induced', 'legacy', 'imported', 'explicit')),
  activation_count INTEGER NOT NULL DEFAULT 0,
  hit_count INTEGER NOT NULL DEFAULT 0,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.4
    CHECK (confidence >= 0 AND confidence <= 1),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'retired', 'candidate')),
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_decision_heuristics_user
  ON decision_heuristics (user_id, status, confidence DESC);

CREATE TABLE IF NOT EXISTS calibration_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  domain TEXT,
  n INTEGER NOT NULL DEFAULT 0,
  accuracy DOUBLE PRECISION,
  brier_score DOUBLE PRECISION,
  overconfidence DOUBLE PRECISION,
  underconfidence DOUBLE PRECISION,
  delegation_tier TEXT,
  notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calibration_snapshots_user
  ON calibration_snapshots (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS trust_transfer_proposals (
  transfer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  from_domain TEXT NOT NULL,
  to_domain TEXT NOT NULL,
  proposed_tier TEXT NOT NULL DEFAULT 'ask'
    CHECK (proposed_tier IN ('refuse', 'ask', 'suggest', 'allow')),
  rationale TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_transfer_user
  ON trust_transfer_proposals (user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS high_stakes_tree_triggers (
  trigger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  decision_id UUID,
  question TEXT NOT NULL,
  stakes TEXT NOT NULL DEFAULT 'high'
    CHECK (stakes IN ('medium', 'high')),
  tree_id UUID,
  auto_fired BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_high_stakes_triggers_user
  ON high_stakes_tree_triggers (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS recalibration_rituals (
  ritual_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  trigger_kind TEXT NOT NULL DEFAULT 'manual'
    CHECK (trigger_kind IN ('manual', 'outcome', 'schedule', 'debt_threshold')),
  domain TEXT,
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  adjustments JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('draft', 'completed', 'skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recalibration_rituals_user
  ON recalibration_rituals (user_id, created_at DESC);
