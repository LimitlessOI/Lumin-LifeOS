-- SYNOPSIS: Go Vegas business network outreach pipeline — discover, invite, follow up.
-- @ssot docs/products/limitlessos/PRODUCT_HOME.md

CREATE TABLE IF NOT EXISTS go_vegas_prospects (
  id                TEXT PRIMARY KEY,
  business_name     TEXT NOT NULL,
  business_type     TEXT,
  website           TEXT,
  address           TEXT,
  phone             TEXT,
  contact_email     TEXT,
  contact_name      TEXT,
  google_place_id   TEXT,
  status            TEXT DEFAULT 'discovered',
  follow_up_count   INTEGER DEFAULT 0,
  last_contacted_at TIMESTAMPTZ,
  last_follow_up_at TIMESTAMPTZ,
  joined_at         TIMESTAMPTZ,
  replied_at        TIMESTAMPTZ,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_go_vegas_prospects_place
  ON go_vegas_prospects(google_place_id)
  WHERE google_place_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_go_vegas_prospects_status ON go_vegas_prospects(status);
CREATE INDEX IF NOT EXISTS idx_go_vegas_prospects_email ON go_vegas_prospects(contact_email);
CREATE INDEX IF NOT EXISTS idx_go_vegas_prospects_contacted ON go_vegas_prospects(last_contacted_at);
