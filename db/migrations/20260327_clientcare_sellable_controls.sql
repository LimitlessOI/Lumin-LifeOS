-- @ssot docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md
-- Sellable packaging controls for ClientCare billing recovery

CREATE TABLE IF NOT EXISTS clientcare_tenants (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'internal',
  collections_fee_pct NUMERIC(6,2) NOT NULL DEFAULT 5.00,
  contact_name TEXT,
  contact_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clientcare_operator_access (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES clientcare_tenants(id) ON DELETE CASCADE,
  operator_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, operator_email)
);

CREATE TABLE IF NOT EXISTS clientcare_onboarding (
  tenant_id BIGINT PRIMARY KEY REFERENCES clientcare_tenants(id) ON DELETE CASCADE,
  browser_ready BOOLEAN NOT NULL DEFAULT FALSE,
  payment_history_imported BOOLEAN NOT NULL DEFAULT FALSE,
  backlog_loaded BOOLEAN NOT NULL DEFAULT FALSE,
  policy_configured BOOLEAN NOT NULL DEFAULT FALSE,
  operator_access_configured BOOLEAN NOT NULL DEFAULT FALSE,
  review_completed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clientcare_audit_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT REFERENCES clientcare_tenants(id) ON DELETE SET NULL,
  actor TEXT NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO clientcare_tenants (slug, name, status, collections_fee_pct)
VALUES ('default', 'Default Practice', 'internal', 5.00)
ON CONFLICT (slug) DO NOTHING;
