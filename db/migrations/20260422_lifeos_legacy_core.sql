-- LifeOS Legacy Core (P1): trusted contacts, check-in cadence,
-- time-capsule delivery, and digital-will completeness.

CREATE TABLE IF NOT EXISTS legacy_trusted_contacts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  relationship TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legacy_trusted_contacts_user_active
  ON legacy_trusted_contacts (user_id, active, created_at DESC);

CREATE TABLE IF NOT EXISTS legacy_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES legacy_trusted_contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  deliver_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'sent', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legacy_messages_user_delivery
  ON legacy_messages (user_id, deliver_at DESC);

CREATE TABLE IF NOT EXISTS digital_wills (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES lifeos_users(id) ON DELETE CASCADE,
  executor_name TEXT,
  executor_contact TEXT,
  guardianship_notes TEXT,
  asset_notes TEXT,
  instructions TEXT,
  completeness_pct INTEGER NOT NULL DEFAULT 0
    CHECK (completeness_pct >= 0 AND completeness_pct <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE lifeos_users
  ADD COLUMN IF NOT EXISTS legacy_check_in_cadence_days INTEGER DEFAULT 30
    CHECK (legacy_check_in_cadence_days BETWEEN 7 AND 180),
  ADD COLUMN IF NOT EXISTS legacy_last_check_in_at TIMESTAMPTZ;
