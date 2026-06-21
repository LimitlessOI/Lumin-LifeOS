-- SYNOPSIS: Database migration — 20260327_dissent_tracking.sql.
-- Dissent tracking — skip when model_verdict_log absent (optional council table).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'model_verdict_log'
  ) THEN
    RAISE NOTICE 'skip 20260327_dissent_tracking — model_verdict_log absent';
    RETURN;
  END IF;

  ALTER TABLE model_verdict_log
    ADD COLUMN IF NOT EXISTS was_consensus_position BOOLEAN;
END $$;

-- Views only when base table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'model_verdict_log'
  ) THEN
    RETURN;
  END IF;

  EXECUTE $view$
CREATE OR REPLACE VIEW model_performance_summary AS
SELECT
  mvl.lens,
  mvl.model,
  mvl.provider,
  COUNT(*)                                                          AS total_verdicts,
  COUNT(*) FILTER (WHERE mvl.verdict_was_correct = true)           AS correct_verdicts,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE mvl.verdict_was_correct = true)
    / NULLIF(COUNT(*) FILTER (WHERE mvl.verdict_was_correct IS NOT NULL), 0), 1
  )                                                                 AS accuracy_pct,
  COUNT(*) FILTER (WHERE mvl.was_consensus_position = true)        AS consensus_verdicts,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE mvl.was_consensus_position = true AND mvl.verdict_was_correct = true)
    / NULLIF(COUNT(*) FILTER (WHERE mvl.was_consensus_position = true AND mvl.verdict_was_correct IS NOT NULL), 0), 1
  )                                                                 AS consensus_accuracy_pct,
  COUNT(*) FILTER (WHERE mvl.was_consensus_position = false)       AS dissent_verdicts,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE mvl.was_consensus_position = false AND mvl.verdict_was_correct = true)
    / NULLIF(COUNT(*) FILTER (WHERE mvl.was_consensus_position = false AND mvl.verdict_was_correct IS NOT NULL), 0), 1
  )                                                                 AS dissent_accuracy_pct,
  ROUND(AVG(mvl.latency_ms))                                       AS avg_latency_ms,
  ROUND(AVG(mvl.cost_usd)::NUMERIC, 6)                             AS avg_cost_usd,
  SUM(mvl.cost_usd)                                                 AS total_cost_usd,
  MAX(mvl.logged_at)                                                AS last_used
FROM model_verdict_log mvl
GROUP BY mvl.lens, mvl.model, mvl.provider
$view$;

  EXECUTE $view$
CREATE OR REPLACE VIEW model_lens_winner AS
SELECT DISTINCT ON (lens)
  lens, model, provider, accuracy_pct, total_verdicts, avg_cost_usd,
  dissent_accuracy_pct, consensus_accuracy_pct
FROM model_performance_summary
WHERE total_verdicts >= 3
  AND accuracy_pct IS NOT NULL
ORDER BY lens, accuracy_pct DESC, avg_cost_usd ASC
$view$;

  EXECUTE $view$
CREATE OR REPLACE VIEW model_lens_dissent_leader AS
SELECT DISTINCT ON (lens)
  lens, model, provider, dissent_accuracy_pct, dissent_verdicts, avg_cost_usd,
  accuracy_pct
FROM model_performance_summary
WHERE dissent_verdicts >= 3
  AND dissent_accuracy_pct IS NOT NULL
ORDER BY lens, dissent_accuracy_pct DESC, avg_cost_usd ASC
$view$;
END $$;
