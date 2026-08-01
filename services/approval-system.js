/**
 * SYNOPSIS: Manages the approval process for commitments, including pending and approved states.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
export async function approveCommitment(deps, payload) {
  const { pool, logger } = deps;
  const { id } = payload || {};
  try {
    const { rows } = await pool.query(
      `UPDATE commitments SET status = 'approved', approved_at = NOW() WHERE id = $1 AND status = 'waiting approval' RETURNING *`,
      [id]
    );
    return rows[0] || null;
  } catch (error) {
    logger.error({ error, id }, 'Error in approveCommitment');
    throw new Error('Failed to approve commitment');
  }
}

export async function rejectCommitment(deps, payload) {
  const { pool, logger } = deps;
  const { id, approval_notes } = payload || {};
  try {
    const { rows } = await pool.query(
      `UPDATE commitments SET status = 'rejected', approved_at = NOW(), approval_notes = $2 WHERE id = $1 AND status = 'waiting approval' RETURNING *`,
      [id, approval_notes]
    );
    return rows[0] || null;
  } catch (error) {
    logger.error({ error, id }, 'Error in rejectCommitment');
    throw new Error('Failed to reject commitment');
  }
}
