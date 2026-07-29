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
