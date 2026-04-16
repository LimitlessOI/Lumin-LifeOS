-- Migration: 20260402_lifeos_purpose.sql
-- LifeOS Phase 6 — Purpose Discovery, Dream Funding, Fulfillment Engine
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

BEGIN;

-- 1. purpose_profiles — discovered purpose patterns per user
CREATE TABLE IF NOT EXISTS purpose_profiles (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE UNIQUE,
  purpose_statement     TEXT,                               -- one sentence: "I am here to..."
  energy_sources        TEXT[]  DEFAULT '{}',               -- what creates energy (from observations)
  energy_drains         TEXT[]  DEFAULT '{}',               -- what depletes energy
  core_strengths        TEXT[]  DEFAULT '{}',               -- what this person does better than most
  growth_edges          TEXT[]  DEFAULT '{}',               -- where they're being called to grow
  economic_paths        JSONB   NOT NULL DEFAULT '[]',      -- [{title, description, market_demand, effort, revenue_potential}]
  last_synthesized_at   TIMESTAMPTZ,
  synthesis_version     INTEGER NOT NULL DEFAULT 1,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. energy_observations — logged energy events
CREATE TABLE IF NOT EXISTS energy_observations (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  observed_at     DATE    NOT NULL DEFAULT CURRENT_DATE,
  activity        TEXT    NOT NULL,
  energy_effect   TEXT    NOT NULL,  -- 'high_energy'|'low_energy'|'neutral'
  flow_state      BOOLEAN NOT NULL DEFAULT FALSE,
  notes           TEXT,
  source          TEXT    NOT NULL DEFAULT 'manual',  -- 'manual'|'ai_inferred'|'wearable'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. dreams — named dreams with funding tracking
CREATE TABLE IF NOT EXISTS dreams (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  title                 TEXT    NOT NULL,
  description           TEXT,
  category              TEXT,   -- 'adventure'|'creation'|'service'|'learning'|'family'|'health'|'financial'|'other'
  target_amount         NUMERIC(12,2),
  funded_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  status                TEXT    NOT NULL DEFAULT 'active',  -- 'active'|'funded'|'in_progress'|'completed'|'paused'
  pay_forward_done      BOOLEAN NOT NULL DEFAULT FALSE,
  pay_forward_amount    NUMERIC(12,2),
  pay_forward_recipient TEXT,
  target_date           DATE,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. fulfillment_orders — consent-gated system-initiated orders
CREATE TABLE IF NOT EXISTS fulfillment_orders (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  product_name          TEXT    NOT NULL,
  product_url           TEXT,
  reason                TEXT    NOT NULL,           -- why system suggested this
  estimated_price       NUMERIC(10,2),
  affiliate_source      TEXT,                       -- 'amazon'|'direct'|other
  affiliate_fee_estimate NUMERIC(10,2),
  status                TEXT    NOT NULL DEFAULT 'proposed',  -- 'proposed'|'approved'|'ordered'|'cancelled'
  proposed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at           TIMESTAMPTZ,
  ordered_at            TIMESTAMPTZ,
  order_confirmation    TEXT,
  consent_given         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
