-- SYNOPSIS: SocialMediaOS sessions + content packs tables.
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

CREATE TABLE IF NOT EXISTS socialmediaos_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  delivery_scheduled_at TIMESTAMPTZ,
  delivery_status TEXT DEFAULT 'not_sent',
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_socialmediaos_sessions_owner_id
  ON socialmediaos_sessions (owner_id);
CREATE INDEX IF NOT EXISTS idx_socialmediaos_sessions_status
  ON socialmediaos_sessions (status);
CREATE INDEX IF NOT EXISTS idx_socialmediaos_sessions_delivery_status
  ON socialmediaos_sessions (delivery_status);

CREATE TABLE IF NOT EXISTS socialmediaos_content_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  delivery_scheduled_at TIMESTAMPTZ,
  delivery_status TEXT DEFAULT 'not_sent',
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_socialmediaos_content_packs_owner_id
  ON socialmediaos_content_packs (owner_id);
CREATE INDEX IF NOT EXISTS idx_socialmediaos_content_packs_status
  ON socialmediaos_content_packs (status);
CREATE INDEX IF NOT EXISTS idx_socialmediaos_content_packs_delivery_status
  ON socialmediaos_content_packs (delivery_status);
