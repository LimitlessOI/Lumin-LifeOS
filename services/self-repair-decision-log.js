/**
 * SYNOPSIS: Exports recordFactoryDecision — services/self-repair-decision-log.js.
 */
import { Pool } from 'pg';

export async function recordFactoryDecision(pool, { decision, escalation_claim = null, tier_actually_run = null, cost_tokens = null, cost_ms = null }) {
  const query = `
    CREATE TABLE IF NOT EXISTS self_repair_decision_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      decision TEXT NOT NULL,
      escalation_claim TEXT,
      tier_actually_run TEXT,
      cost_tokens INTEGER,
      cost_ms INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    INSERT INTO self_repair_decision_log (decision, escalation_claim, tier_actually_run, cost_tokens, cost_ms)
    VALUES ($1, $2, $3, $4, $5);
  `;
  await pool.query(query, [decision, escalation_claim, tier_actually_run, cost_tokens, cost_ms]);
}

export async function getDecisionLog(pool, { limit = 50 } = {}) {
  const query = `
    SELECT * FROM self_repair_decision_log
    ORDER BY created_at DESC
    LIMIT $1;
  `;
  const result = await pool.query(query, [limit]);
  return result.rows;
}