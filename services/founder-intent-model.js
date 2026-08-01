/**
 * SYNOPSIS: services/founder-intent-model.js
 * North Star §2.0H Founder Intent Model Law ("Founder Intent Model" is the
 * constitutional term; "Adam Simulator" is the internal implementation
 * name, per Companion §0.7). Confirmed missing entirely this session --
 * nothing anywhere preserved founder decisions in a structured, queryable
 * way.
 *
 * Deliberate, safe Tier-0 scope: this records decisions the founder has
 * ALREADY, EXPLICITLY made -- it does not predict what he would decide.
 * Building a real prediction engine now, before there is any real decision
 * history to calibrate against, would itself be "assumptive steering"
 * (North Star §2.15 -- forbidden) dressed up as infrastructure. §2.0H's own
 * first purpose is "preserve founder intent" -- this is that, built for
 * real, with real data. Prediction, accuracy measurement, and trust
 * delegation (the law's later purposes) are honestly left for once this
 * log has enough real history to make prediction meaningful rather than
 * guessed.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

async function ensureTable(pool) {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS founder_decision_log (
      id SERIAL PRIMARY KEY,
      decision_text TEXT NOT NULL,
      context TEXT,
      category TEXT,
      source TEXT NOT NULL DEFAULT 'session_quote',
      decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`
  );
}

const VALID_CATEGORIES = new Set([
  'governance', 'product_scope', 'financial', 'quality_standard',
  'process', 'priority', 'other',
  // Added 2026-07-29 -- founder, direct: the most valuable thing in the
  // historical corpus is not feature ideas, it's what he learned the hard
  // way about how AI actually fails him (lies, takes shortcuts, misses
  // obvious connections he had to point out himself) and his own original
  // ideas/insights. Both shape his decisions as much as explicit directives
  // do, so they belong in the same log, not a separate one.
  'ai_failure_pattern', 'founder_insight',
]);

/**
 * Record a real, already-made founder decision. Not a prediction, not an
 * inference -- decision_text should be the founder's own words or a
 * faithful paraphrase, with context explaining what prompted it.
 */
export async function recordFounderDecision(pool, {
  decision_text,
  context = null,
  category = 'other',
  source = 'session_quote',
  decided_at = null,
} = {}) {
  const text = String(decision_text || '').trim();
  if (!pool || !text) return { ok: false, reason: 'decision_text required' };
  await ensureTable(pool);
  const cat = VALID_CATEGORIES.has(category) ? category : 'other';
  const { rows } = await pool.query(
    `INSERT INTO founder_decision_log (decision_text, context, category, source, decided_at)
     VALUES ($1, $2, $3, $4, COALESCE($5, now()))
     RETURNING id, decided_at`,
    [text, context, cat, source, decided_at]
  );
  return { ok: true, id: rows[0].id, decided_at: rows[0].decided_at };
}

export async function getFounderDecisionHistory(pool, { category = null, limit = 100 } = {}) {
  if (!pool) return { ok: false, reason: 'no_pool' };
  await ensureTable(pool);
  const params = [];
  let where = '';
  if (category && VALID_CATEGORIES.has(category)) {
    params.push(category);
    where = 'WHERE category = $1';
  }
  params.push(Math.min(500, Math.max(1, Number(limit) || 100)));
  const { rows } = await pool.query(
    `SELECT id, decision_text, context, category, source, decided_at
     FROM founder_decision_log ${where}
     ORDER BY decided_at DESC
     LIMIT $${params.length}`,
    params
  );
  return { ok: true, count: rows.length, decisions: rows };
}

/**
 * Simple, honest keyword search over the log -- "what did Adam decide
 * about X" for a cold agent, without a real semantic-search build (that's
 * a real, separate future enhancement once there's enough volume to need
 * it, not needed for the first 100 entries).
 */
export async function findFounderDecisions(pool, { query, limit = 20 } = {}) {
  if (!pool || !String(query || '').trim()) return { ok: false, reason: 'query required' };
  await ensureTable(pool);
  const { rows } = await pool.query(
    `SELECT id, decision_text, context, category, source, decided_at
     FROM founder_decision_log
     WHERE decision_text ILIKE $1 OR context ILIKE $1
     ORDER BY decided_at DESC
     LIMIT $2`,
    [`%${String(query).trim()}%`, Math.min(100, Math.max(1, Number(limit) || 20))]
  );
  return { ok: true, count: rows.length, decisions: rows };
}

