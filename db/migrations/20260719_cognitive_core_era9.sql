-- SYNOPSIS: Cognitive Core Era-9 ("Govern Me") — self-governance + integrity audit.
-- #41 Integrity Auditor, #42 Constitutional Conformance, #43 Calibration Decay,
-- #44 Compiler Drift Ledger, #45 Self-Audit Findings → fixes.
-- Law 3: the compiler audits itself; findings carry proposed fixes (SENTRY doctrine).
-- Soft-links only (no hard FKs across eras).

CREATE TABLE IF NOT EXISTS integrity_audits (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'full'
    CHECK (scope IN ('full', 'calibration', 'honesty', 'law_conformance')),
  passed BOOLEAN NOT NULL DEFAULT TRUE,
  findings_n INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrity_audits_user
  ON integrity_audits (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS constitutional_checks (
  check_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  law TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pass'
    CHECK (status IN ('pass', 'warn', 'fail')),
  evidence TEXT,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  audit_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_constitutional_checks_user
  ON constitutional_checks (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS calibration_decay_events (
  decay_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  metric TEXT NOT NULL DEFAULT 'accuracy'
    CHECK (metric IN ('accuracy', 'brier_score')),
  prev_value DOUBLE PRECISION,
  curr_value DOUBLE PRECISION,
  delta DOUBLE PRECISION,
  severity TEXT NOT NULL DEFAULT 'low'
    CHECK (severity IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calibration_decay_user
  ON calibration_decay_events (user_id, domain, created_at DESC);

CREATE TABLE IF NOT EXISTS compiler_drift_ledger (
  drift_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL
    CHECK (kind IN (
      'calibration_decay', 'honesty_gap', 'law_violation',
      'stale_hypothesis', 'unresolved_debt', 'config_over_evidence'
    )),
  summary TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low'
    CHECK (severity IN ('low', 'medium', 'high')),
  refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compiler_drift_user
  ON compiler_drift_ledger (user_id, resolved, created_at DESC);

CREATE TABLE IF NOT EXISTS self_audit_findings (
  finding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  audit_id UUID,
  title TEXT NOT NULL,
  finding TEXT NOT NULL,
  proposed_fix TEXT NOT NULL,
  target_ref TEXT,
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'queued', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_self_audit_findings_user
  ON self_audit_findings (user_id, status, severity DESC);
