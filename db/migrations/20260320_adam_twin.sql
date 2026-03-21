-- Migration: 20260320_adam_twin
-- Tables for Adam's digital twin: decision log, profile, outcomes, improvement proposals

BEGIN;

-- ── Adam Decision Log ─────────────────────────────────────────────────────────
-- Every word Adam says, every decision he makes, captured forever.
CREATE TABLE IF NOT EXISTS adam_decisions (
  id              BIGSERIAL PRIMARY KEY,
  session_id      TEXT,                    -- groups decisions from one session
  event_type      TEXT NOT NULL,           -- 'idea_approved'|'idea_rejected'|'feedback'|'build_triggered'|'preference'|'conversation'|'override'
  subject         TEXT,                    -- what this decision is about (idea title, feature name, etc.)
  subject_id      TEXT,                    -- FK to ideas.id or other entity if applicable
  input_text      TEXT,                    -- what Adam said / the raw input
  decision        TEXT,                    -- the decision made (approve|reject|modify|defer)
  reasoning       TEXT,                    -- why (extracted or provided)
  context         JSONB,                   -- full context snapshot at time of decision
  tags            TEXT[],                  -- searchable tags (e.g. 'design', 'revenue', 'ux')
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adam_decisions_event ON adam_decisions (event_type);
CREATE INDEX IF NOT EXISTS idx_adam_decisions_session ON adam_decisions (session_id);
CREATE INDEX IF NOT EXISTS idx_adam_decisions_created ON adam_decisions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_adam_decisions_tags ON adam_decisions USING GIN (tags);

-- ── Adam Profile ──────────────────────────────────────────────────────────────
-- Living document of Adam's values, patterns, and decision heuristics.
-- Updated automatically as more decisions are logged.
CREATE TABLE IF NOT EXISTS adam_profile (
  id              BIGSERIAL PRIMARY KEY,
  version         INTEGER DEFAULT 1,
  profile         JSONB NOT NULL,          -- the full profile object
  summary         TEXT,                    -- plain-English summary of who Adam is
  decision_count  INTEGER DEFAULT 0,       -- how many decisions this profile is based on
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  is_current      BOOLEAN DEFAULT TRUE
);

-- Only one current profile at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_adam_profile_current ON adam_profile (is_current) WHERE is_current = TRUE;

-- ── Outcome Tracker ───────────────────────────────────────────────────────────
-- Did the thing we built actually work?
CREATE TABLE IF NOT EXISTS outcomes (
  id              BIGSERIAL PRIMARY KEY,
  idea_id         TEXT,                    -- references ideas.id
  feature_name    TEXT NOT NULL,
  metric_type     TEXT NOT NULL,           -- 'revenue'|'conversion'|'retention'|'time_saved'|'errors'|'usage'
  metric_value    NUMERIC,
  metric_unit     TEXT,                    -- '$'|'%'|'minutes'|'requests'|'users'
  before_value    NUMERIC,                 -- baseline before the feature
  after_value     NUMERIC,                 -- value after the feature shipped
  delta           NUMERIC GENERATED ALWAYS AS (after_value - before_value) STORED,
  delta_pct       NUMERIC,                 -- percentage change
  measurement_date TIMESTAMPTZ,
  notes           TEXT,
  verified        BOOLEAN DEFAULT FALSE,   -- Adam confirmed this is accurate
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outcomes_idea ON outcomes (idea_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_metric ON outcomes (metric_type, created_at DESC);

-- ── Improvement Proposals ─────────────────────────────────────────────────────
-- System-generated proposals for improvements, bugs found, optimizations.
-- Adam approves before anything is touched.
CREATE TABLE IF NOT EXISTS improvement_proposals (
  id              BIGSERIAL PRIMARY KEY,
  source          TEXT NOT NULL,           -- 'auto_monitor'|'quality_gate'|'error_log'|'adam'
  category        TEXT NOT NULL,           -- 'bug'|'performance'|'ux'|'revenue'|'security'|'refactor'
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  evidence        JSONB,                   -- what triggered this proposal (error count, metrics, etc.)
  proposed_fix    TEXT,                    -- what the system thinks should be done
  effort_estimate TEXT,                    -- 'minutes'|'hours'|'days'
  impact_estimate TEXT,                    -- 'low'|'medium'|'high'|'critical'
  status          TEXT DEFAULT 'pending',  -- 'pending'|'approved'|'rejected'|'implemented'|'deferred'
  approved_at     TIMESTAMPTZ,
  rejected_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  implemented_at  TIMESTAMPTZ,
  idea_id         TEXT,                    -- if promoted to a full idea
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_improvements_status ON improvement_proposals (status, impact_estimate);
CREATE INDEX IF NOT EXISTS idx_improvements_category ON improvement_proposals (category);

-- ── System Health Snapshots ───────────────────────────────────────────────────
-- Regular snapshots of system health for trend analysis.
CREATE TABLE IF NOT EXISTS system_health_log (
  id              BIGSERIAL PRIMARY KEY,
  error_count_1h  INTEGER,
  error_count_24h INTEGER,
  build_success_rate NUMERIC,
  avg_response_ms NUMERIC,
  queue_depth     INTEGER,
  deployed_count  INTEGER,
  pending_ideas   INTEGER,
  open_bugs       INTEGER,
  snapshot_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_log_time ON system_health_log (snapshot_at DESC);

COMMIT;
