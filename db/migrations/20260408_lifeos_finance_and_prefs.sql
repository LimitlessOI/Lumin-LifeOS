-- LifeOS: personal finance v1 + flourishing preference bag (Amendment 21 Phase 16 + backlog)
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

BEGIN;

ALTER TABLE lifeos_users
  ADD COLUMN IF NOT EXISTS flourishing_prefs JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN lifeos_users.flourishing_prefs IS 'User-owned flags: ambivalence_until, quiet_until, stress_tags, idiom_hints, etc. — never auto-written by AI without consent.';

CREATE TABLE IF NOT EXISTS lifeos_finance_accounts (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'other',
  currency     TEXT NOT NULL DEFAULT 'USD',
  external_ref TEXT,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifeos_fin_accounts_user ON lifeos_finance_accounts (user_id);

CREATE TABLE IF NOT EXISTS lifeos_finance_categories (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  values_tag   TEXT,
  monthly_cap  NUMERIC(12,2),
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifeos_fin_cat_user ON lifeos_finance_categories (user_id);

CREATE TABLE IF NOT EXISTS lifeos_finance_transactions (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  account_id   BIGINT REFERENCES lifeos_finance_accounts(id) ON DELETE SET NULL,
  category_id  BIGINT REFERENCES lifeos_finance_categories(id) ON DELETE SET NULL,
  amount       NUMERIC(14,2) NOT NULL,
  txn_date     DATE NOT NULL DEFAULT (CURRENT_DATE),
  memo         TEXT,
  source       TEXT NOT NULL DEFAULT 'manual',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifeos_fin_txn_user_date ON lifeos_finance_transactions (user_id, txn_date DESC);

CREATE TABLE IF NOT EXISTS lifeos_finance_goals (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  target_amount  NUMERIC(14,2),
  current_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  target_date    DATE,
  dream_id       BIGINT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifeos_fin_goal_user ON lifeos_finance_goals (user_id);

CREATE TABLE IF NOT EXISTS lifeos_finance_ips (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL UNIQUE REFERENCES lifeos_users(id) ON DELETE CASCADE,
  statement_text TEXT,
  risk_notes     TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
