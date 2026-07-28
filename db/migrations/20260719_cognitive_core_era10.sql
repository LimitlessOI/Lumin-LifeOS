-- SYNOPSIS: Cognitive Core Era-10 ("Multiply Me") — network, consensus, self-fix loop.
-- #46 Advisor Council Consensus, #47 Cohort Benchmark, #48 Judgment Replay Sim,
-- #49 Compound ROI Ledger, #50 Ship-Queue Bridge (findings → governed factory).
-- Soft-links only (no hard FKs across eras).

CREATE TABLE IF NOT EXISTS advisor_council_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  question TEXT NOT NULL,
  advisor_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  positions JSONB NOT NULL DEFAULT '[]'::jsonb,
  consensus TEXT,
  dissent JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.4
    CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advisor_council_user
  ON advisor_council_sessions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cohort_benchmarks (
  benchmark_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  user_accuracy DOUBLE PRECISION,
  user_brier DOUBLE PRECISION,
  cohort_accuracy DOUBLE PRECISION,
  cohort_brier DOUBLE PRECISION,
  percentile DOUBLE PRECISION,
  sample_note TEXT NOT NULL DEFAULT 'reference band is a hypothesis, not a peer leaderboard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cohort_benchmarks_user
  ON cohort_benchmarks (user_id, domain, created_at DESC);

CREATE TABLE IF NOT EXISTS judgment_replay_runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  decisions_replayed INTEGER NOT NULL DEFAULT 0,
  prior_accuracy DOUBLE PRECISION,
  replay_accuracy DOUBLE PRECISION,
  improvement DOUBLE PRECISION,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_judgment_replay_runs_user
  ON judgment_replay_runs (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS compound_roi_ledger (
  roi_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  metric TEXT NOT NULL DEFAULT 'accuracy_gain',
  baseline DOUBLE PRECISION,
  current_value DOUBLE PRECISION,
  gain DOUBLE PRECISION,
  window_days INTEGER NOT NULL DEFAULT 30,
  refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compound_roi_user
  ON compound_roi_ledger (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ship_queue_bridge_items (
  bridge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  source_kind TEXT NOT NULL
    CHECK (source_kind IN ('self_audit', 'improvement_proposal', 'drift', 'decay')),
  source_ref TEXT,
  title TEXT NOT NULL,
  proposed_change TEXT NOT NULL,
  target_file TEXT,
  queue_status TEXT NOT NULL DEFAULT 'staged'
    CHECK (queue_status IN ('staged', 'submitted', 'shipped', 'rejected')),
  governed BOOLEAN NOT NULL DEFAULT TRUE,
  refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ship_queue_bridge_user
  ON ship_queue_bridge_items (user_id, queue_status, created_at DESC);
