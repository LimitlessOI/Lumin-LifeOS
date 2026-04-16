-- Migration: 20260404_lifeos_data_ethics.sql
-- LifeOS Phase 8 — Data Ethics Infrastructure
-- Tables: data_deletion_log, consent_registry, constitutional_lock, research_aggregate_log

BEGIN;

-- 1. data_deletion_log — full audit of every deletion request
CREATE TABLE IF NOT EXISTS data_deletion_log (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL,  -- NOT a foreign key (user may be deleted)
  requested_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  tables_cleared    TEXT[],           -- which tables were wiped
  records_deleted   INTEGER DEFAULT 0,
  confirmation_hash TEXT,             -- SHA256 of (user_id + completed_at) for verification
  initiated_by      TEXT DEFAULT 'user', -- 'user'|'admin'|'legal'
  notes             TEXT
);

CREATE INDEX IF NOT EXISTS idx_data_deletion_log_user_id ON data_deletion_log(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_log_completed_at ON data_deletion_log(completed_at);

-- 2. consent_registry — per-user per-feature consent (append-only, never updated)
--    NOTE: This table is append-only. To revoke, insert a new row with action='revoked'.
--    Never UPDATE or DELETE rows.
CREATE TABLE IF NOT EXISTS consent_registry (
  id                 BIGSERIAL PRIMARY KEY,
  user_id            BIGINT NOT NULL,
  feature            TEXT NOT NULL,     -- 'wearable_data'|'conversation_analysis'|'health_patterns'|
                                        -- 'purpose_synthesis'|'fulfillment'|'research_aggregate'|
                                        -- 'family_sharing'|'tone_analysis'
  action             TEXT NOT NULL,     -- 'granted'|'revoked'
  consented_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consent_text       TEXT,              -- exact language shown to user when consent was given
  revocation_reason  TEXT,
  ip_note            TEXT               -- general location note, not precise IP
);

CREATE INDEX IF NOT EXISTS idx_consent_registry_user_id ON consent_registry(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_registry_user_feature ON consent_registry(user_id, feature);
CREATE INDEX IF NOT EXISTS idx_consent_registry_consented_at ON consent_registry(consented_at DESC);

-- 3. constitutional_lock — locked amendments requiring multi-party consensus
CREATE TABLE IF NOT EXISTS constitutional_lock (
  id                      BIGSERIAL PRIMARY KEY,
  amendment               TEXT NOT NULL UNIQUE, -- e.g. 'AMENDMENT_21_LIFEOS_CORE_ethics'
  description             TEXT,
  locked_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_by               TEXT,                 -- who locked it
  required_signers        INTEGER DEFAULT 3,    -- AI Council (1) + 2 human trustees
  override_attempts       INTEGER DEFAULT 0,    -- how many times a single-party override was attempted
  last_attempt_at         TIMESTAMPTZ,
  coercion_lockout        BOOLEAN DEFAULT FALSE, -- true if rapid repeated attempts detected
  coercion_lockout_until  TIMESTAMPTZ
);

-- 4. research_aggregate_log — log of aggregate insight computations (never individual data)
CREATE TABLE IF NOT EXISTS research_aggregate_log (
  id               BIGSERIAL PRIMARY KEY,
  metric           TEXT NOT NULL,          -- what was aggregated
  population_size  INTEGER,               -- how many consenting users contributed
  result_summary   TEXT,                  -- plain-English finding
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published        BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_research_aggregate_log_metric ON research_aggregate_log(metric);
CREATE INDEX IF NOT EXISTS idx_research_aggregate_log_published ON research_aggregate_log(published);

-- Seed the constitutional_lock with the founding data ethics commitment
INSERT INTO constitutional_lock (amendment, description, locked_by, required_signers)
VALUES (
  'AMENDMENT_21_LIFEOS_CORE_data_ethics',
  'Core data ethics: no selling data for marketing, user owns their data, deletion is real deletion, commerce only with consent',
  'founding_document',
  3
) ON CONFLICT (amendment) DO NOTHING;

COMMIT;
