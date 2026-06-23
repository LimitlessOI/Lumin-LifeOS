/**
 * SYNOPSIS: LifeRE experiment engine — A/B with receipts.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */

export function createLifeREExperimentEngine({ pool = null } = {}) {
  async function startExperiment({ tenantId = 'default', userId, variantA, variantB, metric }) {
    const experimentId = `exp_${Date.now()}`;
    if (pool) {
      await pool.query(
        `INSERT INTO lifere_experiments (tenant_id, user_id, experiment_id, variant_a, variant_b, metric, status)
         VALUES ($1,$2,$3,$4,$5,$6,'running')`,
        [tenantId, userId, experimentId, variantA, variantB, metric]
      );
    }
    return { ok: true, experiment_id: experimentId, status: 'running' };
  }

  async function recordResult({ tenantId = 'default', userId, experimentId, result }) {
    if (pool) {
      await pool.query(
        `UPDATE lifere_experiments SET result = $1, status = 'complete'
         WHERE tenant_id = $2 AND user_id = $3 AND experiment_id = $4`,
        [result, tenantId, userId, experimentId]
      );
    }
    return { ok: true, experiment_id: experimentId, result };
  }

  return { startExperiment, recordResult };
}
