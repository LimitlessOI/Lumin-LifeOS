-- SYNOPSIS: BirthBill multi-tenant isolation — credentials vault + claims.tenant_id.
-- @ssot docs/products/clientcare-billing-recovery/PRODUCT_HOME.md

CREATE TABLE IF NOT EXISTS clientcare_tenant_credentials (
  tenant_id BIGINT PRIMARY KEY REFERENCES clientcare_tenants(id) ON DELETE CASCADE,
  base_url TEXT NOT NULL DEFAULT 'https://clientcarewest.net',
  username TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  mfa_mode TEXT,
  encrypted_mfa_secret TEXT,
  username_hint TEXT,
  status TEXT NOT NULL DEFAULT 'stored',
  last_verified_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE clientcare_claims
  ADD COLUMN IF NOT EXISTS tenant_id BIGINT REFERENCES clientcare_tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clientcare_claims_tenant_id
  ON clientcare_claims(tenant_id);

-- Multi-tenant external ids: same claim id may exist for different practices.
DROP INDEX IF EXISTS idx_clientcare_claims_external_claim_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientcare_claims_tenant_external_claim_id
  ON clientcare_claims (COALESCE(tenant_id, 0), external_claim_id)
  WHERE external_claim_id IS NOT NULL;

-- Seed default tenant claims as tenant 1 when present.
UPDATE clientcare_claims c
SET tenant_id = t.id
FROM clientcare_tenants t
WHERE c.tenant_id IS NULL
  AND t.slug = 'default';
