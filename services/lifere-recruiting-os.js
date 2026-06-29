/**
 * SYNOPSIS: LifeRE recruiting OS pipeline.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */

export function createLifeRERecruitingOS({ pool = null } = {}) {
  async function listPipeline({ tenantId = 'default', userId }) {
    if (!pool) return { ok: true, candidates: [] };
    const { rows } = await pool.query(
      `SELECT * FROM lifere_recruiting_pipeline WHERE tenant_id = $1 AND user_id = $2 ORDER BY updated_at DESC`,
      [tenantId, userId]
    );
    return { ok: true, candidates: rows };
  }

  async function upsertCandidate({ tenantId = 'default', userId, candidateName, stage, notes = '' }) {
    if (!pool) {
      return { ok: true, candidate: { candidate_name: candidateName, stage, notes }, persisted: false };
    }
    const { rows } = await pool.query(
      `INSERT INTO lifere_recruiting_pipeline (tenant_id, user_id, candidate_name, stage, notes, updated_at)
       VALUES ($1,$2,$3,$4,$5, now()) RETURNING *`,
      [tenantId, userId, candidateName, stage, notes]
    );
    return { ok: true, candidate: rows[0], persisted: true };
  }

  return { listPipeline, upsertCandidate };
}
