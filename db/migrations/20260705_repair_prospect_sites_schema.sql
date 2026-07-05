-- SYNOPSIS: Database migration — repair prospect_sites table to match prospect-pipeline.js expectations.
-- The 20260704_create_prospect_sites.sql migration created a minimal table (id UUID, site_name, created_at)
-- that doesn't match the columns prospect-pipeline.js INSERT expects (client_id TEXT, business_url, etc.).
-- Repair in place so production prospect rows from the canonical 20260313 migration are never deleted.

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

ALTER TABLE prospect_sites ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE prospect_sites ADD COLUMN IF NOT EXISTS business_url TEXT;
ALTER TABLE prospect_sites ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE prospect_sites ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE prospect_sites ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE prospect_sites ADD COLUMN IF NOT EXISTS preview_url TEXT;
ALTER TABLE prospect_sites ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE prospect_sites ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'built';
ALTER TABLE prospect_sites ADD COLUMN IF NOT EXISTS deal_value REAL;
ALTER TABLE prospect_sites ADD COLUMN IF NOT EXISTS pos_partner TEXT;
ALTER TABLE prospect_sites ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE prospect_sites ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE prospect_sites ADD COLUMN IF NOT EXISTS follow_up_count INTEGER DEFAULT 0;
ALTER TABLE prospect_sites ADD COLUMN IF NOT EXISTS last_follow_up_at TIMESTAMPTZ;
ALTER TABLE prospect_sites ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
ALTER TABLE prospect_sites ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;
ALTER TABLE prospect_sites ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE prospect_sites ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'prospect_sites'
      AND column_name = 'id'
  ) THEN
    EXECUTE 'UPDATE prospect_sites SET client_id = id::text WHERE client_id IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'prospect_sites'
      AND column_name = 'site_name'
  ) THEN
    EXECUTE 'UPDATE prospect_sites SET business_url = site_name WHERE business_url IS NULL';
  END IF;
END $$;

UPDATE prospect_sites
   SET client_id = 'prospect_' || md5(ctid::text)
 WHERE client_id IS NULL;

UPDATE prospect_sites
   SET business_url = COALESCE(business_name, preview_url, contact_email, client_id)
 WHERE business_url IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_prospect_sites_client_id_unique ON prospect_sites(client_id);

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
