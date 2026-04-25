-- Amendment 36 — Horizon (competitive / landscape) + Red-team (supply-chain) intel lanes

CREATE TABLE IF NOT EXISTS lane_intel_runs (
  id BIGSERIAL PRIMARY KEY,
  lane TEXT NOT NULL CHECK (lane IN ('horizon', 'redteam')),
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  meta JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE TABLE IF NOT EXISTS lane_intel_findings (
  id BIGSERIAL PRIMARY KEY,
  run_id BIGINT NOT NULL REFERENCES lane_intel_runs (id) ON DELETE CASCADE,
  lane TEXT NOT NULL CHECK (lane IN ('horizon', 'redteam')),
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  sources JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lane_intel_runs_lane_time
  ON lane_intel_runs (lane, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_lane_intel_findings_lane_time
  ON lane_intel_findings (lane, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lane_intel_findings_run
  ON lane_intel_findings (run_id);
