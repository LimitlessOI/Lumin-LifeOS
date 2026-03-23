-- MLS Investor Registry + Deal Match Engine
-- Stores investor buy-box criteria and deal matches per investor

-- ── Investor profiles ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mls_investors (
  id              SERIAL PRIMARY KEY,
  name            TEXT        NOT NULL,
  email           TEXT,
  phone           TEXT,
  investor_type   TEXT        NOT NULL DEFAULT 'flipper',
  -- investor_type: flipper, buy_and_hold, brrrr, wholesale, new_construction

  -- Buy box criteria (JSONB for flexibility)
  criteria        JSONB       NOT NULL DEFAULT '{}',
  -- {
  --   price_min: 100000, price_max: 400000,
  --   arv_min: 200000,
  --   min_margin_pct: 20,          -- min (ARV - purchase - repairs) / ARV
  --   max_repair_estimate: 60000,
  --   min_beds: 3, min_baths: 2,
  --   min_sqft: 1200,
  --   areas: ["Henderson", "North Las Vegas", "89108"],
  --   property_types: ["SFR", "Condo"],
  --   max_dom: 90,                 -- days on market (motivated sellers)
  --   avoid_hoa: false,
  --   max_hoa_monthly: 200,
  --   notes: "Prefers brick, avoid flood zones"
  -- }

  active          BOOLEAN     NOT NULL DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mls_investors_type   ON mls_investors (investor_type);
CREATE INDEX IF NOT EXISTS idx_mls_investors_active ON mls_investors (active) WHERE active = true;

-- ── Deal matches ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mls_deal_matches (
  id              SERIAL PRIMARY KEY,
  investor_id     INT         NOT NULL REFERENCES mls_investors(id) ON DELETE CASCADE,
  mls_number      TEXT        NOT NULL,
  address         TEXT,
  list_price      NUMERIC(12,2),
  beds            SMALLINT,
  baths           NUMERIC(4,1),
  sqft            INT,
  dom             INT,         -- days on market at time of match
  listing_data    JSONB,       -- full scraped listing snapshot

  -- AI analysis
  estimated_arv          NUMERIC(12,2),
  estimated_repairs      NUMERIC(12,2),
  estimated_profit       NUMERIC(12,2),
  margin_pct             NUMERIC(5,2),   -- (arv - price - repairs) / arv * 100
  ai_score               SMALLINT,       -- 1-10
  ai_summary             TEXT,
  ai_red_flags           TEXT[],
  offer_price_suggestion NUMERIC(12,2),

  -- Workflow
  status          TEXT        NOT NULL DEFAULT 'new',
  -- new → reviewed → offer_drafted → offer_sent → under_contract → closed | passed
  offer_drafted_at   TIMESTAMPTZ,
  transaction_desk_id TEXT,
  actioned_at        TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (investor_id, mls_number)
);

CREATE INDEX IF NOT EXISTS idx_mls_matches_investor ON mls_deal_matches (investor_id);
CREATE INDEX IF NOT EXISTS idx_mls_matches_status   ON mls_deal_matches (status);
CREATE INDEX IF NOT EXISTS idx_mls_matches_score    ON mls_deal_matches (ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_mls_matches_created  ON mls_deal_matches (created_at DESC);
