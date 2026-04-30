-- Migration: Site Builder + Prospect Pipeline tables
-- Run against Neon (PostgreSQL) to enable Amendment 05 revenue pipeline

-- Prospect sites: tracks cold-outreach prospects and their mock preview sites
-- status values: built | sent | viewed | replied | converted | lost | expired
-- pos_partner values: jane_app | mindbody | square
CREATE TABLE IF NOT EXISTS prospect_sites (
  client_id         TEXT PRIMARY KEY,
  business_url      TEXT NOT NULL,
  contact_email     TEXT,
  contact_name      TEXT,
  business_name     TEXT,
  preview_url       TEXT,
  email_sent        BOOLEAN DEFAULT FALSE,
  status            TEXT DEFAULT 'sent',
  deal_value        REAL,
  pos_partner       TEXT,
  industry          TEXT,
  metadata          JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prospect_sites ADD COLUMN IF NOT EXISTS follow_up_count INTEGER DEFAULT 0;
ALTER TABLE prospect_sites ADD COLUMN IF NOT EXISTS last_follow_up_at TIMESTAMPTZ;
ALTER TABLE prospect_sites ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_prospect_sites_status ON prospect_sites(status);
CREATE INDEX IF NOT EXISTS idx_prospect_sites_contact ON prospect_sites(contact_email);
CREATE INDEX IF NOT EXISTS idx_prospect_sites_created ON prospect_sites(created_at DESC);

-- Email suppressions: bounce/complaint/unsubscribe list used by NotificationService
-- Prevents re-sending to bad addresses (fail-closed on DB failure)
-- reason values: bounce | complaint | unsubscribe | manual
CREATE TABLE IF NOT EXISTS email_suppressions (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  reason        TEXT,
  suppressed    BOOLEAN DEFAULT TRUE,
  suppressed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata      JSONB
);

CREATE INDEX IF NOT EXISTS idx_email_suppressions_email ON email_suppressions(email);

-- Outreach log: records every email attempt for audit trail
-- Used by NotificationService.logOutreach()
-- status values: sent | failed | blocked_suppressed | disabled
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

-- Add sent_at if table pre-existed without it
ALTER TABLE outreach_log ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_outreach_log_recipient ON outreach_log(recipient);
CREATE INDEX IF NOT EXISTS idx_outreach_log_campaign ON outreach_log(campaign_id);
CREATE INDEX IF NOT EXISTS idx_outreach_log_sent ON outreach_log(sent_at DESC);
