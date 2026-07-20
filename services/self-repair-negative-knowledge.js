/**
 * SYNOPSIS: Exports recordFailedApproach — services/self-repair-negative-knowledge.js.
 */
import { Pool } from 'pg';

export async function recordFailedApproach(pool, { target, approach_signature, failed_because }) {
  const query = `
    INSERT INTO self_repair_negative_knowledge (target, approach_signature, failed_because)
    VALUES ($1, $2, $3)
    ON CONFLICT (target, approach_signature) 
    DO UPDATE SET times_seen = self_repair_negative_knowledge.times_seen + 1;
  `;
  await pool.query(query, [target, approach_signature, failed_because]);
}

export async function hasFailedApproach(pool, { target, approach_signature }) {
  const query = `
    SELECT * FROM self_repair_negative_knowledge
    WHERE target = $1 AND approach_signature = $2;
  `;
  const res = await pool.query(query, [target, approach_signature]);
  return res.rows.length > 0 ? res.rows[0] : null;
}
