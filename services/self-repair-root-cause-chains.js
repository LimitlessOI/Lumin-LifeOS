/**
 * SYNOPSIS: Exports recordRootCauseChain — services/self-repair-root-cause-chains.js.
 */
import { failureSignature } from './governed-autonomous-shipping-loop.js';

export async function recordRootCauseChain(pool, { symptom, investigation, cause, fix, verification, bug_shape_signature }) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS self_repair_root_cause_chains (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      symptom TEXT NOT NULL,
      investigation JSONB NOT NULL DEFAULT '[]',
      cause TEXT,
      fix TEXT,
      verification TEXT,
      bug_shape_signature TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const normalizedSignature = failureSignature(bug_shape_signature);

  await pool.query(`
    INSERT INTO self_repair_root_cause_chains (symptom, investigation, cause, fix, verification, bug_shape_signature)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [symptom, JSON.stringify(investigation), cause, fix, verification, normalizedSignature]);
}

export async function queryRootCauseChains(pool, { bug_shape_signature, limit = 10 }) {
  const normalizedSignature = failureSignature(bug_shape_signature);

  const result = await pool.query(`
    SELECT * FROM self_repair_root_cause_chains
    WHERE bug_shape_signature = $1
    ORDER BY created_at DESC
    LIMIT $2
  `, [normalizedSignature, limit]);

  return result.rows;
}