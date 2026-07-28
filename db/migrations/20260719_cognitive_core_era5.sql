-- SYNOPSIS: Cognitive Core Era-5 ("Preserve Me") — judgment package + transmission.
-- #25 Cognitive Immortality / Legacy Judgment Transmission.
-- Framing (Law): preserve hard-earned judgment with transparent confidence —
-- NOT "digital immortality" marketing. Soft-links only (no hard FKs across eras).

CREATE TABLE IF NOT EXISTS judgment_packages (
  package_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  label TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sealed', 'superseded', 'archived')),
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_map JSONB NOT NULL DEFAULT '{"confident":[],"extrapolated":[],"unknown":[]}'::jsonb,
  framing_note TEXT NOT NULL DEFAULT
    'Preserved judgment with transparent confidence — not digital immortality.',
  source_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  sealed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_judgment_packages_user
  ON judgment_packages (user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS judgment_transmissions (
  transmission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  recipient_label TEXT NOT NULL,
  purpose TEXT NOT NULL,
  consent_attested BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'accepted', 'revoked')),
  payload_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_judgment_transmissions_user
  ON judgment_transmissions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_judgment_transmissions_package
  ON judgment_transmissions (package_id);
