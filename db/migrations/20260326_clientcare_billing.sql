-- @ssot docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md
-- ClientCare billing recovery foundation

CREATE TABLE IF NOT EXISTS clientcare_claims (
  id BIGSERIAL PRIMARY KEY,
  external_claim_id TEXT,
  patient_id TEXT,
  patient_name TEXT,
  payer_name TEXT NOT NULL,
  payer_type TEXT,
  provider_state TEXT,
  member_id TEXT,
  claim_number TEXT,
  account_number TEXT,
  date_of_service DATE NOT NULL,
  service_end_date DATE,
  original_submitted_at TIMESTAMPTZ,
  latest_submitted_at TIMESTAMPTZ,
  claim_status TEXT NOT NULL DEFAULT 'imported',
  submission_status TEXT,
  denial_code TEXT,
  denial_reason TEXT,
  billed_amount NUMERIC(12,2),
  allowed_amount NUMERIC(12,2),
  paid_amount NUMERIC(12,2),
  patient_balance NUMERIC(12,2),
  insurance_balance NUMERIC(12,2),
  cpt_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  icd_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  modifiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  timely_filing_deadline DATE,
  timely_filing_source TEXT,
  rescue_bucket TEXT,
  rescue_confidence NUMERIC(5,2),
  recovery_probability NUMERIC(5,2),
  priority_score NUMERIC(8,2),
  last_action_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'manual_import',
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clientcare_claims_external_claim_id
  ON clientcare_claims(external_claim_id)
  WHERE external_claim_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clientcare_claims_status ON clientcare_claims(claim_status);
CREATE INDEX IF NOT EXISTS idx_clientcare_claims_bucket ON clientcare_claims(rescue_bucket);
CREATE INDEX IF NOT EXISTS idx_clientcare_claims_payer ON clientcare_claims(payer_name);
CREATE INDEX IF NOT EXISTS idx_clientcare_claims_dos ON clientcare_claims(date_of_service DESC);

CREATE TABLE IF NOT EXISTS clientcare_claim_actions (
  id BIGSERIAL PRIMARY KEY,
  claim_id BIGINT NOT NULL REFERENCES clientcare_claims(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  due_at TIMESTAMPTZ,
  owner TEXT,
  summary TEXT NOT NULL,
  details TEXT,
  evidence_required JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientcare_claim_actions_claim_id ON clientcare_claim_actions(claim_id);
CREATE INDEX IF NOT EXISTS idx_clientcare_claim_actions_status ON clientcare_claim_actions(status);
