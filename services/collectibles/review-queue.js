/**
 * SYNOPSIS: Needs Review queue — list + resolve against collectible_twins.
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 */

/**
 * @param {{ pool: import('pg').Pool, logger?: object }} deps
 */
export function createReviewQueueService({ pool, logger } = {}) {
  if (!pool) throw new Error('pool required');
  const log = logger || { info() {}, warn() {}, error() {} };

  async function listNeedsReview(ownerUserId) {
    if (!ownerUserId) return [];
    const result = await pool.query(
      `SELECT id, owner_user_id, display_name, identity_status, needs_review,
              needs_review_reasons, category_id, updated_at, created_at
         FROM collectible_twins
        WHERE owner_user_id = $1
          AND needs_review = TRUE
          AND deleted_at IS NULL
        ORDER BY created_at ASC`,
      [ownerUserId],
    );
    return result.rows;
  }

  async function resolveReview(twinId, correction = {}) {
    if (!twinId) throw new Error('twinId required');
    const confirmAsIs = correction?.confirm_as_is === true;
    const reasons = Array.isArray(correction?.needs_review_reasons)
      ? correction.needs_review_reasons
      : [];
    const needs_review = confirmAsIs ? false : Boolean(correction?.needs_review);
    const display_name = correction?.display_name != null
      ? String(correction.display_name)
      : null;
    const identity_status = correction?.identity_status != null
      ? String(correction.identity_status)
      : null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const updated = await client.query(
        `UPDATE collectible_twins
            SET needs_review = $2,
                needs_review_reasons = $3::jsonb,
                display_name = COALESCE($4, display_name),
                identity_status = COALESCE($5, identity_status),
                updated_at = NOW()
          WHERE id = $1
            AND deleted_at IS NULL
        RETURNING id, owner_user_id, display_name, identity_status, needs_review, needs_review_reasons`,
        [
          twinId,
          needs_review,
          JSON.stringify(confirmAsIs ? [] : reasons),
          display_name,
          identity_status,
        ],
      );
      if (!updated.rows.length) {
        throw new Error(`twin not found: ${twinId}`);
      }
      await client.query(
        `INSERT INTO collectible_audit_events (id, twin_id, actor_user_id, event_type, payload)
         VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb)`,
        [
          twinId,
          correction?.actor_user_id || null,
          'review_resolve',
          JSON.stringify({ confirm_as_is: confirmAsIs, correction }),
        ],
      );
      await client.query('COMMIT');
      log.info?.({ twinId, needs_review }, 'resolveReview');
      return updated.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      log.error?.({ err: err.message, twinId }, 'resolveReview failed');
      throw err;
    } finally {
      client.release();
    }
  }

  return { listNeedsReview, resolveReview };
}
