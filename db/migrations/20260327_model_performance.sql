-- Model Performance Ledger: tracks per-model, per-lens verdicts and outcome correlation
-- @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md

CREATE TABLE IF NOT EXISTS model_verdict_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id    UUID REFERENCES project_segments(id) ON DELETE CASCADE,
  lens          TEXT NOT NULL,                 -- 'consequences', 'time_traveler', 'trend_scout', 'great_minds', 'codebase_coherence'
  model         TEXT NOT NULL,                 -- e.g. 'gemini-2.5-pro', 'deepseek-r1-distill-llama-70b', 'claude-3-7-sonnet-20250219'
  provider      TEXT NOT NULL,                 -- 'gemini', 'groq', 'anthropic', 'perplexity'
  verdict       TEXT CHECK (verdict IN ('PROCEED', 'CAUTION', 'STOP', 'NEEDS_HUMAN')),
  latency_ms    INTEGER,
  tokens_used   INTEGER,
  cost_usd      NUMERIC(10, 6),
  raw_output    TEXT,
  logged_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Outcome correlation: filled in after build completes (references build_outcomes)
ALTER TABLE model_verdict_log
  ADD COLUMN IF NOT EXISTS outcome_id UUID REFERENCES build_outcomes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verdict_was_correct BOOLEAN;  -- NULL until outcome known

-- Summary view: accuracy + cost per model per lens
CREATE OR REPLACE VIEW model_performance_summary AS
SELECT
  mvl.lens,
  mvl.model,
  mvl.provider,
  COUNT(*)                                              AS total_verdicts,
  COUNT(*) FILTER (WHERE mvl.verdict_was_correct = true)  AS correct_verdicts,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE mvl.verdict_was_correct = true)
    / NULLIF(COUNT(*) FILTER (WHERE mvl.verdict_was_correct IS NOT NULL), 0),
    1
  )                                                     AS accuracy_pct,
  ROUND(AVG(mvl.latency_ms))                            AS avg_latency_ms,
  ROUND(AVG(mvl.cost_usd)::NUMERIC, 6)                  AS avg_cost_usd,
  SUM(mvl.cost_usd)                                     AS total_cost_usd,
  MAX(mvl.logged_at)                                    AS last_used
FROM model_verdict_log mvl
GROUP BY mvl.lens, mvl.model, mvl.provider;

-- Per-lens winner: highest accuracy among models with >= 3 scored verdicts
CREATE OR REPLACE VIEW model_lens_winner AS
SELECT DISTINCT ON (lens)
  lens,
  model,
  provider,
  accuracy_pct,
  total_verdicts,
  avg_cost_usd
FROM model_performance_summary
WHERE total_verdicts >= 3
  AND accuracy_pct IS NOT NULL
ORDER BY lens, accuracy_pct DESC, avg_cost_usd ASC;

CREATE INDEX IF NOT EXISTS idx_model_verdict_log_segment ON model_verdict_log(segment_id);
CREATE INDEX IF NOT EXISTS idx_model_verdict_log_lens_model ON model_verdict_log(lens, model);
CREATE INDEX IF NOT EXISTS idx_model_verdict_log_logged_at ON model_verdict_log(logged_at DESC);
