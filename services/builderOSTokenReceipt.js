/**
 * SYNOPSIS: Service to store token receipt information upon build completion.
 * @ssot docs/products/token-accounting-os/PRODUCT_HOME.md
 */
export async function generateTokenReceipt(deps, payload) {
  const { pool, logger } = deps;
  const {
    segment_id,
    project_slug,
    active_task_id,
    status,
    completed_at,
    elapsed_minutes,
    council_guidance,
    files_written,
    scope_violation,
    halt_context,
    token_budget,
    commit_sha
  } = payload || {};

  try {
    const { rows } = await pool.query(
      `INSERT INTO builder_task_receipts (
        segment_id,
        project_slug,
        active_task_id,
        status,
        completed_at,
        elapsed_minutes,
        council_guidance,
        files_written,
        scope_violation,
        halt_context,
        token_budget,
        commit_sha
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, created_at, updated_at`,
      [
        segment_id,
        project_slug,
        active_task_id,
        status,
        completed_at,
        elapsed_minutes,
        council_guidance,
        files_written,
        scope_violation,
        halt_context,
        token_budget,
        commit_sha
      ]
    );
    return rows[0] || null;
  } catch (error) {
    logger.error({ error, payload }, 'Error in generateTokenReceipt');
    throw new Error('Failed to generate token receipt');
  }
}