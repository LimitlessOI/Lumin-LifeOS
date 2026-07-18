-- SYNOPSIS: Platform affiliate + eXp-style downline revenue-share schema (open to all accounts).
-- Owning product home: docs/products/marketingos/PRODUCT_HOME.md
-- Spec: docs/products/marketingos/AFFILIATE_REVSHARE_SPEC.md
-- Safe to run repeatedly (IF NOT EXISTS). No behavior is wired until the governed-factory
-- service/route modules land; these tables are inert foundation.

CREATE TABLE IF NOT EXISTS affiliates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          TEXT NOT NULL,
  handle            TEXT UNIQUE,
  status            TEXT NOT NULL DEFAULT 'pending',
  sponsor_id        UUID REFERENCES affiliates(id),
  stripe_account_id TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_affiliates_owner   ON affiliates (owner_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_sponsor ON affiliates (sponsor_id);

CREATE TABLE IF NOT EXISTS referral_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id  UUID NOT NULL REFERENCES affiliates(id),
  code          TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referral_codes_affiliate ON referral_codes (affiliate_id);

CREATE TABLE IF NOT EXISTS attribution_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT,
  affiliate_id  UUID REFERENCES affiliates(id),
  kind          TEXT NOT NULL,                 -- click | signup | purchase
  subject_id    TEXT,                          -- clientId / marketing_session_id / customer id
  product       TEXT,                          -- site-builder-publish | smos-content-pack | ...
  stripe_ref    TEXT,                          -- checkout session / payment intent id (purchase)
  amount_cents  INTEGER,                        -- deal amount (purchase)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attr_events_affiliate ON attribution_events (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_attr_events_kind      ON attribution_events (kind);
CREATE INDEX IF NOT EXISTS idx_attr_events_stripe    ON attribution_events (stripe_ref);

CREATE TABLE IF NOT EXISTS commission_ledger (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id       UUID NOT NULL REFERENCES affiliates(id),
  source_event_id    UUID REFERENCES attribution_events(id),
  tier               INTEGER NOT NULL,          -- 1 = direct, 2/3 = downline levels
  basis_cents        INTEGER NOT NULL,
  rate_bps           INTEGER NOT NULL,          -- basis points, e.g. 3000 = 30%
  amount_cents       INTEGER NOT NULL,
  recurring          BOOLEAN NOT NULL DEFAULT FALSE,
  status             TEXT NOT NULL DEFAULT 'pending', -- pending | payable | paid | reversed
  stripe_transfer_id TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ledger_affiliate ON commission_ledger (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_ledger_status    ON commission_ledger (status);
CREATE INDEX IF NOT EXISTS idx_ledger_source    ON commission_ledger (source_event_id);
