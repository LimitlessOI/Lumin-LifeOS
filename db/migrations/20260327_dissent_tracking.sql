-- Dissent tracking: adds consensus position flag and rebuilds performance views
-- to separately track consensus accuracy vs dissent accuracy per model.
--
-- Key insight: a model that correctly dissents from the group is more valuable
-- than one that correctly agrees. These are tracked and weighted separately.
--
-- @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md

ALTER TABLE model_verdict_log
  ADD COLUMN IF NOT EXISTS was_consensus_position BOOLEAN;
  -- true  = this model voted with the majority
  -- false = this model dissented from the majority
  -- NULL  = not yet determined (single-model run, or pre-migration rows)

-- Rebuild model_performance_summary with dissent accuracy column
CREATE OR REPLACE VIEW model_performance_summary AS
SELECT
  mvl.lens,
  mvl.model,
  mvl.provider,
  COUNT(*)                                                          AS total_verdicts,
  -- Overall accuracy
  COUNT(*) FILTER (WHERE mvl.verdict_was_correct = true)           AS correct_verdicts,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE mvl.verdict_was_correct = true)
    / NULLIF(COUNT(*) FILTER (WHERE mvl.verdict_was_correct IS NOT NULL), 0), 1
  )                                                                 AS accuracy_pct,
  -- Consensus accuracy (voted with majority)
  COUNT(*) FILTER (WHERE mvl.was_consensus_position = true)        AS consensus_verdicts,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE mvl.was_consensus_position = true AND mvl.verdict_was_correct = true)
    / NULLIF(COUNT(*) FILTER (WHERE mvl.was_consensus_position = true AND mvl.verdict_was_correct IS NOT NULL), 0), 1
  )                                                                 AS consensus_accuracy_pct,
  -- Dissent accuracy (voted against majority) — the canary metric
  COUNT(*) FILTER (WHERE mvl.was_consensus_position = false)       AS dissent_verdicts,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE mvl.was_consensus_position = false AND mvl.verdict_was_correct = true)
    / NULLIF(COUNT(*) FILTER (WHERE mvl.was_consensus_position = false AND mvl.verdict_was_correct IS NOT NULL), 0), 1
  )                                                                 AS dissent_accuracy_pct,
  -- Cost / perf
  ROUND(AVG(mvl.latency_ms))                                       AS avg_latency_ms,
  ROUND(AVG(mvl.cost_usd)::NUMERIC, 6)                             AS avg_cost_usd,
  SUM(mvl.cost_usd)                                                 AS total_cost_usd,
  MAX(mvl.logged_at)                                                AS last_used
FROM model_verdict_log mvl
GROUP BY mvl.lens, mvl.model, mvl.provider;

-- Per-lens winner by overall accuracy (unchanged)
CREATE OR REPLACE VIEW model_lens_winner AS
SELECT DISTINCT ON (lens)
  lens, model, provider, accuracy_pct, total_verdicts, avg_cost_usd,
  dissent_accuracy_pct, consensus_accuracy_pct
FROM model_performance_summary
WHERE total_verdicts >= 3
  AND accuracy_pct IS NOT NULL
ORDER BY lens, accuracy_pct DESC, avg_cost_usd ASC;

-- Per-lens dissent leader: the model that is RIGHT when it goes against the group
-- Minimum 3 dissent verdicts to qualify — prevents a single lucky call from winning
CREATE OR REPLACE VIEW model_lens_dissent_leader AS
SELECT DISTINCT ON (lens)
  lens, model, provider, dissent_accuracy_pct, dissent_verdicts, avg_cost_usd,
  accuracy_pct
FROM model_performance_summary
WHERE dissent_verdicts >= 3
  AND dissent_accuracy_pct IS NOT NULL
ORDER BY lens, dissent_accuracy_pct DESC, avg_cost_usd ASC;
