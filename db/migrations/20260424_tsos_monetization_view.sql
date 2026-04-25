-- Migration: 20260424_tsos_monetization_view
--
-- PURPOSE: Rebuild the tsos_savings_report view to expose FULL monetization math.
--
-- The old view hid savings behind vague column names and never computed:
--   - baseline_cost_usd  (what you would have paid at Anthropic Sonnet rates)
--   - actual_cost_usd    (what you actually paid)
--   - overall_savings_pct (combined savings % across ALL mechanisms)
--   - per-mechanism breakdown (free routing vs compression vs cache)
--
-- Without baseline vs actual, you cannot document or charge for savings.
-- This view makes the math auditable and monetization-ready.
--
-- Mechanism math:
--   baseline_cost_usd  = original_tokens * $3/M + output_tokens * $15/M
--   actual_cost_usd    = SUM(cost_usd)  (0 for free providers)
--   total_saved_usd    = baseline - actual  =  SUM(saved_cost_usd)
--   savings_pct        = total_saved / baseline * 100
--
-- Mechanism split (per call, these add up to total_saved_usd):
--   saved_by_free_routing_usd  = saved_cost_usd where provider_was_free=true
--     (entire call cost avoided — includes any compression applied on top)
--   saved_by_compression_usd   = saved_cost_usd where provider_was_free=false, cache_hit=false
--     (only token reduction savings on paid-provider calls)
--   saved_by_cache_usd         = saved_cost_usd where cache_hit=true, provider_was_free=false
--     (full avoided cost on cache-hit calls against paid providers)
--
-- @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md

BEGIN;

-- Drop and recreate both views atomically
DROP VIEW IF EXISTS tsos_savings_totals;
DROP VIEW IF EXISTS tsos_savings_report;

