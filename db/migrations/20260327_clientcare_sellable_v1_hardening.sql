-- @ssot docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md
-- Sellable-v1 hardening for payer rule depth and packaging exports/readiness

ALTER TABLE IF EXISTS clientcare_payer_rule_overrides
  ADD COLUMN IF NOT EXISTS denial_category_override TEXT,
  ADD COLUMN IF NOT EXISTS followup_cadence_days INTEGER,
  ADD COLUMN IF NOT EXISTS escalation_after_days INTEGER,
  ADD COLUMN IF NOT EXISTS expected_days_to_pay INTEGER,
  ADD COLUMN IF NOT EXISTS expected_paid_to_allowed_rate NUMERIC(6,4);
