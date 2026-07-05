-- SYNOPSIS: Database migration — repair prospect_sites table to match prospect-pipeline.js expectations.
-- The 20260704_create_prospect_sites.sql migration created a minimal table (id UUID, site_name, created_at)
-- that doesn't match the columns prospect-pipeline.js INSERT expects (client_id TEXT PK, business_url, etc.).
-- This migration drops the incorrect table and recreates with the correct schema from 20260313.

DROP TABLE IF EXISTS prospect_sites;

CREATE TABLE IF NOT EXISTS prospect_sites (
  client_id         TEXT PRIMARY KEY,
  business_url      TEXT NOT NULL,
  contact_email     TEXT,
  contact_name      TEXT,
  business_name     TEXT,
  preview_url       TEXT,
  email_sent        BOOLEAN DEFAULT FALSE,
  status            TEXT DEFAULT 'built',
  deal_value        REAL,
  pos_partner       TEXT,
  industry          TEXT,
  metadata          JSONB,
  follow_up_count   INTEGER DEFAULT 0,
  last_follow_up_at TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,
  last_viewed_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospect_sites_status ON prospect_sites(status);
CREATE INDEX IF NOT EXISTS idx_prospect_sites_contact ON prospect_sites(contact_email);
CREATE INDEX IF NOT EXISTS idx_prospect_sites_created ON prospect_sites(created_at DESC);

-- Ensure email_suppressions and outreach_log exist (from 20260313 migration)
CREATE TABLE IF NOT EXISTS email_suppressions (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  reason        TEXT,
  suppressed    BOOLEAN DEFAULT TRUE,
  suppressed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata      JSONB
);
CREATE INDEX IF NOT EXISTS idx_email_suppressions_email ON email_suppressions(email);

CREATE TABLE IF NOT EXISTS outreach_log (
  id            SERIAL PRIMARY KEY,
  campaign_id   TEXT,
  channel       TEXT DEFAULT 'email',
  recipient     TEXT NOT NULL,
  subject       TEXT,
  body          TEXT,
  status        TEXT,
  external_id   TEXT,
  metadata      JSONB,
  sent_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_outreach_log_recipient ON outreach_log(recipient);
CREATE INDEX IF NOT EXISTS idx_outreach_log_campaign ON outreach_log(campaign_id);
CREATE INDEX IF NOT EXISTS idx_outreach_log_sent ON outreach_log(sent_at DESC);
