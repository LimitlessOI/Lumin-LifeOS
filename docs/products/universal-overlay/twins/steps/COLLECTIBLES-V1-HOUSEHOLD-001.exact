/**
 * SYNOPSIS: Household membership for shared Collectibles Vault access.
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 */

/**
 * @param {{ pool: import('pg').Pool, logger?: object }} deps
 */
export function createHouseholdService({ pool, logger } = {}) {
  if (!pool) throw new Error('pool required');
  const log = logger || { info() {}, warn() {}, error() {} };

  async function listHouseholdTwins(householdId) {
    if (!householdId) return [];
    const result = await pool.query(
      `SELECT id, owner_user_id, household_id, display_name, needs_review, identity_status, category_id
         FROM collectible_twins
        WHERE household_id = $1 AND deleted_at IS NULL
        ORDER BY updated_at DESC`,
      [householdId],
    );
    return result.rows;
  }

  async function assignTwinHousehold(twinId, householdId, actorUserId = null) {
    if (!twinId) throw new Error('twinId required');
    const result = await pool.query(
      `UPDATE collectible_twins
          SET household_id = $2, updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
      RETURNING id, household_id, owner_user_id, display_name`,
      [twinId, householdId || null],
    );
    if (!result.rows.length) throw new Error(`twin not found: ${twinId}`);
    await pool.query(
      `INSERT INTO collectible_audit_events (id, twin_id, actor_user_id, event_type, payload)
       VALUES (gen_random_uuid(), $1, $2, 'household_assign', $3::jsonb)`,
      [twinId, actorUserId, JSON.stringify({ household_id: householdId || null })],
    );
    log.info?.({ twinId, householdId }, 'assignTwinHousehold');
    return result.rows[0];
  }

  return { listHouseholdTwins, assignTwinHousehold };
}
