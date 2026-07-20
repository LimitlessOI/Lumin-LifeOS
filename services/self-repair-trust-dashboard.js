/**
 * SYNOPSIS: Exports getTopHardestTargets — services/self-repair-trust-dashboard.js.
 */
import { getProvenanceLedger } from './self-repair-provenance-ledger.js';
import { getDecisionLog } from './self-repair-decision-log.js';
import { getPendingPropagationCandidates } from './self-repair-pattern-propagation.js';

export async function getTopHardestTargets(pool, { limit = 10 } = {}) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS self_repair_target_reputation (
      target_path TEXT PRIMARY KEY,
      attempts INTEGER NOT NULL DEFAULT 0,
      failures INTEGER NOT NULL DEFAULT 0,
      models_tried JSONB NOT NULL DEFAULT '[]',
      hardness_score NUMERIC NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  const { rows } = await pool.query(
    'SELECT target_path, attempts, failures, hardness_score FROM self_repair_target_reputation ORDER BY hardness_score DESC, attempts DESC LIMIT $1',
    [limit]
  );
  return rows;
}

export async function getTrustDashboardSnapshot(pool, { limit = 20 } = {}) {
  const [recent_claims, hardest_targets, recent_decisions, pending_propagation_candidates] = await Promise.all([
    (async () => {
      try {
        return await getProvenanceLedger(pool, { limit });
      } catch (error) {
        console.error('Error fetching recent claims:', error.message);
        return [];
      }
    })(),
    (async () => {
      try {
        return await getTopHardestTargets(pool, { limit });
      } catch (error) {
        console.error('Error fetching hardest targets:', error.message);
        return [];
      }
    })(),
    (async () => {
      try {
        return await getDecisionLog(pool, { limit });
      } catch (error) {
        console.error('Error fetching recent decisions:', error.message);
        return [];
      }
    })(),
    (async () => {
      try {
        return await getPendingPropagationCandidates(pool, { limit });
      } catch (error) {
        console.error('Error fetching pending propagation candidates:', error.message);
        return [];
      }
    })(),
  ]);

  return {
    recent_claims,
    hardest_targets,
    recent_decisions,
    pending_propagation_candidates,
    generated_at: new Date().toISOString(),
  };
}
