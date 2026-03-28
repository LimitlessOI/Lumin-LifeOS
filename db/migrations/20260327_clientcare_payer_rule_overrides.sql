-- @ssot docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md
-- Operator-defined payer rule overrides for commercial plans and payer-specific recovery behavior

CREATE TABLE IF NOT EXISTS clientcare_payer_rule_overrides (
  payer_name TEXT PRIMARY KEY,
  filing_window_days INTEGER,
  appeal_window_days INTEGER,
  timely_filing_source TEXT,
  notes TEXT,
  followup_notes TEXT,
  requires_auth_review BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
