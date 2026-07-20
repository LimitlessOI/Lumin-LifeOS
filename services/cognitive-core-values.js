/**
 * SYNOPSIS: Cognitive Core Era-3 #14 — Value Drift Monitor (pool-only).
 * Principles are hypotheses (stated | revealed | inferred), each with confidence + evidence.
 * Drift events record where a real decision diverged from a stated principle — surfaced, never
 * auto-punished (Law 1: the divergence may mean the value changed, not that the choice was wrong).
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */

function clamp01(n, fb = 0.4) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fb;
}

/**
 * @param {{ pool: import('pg').Pool, logger?: Console }} deps
 */
export function createCognitiveCoreValues(deps = {}) {
  const pool = deps.pool;
  const logger = deps.logger || console;

  async function createValue({ userId, principle, hypothesis = null, confidence = 0.4, source = 'stated', evidence = [] }) {
    if (!pool) throw new Error('cognitive_core_requires_pool');
    if (!principle) throw new Error('principle_required');
    const src = ['stated', 'revealed', 'inferred'].includes(source) ? source : 'stated';
    const { rows } = await pool.query(
      `INSERT INTO judgment_values (user_id, principle, hypothesis, confidence, source, evidence)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb) RETURNING *`,
      [
        String(userId), String(principle).slice(0, 500),
        hypothesis ? String(hypothesis).slice(0, 1000) : null,
        clamp01(confidence), src,
        JSON.stringify(Array.isArray(evidence) ? evidence : []),
      ],
    );
    return rows[0];
  }

  async function listValues(userId, { status = 'active' } = {}) {
    if (!pool) throw new Error('cognitive_core_requires_pool');
    const { rows } = await pool.query(
      `SELECT * FROM judgment_values WHERE user_id = $1 AND status = $2 ORDER BY confidence DESC, updated_at DESC`,
      [String(userId), status],
    );
    return rows;
  }

  async function recordDriftEvent({ userId, decisionId = null, valueId = null, principle = null, driftDescription, severity = 'low' }) {
    if (!pool) throw new Error('cognitive_core_requires_pool');
    if (!driftDescription) throw new Error('drift_description_required');
    const sev = ['low', 'medium', 'high'].includes(severity) ? severity : 'low';
    const { rows } = await pool.query(
      `INSERT INTO value_drift_events (user_id, decision_id, value_id, principle, drift_description, severity)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [String(userId), decisionId, valueId, principle ? String(principle).slice(0, 500) : null,
        String(driftDescription).slice(0, 2000), sev],
    );
    return rows[0];
  }

  async function listDriftEvents(userId, { resolved = false, limit = 50 } = {}) {
    if (!pool) throw new Error('cognitive_core_requires_pool');
    const { rows } = await pool.query(
      `SELECT * FROM value_drift_events WHERE user_id = $1 AND resolved = $2 ORDER BY created_at DESC LIMIT $3`,
      [String(userId), resolved, Math.min(200, Math.max(1, Number(limit) || 50))],
    );
    return rows;
  }

  async function resolveDrift(driftId) {
    const { rows } = await pool.query(
      `UPDATE value_drift_events SET resolved = TRUE WHERE drift_id = $1 RETURNING *`,
      [driftId],
    );
    return rows[0] || null;
  }

  return { createValue, listValues, recordDriftEvent, listDriftEvents, resolveDrift };
}

export default createCognitiveCoreValues;
