-- Migration: Managed Accounts — autonomous signup credential vault
-- System-initiated account registrations, encrypted credentials, status tracking

CREATE TABLE IF NOT EXISTS managed_accounts (
  id              BIGSERIAL PRIMARY KEY,
  service_name    TEXT NOT NULL,               -- e.g. "postmark", "jane_app", "square"
  service_url     TEXT,                         -- signup / login URL
  email_used      TEXT NOT NULL,               -- which system email was used
  username        TEXT,                         -- if different from email
  encrypted_password TEXT,                     -- AES-256-GCM encrypted
  status          TEXT NOT NULL DEFAULT 'pending',
    -- pending | email_sent | verified | active | failed | needs_human
  plan_name       TEXT,                         -- free / starter / etc
  account_id      TEXT,                         -- external account/customer ID
  api_key_hint    TEXT,                         -- masked hint of retrieved API key
  encrypted_api_key TEXT,                      -- AES-256-GCM encrypted API key if retrieved
  notes           TEXT,
  metadata        JSONB,
  captcha_required BOOLEAN DEFAULT FALSE,
  human_required  BOOLEAN DEFAULT FALSE,
  last_action     TEXT,
  last_error      TEXT,
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_managed_accounts_service_email
  ON managed_accounts (service_name, email_used);

CREATE INDEX IF NOT EXISTS idx_managed_accounts_status
  ON managed_accounts (status);

CREATE INDEX IF NOT EXISTS idx_managed_accounts_created
  ON managed_accounts (created_at DESC);

-- Audit trail for every signup action
CREATE TABLE IF NOT EXISTS managed_accounts_log (
  id            BIGSERIAL PRIMARY KEY,
  account_id    BIGINT REFERENCES managed_accounts(id) ON DELETE CASCADE,
  service_name  TEXT,
  action        TEXT NOT NULL,    -- navigate | fill_form | submit | verify_email | store_creds | error
  status        TEXT NOT NULL,    -- ok | error | captcha_detected | needs_human
  details       JSONB,
  screenshot_path TEXT,           -- path to error screenshot if saved
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_managed_accounts_log_account
  ON managed_accounts_log (account_id, created_at DESC);
