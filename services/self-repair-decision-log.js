/**
 * SYNOPSIS: Exports recordFactoryDecision — services/self-repair-decision-log.js.
 */
import pg from 'pg';

export async function recordFactoryDecision(pool, { decision, escalation_claim = null, tier_actually_run = null, cost_tokens = null, cost_ms = null }) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS self_repair_decision_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      decision TEXT NOT NULL,
      escalation_claim TEXT,
      tier_actually_run TEXT,
      cost_tokens INTEGER,
      cost_ms INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const text = `
    INSERT INTO self_repair_decision_log (decision, escalation_claim, tier_actually_run, cost_tokens, cost_ms)
    VALUES ($1, $2, $3, $4, $5)
  `;
  const values = [decision, escalation_claim, tier_actually_run, cost_tokens, cost_ms];
  await pool.query(text, values);
}

export async function getDecisionLog(pool, { limit = 50 } = {}) {
  const text = `
    SELECT * FROM self_repair_decision_log
    ORDER BY created_at DESC
    LIMIT $1
  `;
  const values = [limit];
  const result = await pool.query(text, values);
  return result.rows;
}
