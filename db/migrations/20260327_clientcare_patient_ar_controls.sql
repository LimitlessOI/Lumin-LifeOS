-- @ssot docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md
-- Provider-directed patient AR policy controls

CREATE TABLE IF NOT EXISTS clientcare_patient_ar_policy (
  scope_key TEXT PRIMARY KEY DEFAULT 'default',
  reminder_day_1 INTEGER NOT NULL DEFAULT 15,
  reminder_day_2 INTEGER NOT NULL DEFAULT 30,
  provider_escalation_day INTEGER NOT NULL DEFAULT 45,
  final_notice_day INTEGER NOT NULL DEFAULT 60,
  payment_plan_grace_days INTEGER NOT NULL DEFAULT 7,
  autopay_retry_days INTEGER NOT NULL DEFAULT 3,
  allow_payment_plans BOOLEAN NOT NULL DEFAULT TRUE,
  allow_hardship_review BOOLEAN NOT NULL DEFAULT TRUE,
  allow_settlements BOOLEAN NOT NULL DEFAULT FALSE,
  allow_referral_credit BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO clientcare_patient_ar_policy (
  scope_key,
  notes,
  updated_by
)
VALUES (
  'default',
  'Provider-directed only. Do not turn this into third-party debt collection without legal review.',
  'migration'
)
ON CONFLICT (scope_key) DO NOTHING;
