-- Migration: 20260423_tsos_savings_ledger
-- GAP-FILL: builder not reachable (local server not running, no PUBLIC_BASE_URL set)
--
-- TSOS Savings Ledger — proves the value of TokenSaverOS to customers.
-- Two tables:
--   conductor_session_savings  — tracks every Conductor cold-start: how many tokens
--                                were saved by reading AGENT_RULES.compact.md instead
--                                of the full NSSOT+Companion stack.
--   tcos_baseline_config       — stores the reference token counts so the math is
--                                auditable and not hard-coded in service code.
--
-- Together with token_usage_log (AI call savings), these power the unified
-- tsos_savings_report view — the monetization proof surface.
--
-- @ssot docs/projects/AMENDMENT_10_API_COST_SAVINGS.md

BEGIN;

-- Baseline config: human-readable audit trail of what "full stack" costs
CREATE TABLE IF NOT EXISTS tcos_baseline_config (
  id              SERIAL PRIMARY KEY,
  label           TEXT NOT NULL UNIQUE,          -- e.g. 'compact_rules', 'full_nssot'
  token_count     INTEGER NOT NULL,              -- measured token count
  cost_per_m_usd  NUMERIC(10,6) NOT NULL DEFAULT 3.00, -- Claude Sonnet default
  notes           TEXT,
  recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Seed current baselines (idempotent)
INSERT INTO tcos_baseline_config (label, token_count, cost_per_m_usd, notes) VALUES
  ('compact_rules',       1038,  3.00, 'AGENT_RULES.compact.md as of 2026-04-23 — measured by gen:rules'),
  ('full_nssot',          9284,  3.00, 'docs/SSOT_NORTH_STAR.md token estimate'),
  ('full_companion',     10168,  3.00, 'docs/SSOT_COMPANION.md token estimate'),
  ('full_claude_md',      6653,  3.00, 'CLAUDE.md token estimate'),
  ('full_stack_total',   26105,  3.00, 'NSSOT + Companion + CLAUDE.md combined baseline')
ON CONFLICT (label) DO UPDATE
  SET token_count    = EXCLUDED.token_count,
      cost_per_m_usd = EXCLUDED.cost_per_m_usd,
      notes          = EXCLUDED.notes;

-- Per-session savings record: one row per Conductor cold-start
CREATE TABLE IF NOT EXISTS conductor_session_savings (
  id               BIGSERIAL PRIMARY KEY,
  session_ts       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source           TEXT NOT NULL DEFAULT 'cold_start', -- 'cold_start' | 'mid_session' | 'preflight'
  compact_tokens   INTEGER NOT NULL,   -- tokens actually read (compact rules)
  full_tokens      INTEGER NOT NULL,   -- tokens that would have been read (full stack)
  saved_tokens     INTEGER GENERATED ALWAYS AS (full_tokens - compact_tokens) STORED,
  savings_pct      NUMERIC(5,2) GENERATED ALWAYS AS (
                     ROUND(100.0 * (full_tokens - compact_tokens) / NULLIF(full_tokens, 0), 2)
                   ) STORED,
  cost_avoided_usd NUMERIC(10,6) GENERATED ALWAYS AS (
                     ROUND((full_tokens - compact_tokens)::NUMERIC / 1000000.0 * 3.00, 6)
                   ) STORED,
  agent_hint       TEXT,     -- e.g. 'claude-sonnet-4-6', 'cursor-claude'
  session_id       TEXT,     -- optional link to a broader session identifier
  notes            TEXT
);

CREATE INDEX IF NOT EXISTS idx_conductor_savings_ts
  ON conductor_session_savings (session_ts DESC);

CREATE INDEX IF NOT EXISTS idx_conductor_savings_source
  ON conductor_session_savings (source, session_ts DESC);

-- Unified savings report view — the monetization proof surface.
-- Combines AI call savings (token_usage_log) with Conductor session savings.
CREATE OR REPLACE VIEW tsos_savings_report AS
WITH ai_savings AS (
  SELECT
    DATE(logged_at)                              AS day,
    COUNT(*)                                     AS ai_calls,
    SUM(input_tokens)                            AS tokens_sent,
    SUM(saved_tokens)                            AS tokens_saved_compression,
    SUM(CASE WHEN provider_was_free THEN
          COALESCE(input_tokens + output_tokens, 0) ELSE 0 END) AS tokens_on_free_tier,
    SUM(saved_cost_usd)                          AS cost_saved_compression_usd,
    SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)   AS cache_hits,
    ROUND(AVG(quality_score) FILTER (WHERE quality_score IS NOT NULL), 2) AS avg_quality
  FROM token_usage_log
  GROUP BY DATE(logged_at)
),
conductor_savings AS (
  SELECT
    DATE(session_ts)         AS day,
    COUNT(*)                 AS sessions,
    SUM(saved_tokens)        AS tokens_saved_compact,
    SUM(cost_avoided_usd)    AS cost_avoided_compact_usd
  FROM conductor_session_savings
  GROUP BY DATE(session_ts)
),
days AS (
  SELECT day FROM ai_savings
  UNION
  SELECT day FROM conductor_savings
)
SELECT
  d.day,
  COALESCE(a.ai_calls, 0)                                         AS ai_calls,
  COALESCE(c.sessions, 0)                                         AS conductor_sessions,
  COALESCE(a.tokens_sent, 0)                                      AS tokens_sent,
  COALESCE(a.tokens_saved_compression, 0)                         AS tokens_saved_ai_compression,
  COALESCE(c.tokens_saved_compact, 0)                             AS tokens_saved_compact_rules,
  COALESCE(a.tokens_saved_compression, 0) +
    COALESCE(c.tokens_saved_compact, 0)                           AS tokens_saved_total,
  COALESCE(a.tokens_on_free_tier, 0)                              AS tokens_on_free_tier,
  COALESCE(a.cache_hits, 0)                                       AS cache_hits,
  COALESCE(a.cost_saved_compression_usd, 0)                       AS cost_saved_ai_usd,
  COALESCE(c.cost_avoided_compact_usd, 0)                         AS cost_avoided_compact_usd,
  COALESCE(a.cost_saved_compression_usd, 0) +
    COALESCE(c.cost_avoided_compact_usd, 0)                       AS cost_saved_total_usd,
  COALESCE(a.avg_quality, 0)                                      AS avg_quality_score
FROM days d
LEFT JOIN ai_savings a USING (day)
LEFT JOIN conductor_savings c USING (day)
ORDER BY d.day DESC;

-- Cumulative totals view — for the sales/pitch dashboard
CREATE OR REPLACE VIEW tsos_savings_totals AS
SELECT
  COUNT(DISTINCT day)                         AS days_tracked,
  SUM(ai_calls)                               AS total_ai_calls,
  SUM(conductor_sessions)                     AS total_conductor_sessions,
  SUM(tokens_saved_total)                     AS total_tokens_saved,
  SUM(tokens_on_free_tier)                    AS total_tokens_on_free_tier,
  SUM(cache_hits)                             AS total_cache_hits,
  ROUND(SUM(cost_saved_total_usd)::NUMERIC, 4) AS total_cost_saved_usd,
  ROUND(AVG(avg_quality_score) FILTER (WHERE avg_quality_score > 0), 2) AS avg_quality_score,
  MIN(day)                                    AS tracking_since,
  MAX(day)                                    AS last_activity
FROM tsos_savings_report;

COMMIT;
