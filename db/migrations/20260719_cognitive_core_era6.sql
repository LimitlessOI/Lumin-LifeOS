-- SYNOPSIS: Cognitive Core Era-6 ("Transmit Me") — scale preserved judgment.
-- #26 Capsule Marketplace, #27 Subconscious Interrupts, #28 Cognitive Debt,
-- #29 Deep Consequence Trees, #30 Portable Handshake (import).
-- Soft-links only (no hard FKs across eras).

CREATE TABLE IF NOT EXISTS capsule_marketplace_listings (
  listing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  package_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  wear_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'org', 'public')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'retired')),
  install_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capsule_marketplace_status
  ON capsule_marketplace_listings (status, visibility, created_at DESC);

CREATE TABLE IF NOT EXISTS capsule_marketplace_installs (
  install_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  worn BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (listing_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_capsule_marketplace_installs_user
  ON capsule_marketplace_installs (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS subconscious_interrupts (
  interrupt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  trigger_kind TEXT NOT NULL DEFAULT 'pattern_match'
    CHECK (trigger_kind IN (
      'pattern_match', 'debt_threshold', 'value_drift',
      'stakes_escalation', 'stale_hypothesis', 'weak_program'
    )),
  message TEXT NOT NULL,
  domain TEXT,
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high')),
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'surfaced', 'dismissed', 'acted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subconscious_interrupts_user
  ON subconscious_interrupts (user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS cognitive_debt_items (
  debt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL
    CHECK (kind IN (
      'open_decision', 'stale_hypothesis', 'unclosed_loop',
      'weak_program', 'unpaid_prediction'
    )),
  title TEXT NOT NULL,
  detail TEXT,
  domain TEXT,
  severity DOUBLE PRECISION NOT NULL DEFAULT 0.5
    CHECK (severity >= 0 AND severity <= 1),
  ref_id TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'wontfix')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cognitive_debt_user
  ON cognitive_debt_items (user_id, status, severity DESC);

CREATE TABLE IF NOT EXISTS consequence_trees (
  tree_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  decision_id UUID,
  question TEXT NOT NULL,
  depth INTEGER NOT NULL DEFAULT 5
    CHECK (depth >= 2 AND depth <= 12),
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.35
    CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consequence_trees_user
  ON consequence_trees (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS package_imports (
  import_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  transmission_id UUID,
  package_id UUID,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'accepted'
    CHECK (status IN ('accepted', 'merged', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_package_imports_user
  ON package_imports (user_id, created_at DESC);