async function ensurePredictionTables(pool) {
  await ensureTable(pool);
  await pool.query(
    `CREATE TABLE IF NOT EXISTS decision_predictions (
      id SERIAL PRIMARY KEY,
      decision_id INTEGER REFERENCES founder_decision_log(id) ON DELETE SET NULL,
      decision_ref TEXT,
      predicted_outcome TEXT NOT NULL,
      why TEXT,
      confidence NUMERIC(3,2) CHECK (confidence BETWEEN 0 AND 1),
      predicted_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`
  );
  await pool.query(
    `CREATE TABLE IF NOT EXISTS decision_reality (
      id SERIAL PRIMARY KEY,
      prediction_id INTEGER REFERENCES decision_predictions(id) ON DELETE CASCADE,
      actual_outcome TEXT NOT NULL,
      evidence JSONB,
      reality_score NUMERIC(3,2) CHECK (reality_score BETWEEN -1 AND 1),
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`
  );
  await pool.query(
    `CREATE TABLE IF NOT EXISTS decision_calibration (
      id SERIAL PRIMARY KEY,
      prediction_id INTEGER REFERENCES decision_predictions(id) ON DELETE CASCADE,
      delta TEXT,
      lesson TEXT,
      updated_confidence NUMERIC(3,2) CHECK (updated_confidence BETWEEN 0 AND 1),
      action_taken TEXT,
      calibrated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`
  );
}

export async function predictDecisionOutcome(pool, {
  decision_id,
  decision_ref,
  predicted_outcome,
  why,
  confidence = 0.5,
} = {}) {
  if (!pool) return { ok: false, reason: 'no_pool' };
  if (!predicted_outcome) return { ok: false, reason: 'predicted_outcome required' };
  await ensurePredictionTables(pool);
  const { rows } = await pool.query(
    `INSERT INTO decision_predictions (decision_id, decision_ref, predicted_outcome, why, confidence)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [decision_id || null, decision_ref || null, predicted_outcome, why || null, Math.min(1, Math.max(0, Number(confidence) || 0.5))]
  );
  return { ok: true, prediction_id: rows[0].id };
}

export async function recordDecisionReality(pool, {
  prediction_id,
  actual_outcome,
  evidence = {},
  reality_score = 0,
} = {}) {
  if (!pool || !prediction_id) return { ok: false, reason: 'prediction_id required' };
  if (!actual_outcome) return { ok: false, reason: 'actual_outcome required' };
  await ensurePredictionTables(pool);
  const { rows } = await pool.query(
    `INSERT INTO decision_reality (prediction_id, actual_outcome, evidence, reality_score)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [prediction_id, actual_outcome, JSON.stringify(evidence || {}), Math.min(1, Math.max(-1, Number(reality_score) || 0))]
  );
  return { ok: true, reality_id: rows[0].id };
}

export async function calibrateDecision(pool, {
  prediction_id,
  delta,
  lesson,
  updated_confidence,
  action_taken,
} = {}) {
  if (!pool || !prediction_id) return { ok: false, reason: 'prediction_id required' };
  await ensurePredictionTables(pool);
  const { rows } = await pool.query(
    `INSERT INTO decision_calibration (prediction_id, delta, lesson, updated_confidence, action_taken)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [prediction_id, delta || null, lesson || null, updated_confidence == null ? null : Math.min(1, Math.max(0, Number(updated_confidence))), action_taken || null]
  );
  return { ok: true, calibration_id: rows[0].id };
}

export async function getDecisionCalibrationSummary(pool, { decision_ref, limit = 20 } = {}) {
  if (!pool || !decision_ref) return { ok: false, reason: 'decision_ref required' };
  await ensurePredictionTables(pool);
  const { rows } = await pool.query(
    `SELECT
       p.id AS prediction_id,
       p.predicted_outcome,
       p.confidence AS predicted_confidence,
       r.actual_outcome,
       r.reality_score,
       c.delta,
       c.lesson,
       c.updated_confidence,
       c.action_taken
     FROM decision_predictions p
     LEFT JOIN decision_reality r ON r.prediction_id = p.id
     LEFT JOIN decision_calibration c ON c.prediction_id = p.id
     WHERE p.decision_ref = $1
     ORDER BY p.predicted_at DESC
     LIMIT $2`,
    [decision_ref, Math.min(100, Math.max(1, Number(limit) || 20))]
  );
  return { ok: true, count: rows.length, summary: rows };
}