-- ─────────────────────────────────────────────────────────────────────────────
-- tsos_savings_report — daily rows with FULL monetization math
-- ─────────────────────────────────────────────────────────────────────────────
CREATE VIEW tsos_savings_report AS
WITH ai_savings AS (
  SELECT
    DATE(logged_at)                                                                AS day,
    COUNT(*)                                                                       AS ai_calls,

    -- ── Baseline: what ALL tokens would have cost at Anthropic Sonnet rates ──
    ROUND(SUM(
      original_tokens::NUMERIC / 1000000.0 * 3.00 +
      output_tokens::NUMERIC   / 1000000.0 * 15.00
    ), 6)                                                                          AS baseline_cost_usd,

    -- ── Actual: what was really paid (0 on free providers) ───────────────────
    ROUND(SUM(cost_usd), 6)                                                        AS actual_cost_usd,

    -- ── Total saved (all mechanisms combined) ────────────────────────────────
    ROUND(SUM(saved_cost_usd), 6)                                                  AS total_saved_usd,

    -- ── Per-mechanism savings ─────────────────────────────────────────────────
    -- Free routing: full cost avoided by using Groq/Cerebras/Gemini instead of Anthropic
    ROUND(SUM(CASE WHEN provider_was_free     THEN saved_cost_usd ELSE 0 END), 6)  AS saved_by_free_routing_usd,
    -- Compression: token reduction savings on paid-provider calls
    ROUND(SUM(CASE WHEN NOT provider_was_free
                    AND NOT cache_hit          THEN saved_cost_usd ELSE 0 END), 6)  AS saved_by_compression_usd,
    -- Cache: full call cost avoided on paid-provider cache hits
    ROUND(SUM(CASE WHEN cache_hit
                    AND NOT provider_was_free  THEN saved_cost_usd ELSE 0 END), 6)  AS saved_by_cache_usd,

    -- ── Token volume columns (kept for audit / billing) ───────────────────────
    SUM(original_tokens)                                                            AS tokens_baseline,
    SUM(input_tokens)                                                               AS tokens_sent,
    SUM(saved_tokens)                                                               AS tokens_saved_ai_compression,
    SUM(CASE WHEN provider_was_free THEN input_tokens + output_tokens ELSE 0 END)   AS tokens_on_free_tier,
    SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)                                      AS cache_hits,
    COUNT(*) FILTER (WHERE provider_was_free)                                       AS free_calls,
    ROUND(AVG(quality_score) FILTER (WHERE quality_score IS NOT NULL), 2)           AS avg_quality

  FROM token_usage_log
  GROUP BY DATE(logged_at)
),
conductor_savings AS (
  SELECT
    DATE(session_ts)                  AS day,
    COUNT(*)                          AS sessions,
    SUM(saved_tokens)                 AS tokens_saved_compact,
    ROUND(SUM(cost_avoided_usd), 6)   AS saved_by_compact_rules_usd
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

  -- ── Call counts ────────────────────────────────────────────────────────────
  COALESCE(a.ai_calls, 0)                                                          AS ai_calls,
  COALESCE(c.sessions, 0)                                                          AS conductor_sessions,
  COALESCE(a.free_calls, 0)                                                        AS free_provider_calls,
  COALESCE(a.cache_hits, 0)                                                        AS cache_hits,

  -- ── Cost columns: the monetization proof ──────────────────────────────────
  COALESCE(a.baseline_cost_usd, 0)                                                 AS baseline_cost_usd,
  COALESCE(a.actual_cost_usd, 0)                                                   AS actual_cost_usd,
  COALESCE(a.total_saved_usd, 0) +
    COALESCE(c.saved_by_compact_rules_usd, 0)                                      AS total_saved_usd,

  -- ── Savings % (the headline number for customer billing) ──────────────────
  CASE
    WHEN COALESCE(a.baseline_cost_usd, 0) + COALESCE(c.saved_by_compact_rules_usd, 0) > 0
    THEN ROUND(
      (COALESCE(a.total_saved_usd, 0) + COALESCE(c.saved_by_compact_rules_usd, 0))
      / (COALESCE(a.baseline_cost_usd, 0) + COALESCE(c.saved_by_compact_rules_usd, 0))
      * 100, 1
    )
    ELSE 0
  END                                                                               AS savings_pct,

  -- ── Per-mechanism breakdown (adds up to total_saved_usd) ─────────────────
  COALESCE(a.saved_by_free_routing_usd, 0)                                         AS saved_by_free_routing_usd,
  COALESCE(a.saved_by_compression_usd, 0)                                          AS saved_by_compression_usd,
  COALESCE(a.saved_by_cache_usd, 0)                                                AS saved_by_cache_usd,
  COALESCE(c.saved_by_compact_rules_usd, 0)                                        AS saved_by_compact_rules_usd,

  -- ── Token volume (audit trail) ────────────────────────────────────────────
  COALESCE(a.tokens_baseline, 0)                                                   AS tokens_baseline,
  COALESCE(a.tokens_sent, 0)                                                       AS tokens_sent,
  COALESCE(a.tokens_saved_ai_compression, 0)                                       AS tokens_saved_ai_compression,
  COALESCE(c.tokens_saved_compact, 0)                                              AS tokens_saved_compact_rules,
  COALESCE(a.tokens_on_free_tier, 0)                                               AS tokens_on_free_tier,

  COALESCE(a.avg_quality, 0)                                                       AS avg_quality_score

FROM days d
LEFT JOIN ai_savings      a USING (day)
LEFT JOIN conductor_savings c USING (day)
ORDER BY d.day DESC;

-- ─────────────────────────────────────────────────────────────────────────────
-- tsos_savings_totals — all-time rollup from the daily view
-- ─────────────────────────────────────────────────────────────────────────────
CREATE VIEW tsos_savings_totals AS
SELECT
  COUNT(DISTINCT day)                                             AS days_tracked,
  SUM(ai_calls)                                                   AS total_ai_calls,
  SUM(conductor_sessions)                                         AS total_conductor_sessions,
  SUM(cache_hits)                                                 AS total_cache_hits,
  SUM(free_provider_calls)                                        AS total_free_provider_calls,

  -- ── The headline numbers ──────────────────────────────────────────────────
  ROUND(SUM(baseline_cost_usd)::NUMERIC, 4)                       AS total_baseline_cost_usd,
  ROUND(SUM(actual_cost_usd)::NUMERIC, 4)                         AS total_actual_cost_usd,
  ROUND(SUM(total_saved_usd)::NUMERIC, 4)                         AS total_saved_usd,
  CASE
    WHEN SUM(baseline_cost_usd) > 0
    THEN ROUND(SUM(total_saved_usd) / SUM(baseline_cost_usd) * 100, 1)
    ELSE 0
  END                                                             AS overall_savings_pct,

  -- ── Per-mechanism totals ──────────────────────────────────────────────────
  ROUND(SUM(saved_by_free_routing_usd)::NUMERIC, 4)               AS saved_by_free_routing_usd,
  ROUND(SUM(saved_by_compression_usd)::NUMERIC, 4)                AS saved_by_compression_usd,
  ROUND(SUM(saved_by_cache_usd)::NUMERIC, 4)                      AS saved_by_cache_usd,
  ROUND(SUM(saved_by_compact_rules_usd)::NUMERIC, 4)              AS saved_by_compact_rules_usd,

  -- ── Token volume ──────────────────────────────────────────────────────────
  SUM(tokens_baseline)                                            AS total_tokens_baseline,
  SUM(tokens_sent)                                                AS total_tokens_sent,
  SUM(tokens_saved_ai_compression)                               AS total_tokens_saved_compression,
  SUM(tokens_saved_compact_rules)                                AS total_tokens_saved_compact,
  SUM(tokens_on_free_tier)                                        AS total_tokens_on_free_tier,

  ROUND(AVG(avg_quality_score) FILTER (WHERE avg_quality_score > 0), 2) AS avg_quality_score,
  MIN(day)                                                        AS tracking_since,
  MAX(day)                                                        AS last_activity

FROM tsos_savings_report;

COMMIT;
