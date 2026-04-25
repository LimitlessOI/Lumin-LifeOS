-- ============================================================
-- TokenOS Customer Registry + B2B Savings Ledger
-- @ssot docs/projects/AMENDMENT_10_API_COST_SAVINGS.md
-- Created: 2026-04-22
-- ============================================================

-- B2B customer registry (TCO-A04: Key management)
CREATE TABLE IF NOT EXISTS tco_customers (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  company         TEXT,
  plan            TEXT NOT NULL DEFAULT 'starter', -- starter | growth | enterprise
  api_key         TEXT NOT NULL UNIQUE,             -- plain key used in Authorization header
  encrypted_keys  JSONB DEFAULT '{}',               -- { openai: '...', anthropic: '...' } AES-256-GCM
  status          TEXT NOT NULL DEFAULT 'active',   -- active | suspended | cancelled
  monthly_budget  NUMERIC(12,6) DEFAULT NULL,       -- optional spend cap in USD
  meta            JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tco_customers_api_key_idx ON tco_customers (api_key);
CREATE INDEX IF NOT EXISTS tco_customers_status_idx  ON tco_customers (status);

-- Per-proxy-call savings ledger for B2B customers (TCO-E01)
-- Separate from internal token_usage_log which tracks Lumin's own compression
CREATE TABLE IF NOT EXISTS tco_requests (
  id                  BIGSERIAL PRIMARY KEY,
  customer_id         BIGINT NOT NULL REFERENCES tco_customers(id),
  customer_api_key    TEXT NOT NULL,
  original_provider   TEXT NOT NULL,   -- openai | anthropic | google
  original_model      TEXT NOT NULL,
  actual_provider     TEXT NOT NULL,
  actual_model        TEXT NOT NULL,
  original_tokens     INT NOT NULL DEFAULT 0,
  actual_tokens       INT NOT NULL DEFAULT 0,
  original_cost       NUMERIC(12,6) NOT NULL DEFAULT 0,
  actual_cost         NUMERIC(12,6) NOT NULL DEFAULT 0,
  savings             NUMERIC(12,6) NOT NULL DEFAULT 0,
  savings_percent     NUMERIC(6,2) NOT NULL DEFAULT 0,
  cache_hit           BOOLEAN NOT NULL DEFAULT FALSE,
  compression_used    BOOLEAN NOT NULL DEFAULT FALSE,
  quality_score       NUMERIC(5,2),                  -- 0-100 (NULL = not checked)
  quality_method      TEXT,                          -- 'checksum' | 'embedding' | 'skipped'
  latency_ms          INT,
  failed_over         BOOLEAN NOT NULL DEFAULT FALSE,
  tco_mode            TEXT DEFAULT 'optimized',      -- optimized | direct | ab_test
  request_metadata    JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tco_requests_customer_idx ON tco_requests (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tco_requests_date_idx     ON tco_requests (created_at DESC);

-- Agent interactions for social-media sales agent
CREATE TABLE IF NOT EXISTS tco_agent_interactions (
  id                BIGSERIAL PRIMARY KEY,
  source_platform   TEXT NOT NULL,  -- twitter | linkedin | reddit
  source_id         TEXT,
  source_url        TEXT,
  message           TEXT NOT NULL,
  author_username   TEXT,
  author_profile    TEXT,
  response_text     TEXT,
  response_status   TEXT DEFAULT 'pending', -- pending | sent | skipped | failed
  became_lead       BOOLEAN DEFAULT FALSE,
  objection_type    TEXT,
  follow_up_count   INT DEFAULT 0,
  follow_up_at      TIMESTAMPTZ,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tco_interactions_status_idx ON tco_agent_interactions (response_status);

-- Price negotiation log
CREATE TABLE IF NOT EXISTS tco_agent_negotiations (
  id            BIGSERIAL PRIMARY KEY,
  customer_id   BIGINT REFERENCES tco_customers(id),
  tier          TEXT NOT NULL,
  notes         TEXT,
  status        TEXT DEFAULT 'pending', -- pending | accepted | rejected
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convenience view: daily savings totals per customer
CREATE OR REPLACE VIEW tco_savings_daily AS
SELECT
  customer_id,
  DATE(created_at)                    AS day,
  COUNT(*)                            AS requests,
  SUM(original_tokens)                AS original_tokens,
  SUM(actual_tokens)                  AS actual_tokens,
  SUM(savings)                        AS total_savings_usd,
  AVG(savings_percent)                AS avg_savings_pct,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)       AS cache_hits,
  SUM(CASE WHEN compression_used THEN 1 ELSE 0 END) AS compressions,
  AVG(quality_score)                  AS avg_quality
FROM tco_requests
GROUP BY customer_id, DATE(created_at);
