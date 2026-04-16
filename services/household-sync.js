/**
 * services/household-sync.js
 *
 * Manages household relationships between LifeOS users.
 * Controls what is shared vs private between linked users.
 *
 * Exports:
 *   createHouseholdSync({ pool }) → HouseholdSync
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export function createHouseholdSync({ pool }) {

  /**
   * Link two users together in a household relationship.
   * @param {object} p
   * @param {number} p.userIdA
   * @param {number} p.userIdB
   * @param {string} [p.relationship='partner']
   * @param {object} [p.permissions={}]
   * @returns {Promise<object>} The household_links row
   */
  async function linkUsers({ userIdA, userIdB, relationship = 'partner', permissions = {} }) {
    const { rows } = await pool.query(`
      INSERT INTO household_links (user_id_a, user_id_b, relationship, permissions)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id_a, user_id_b) DO UPDATE
        SET relationship = EXCLUDED.relationship,
            permissions  = EXCLUDED.permissions,
            active       = TRUE
      RETURNING *
    `, [userIdA, userIdB, relationship, JSON.stringify(permissions)]);
    return rows[0];
  }

  /**
   * Find the household link between two users (checks both directions).
   * @returns {Promise<object|null>}
   */
  async function getLink(userIdA, userIdB) {
    const { rows } = await pool.query(`
      SELECT * FROM household_links
      WHERE (user_id_a = $1 AND user_id_b = $2)
         OR (user_id_a = $2 AND user_id_b = $1)
      AND active = TRUE
      LIMIT 1
    `, [userIdA, userIdB]);
    return rows[0] || null;
  }

  /**
   * Return all users linked to this user, with permissions context.
   * @param {number} userId
   * @returns {Promise<Array>}
   */
  async function getLinkedUsers(userId) {
    const { rows } = await pool.query(`
      SELECT
        hl.id          AS link_id,
        hl.relationship,
        hl.permissions,
        hl.active,
        CASE WHEN hl.user_id_a = $1 THEN hl.user_id_b ELSE hl.user_id_a END AS linked_user_id,
        lu.user_handle,
        lu.display_name
      FROM household_links hl
      JOIN lifeos_users lu
        ON lu.id = CASE WHEN hl.user_id_a = $1 THEN hl.user_id_b ELSE hl.user_id_a END
      WHERE (hl.user_id_a = $1 OR hl.user_id_b = $1)
        AND hl.active = TRUE
      ORDER BY hl.created_at DESC
    `, [userId]);
    return rows;
  }

  /**
   * Share a commitment with a linked user.
   * @param {object} p
   * @param {number} p.commitmentId
   * @param {number} p.sharedWithUserId
   * @returns {Promise<object>}
   */
  async function shareCommitment({ commitmentId, sharedWithUserId }) {
    const { rows } = await pool.query(`
      INSERT INTO shared_commitments (commitment_id, shared_with_user_id)
      VALUES ($1, $2)
      ON CONFLICT (commitment_id, shared_with_user_id) DO NOTHING
      RETURNING *
    `, [commitmentId, sharedWithUserId]);
    return rows[0] || null;
  }

  /**
   * Return commitments that have been shared WITH this user (from their partner).
   * @param {number} userId
   * @returns {Promise<Array>}
   */
  async function getSharedCommitments(userId) {
    const { rows } = await pool.query(`
      SELECT
        c.*,
        lu.display_name AS owner_name,
        sc.shared_at
      FROM shared_commitments sc
      JOIN commitments c ON c.id = sc.commitment_id
      JOIN lifeos_users lu ON lu.id = c.user_id
      WHERE sc.shared_with_user_id = $1
      ORDER BY sc.shared_at DESC
    `, [userId]);
    return rows;
  }

  /**
   * Log a relationship health check-in.
   * @param {object} p
   * @returns {Promise<object>}
   */
  async function logRelationshipCheckin({
    initiatorUserId,
    partnerUserId,
    connectionScore,
    conflictLevel,
    whatIsWorking,
    whatNeedsAttention,
    gratitudeNote,
  }) {
    const { rows } = await pool.query(`
      INSERT INTO relationship_checkins
        (initiator_user_id, partner_user_id, connection_score, conflict_level,
         what_is_working, what_needs_attention, gratitude_note)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      initiatorUserId, partnerUserId,
      connectionScore || null, conflictLevel || null,
      whatIsWorking || null, whatNeedsAttention || null, gratitudeNote || null,
    ]);
    return rows[0];
  }

  /**
   * Return recent check-ins and computed averages for a pair.
   * @param {number} userIdA
   * @param {number} userIdB
   * @param {object} [opts]
   * @param {number} [opts.days=30]
   * @returns {Promise<{ checkins: Array, averages: object }>}
   */
  async function getRelationshipPulse(userIdA, userIdB, { days = 30 } = {}) {
    const { rows } = await pool.query(`
      SELECT *
      FROM relationship_checkins
      WHERE (
          (initiator_user_id = $1 AND partner_user_id = $2)
          OR (initiator_user_id = $2 AND partner_user_id = $1)
      )
      AND checkin_date >= CURRENT_DATE - ($3 || ' days')::INTERVAL
      ORDER BY checkin_date DESC
    `, [userIdA, userIdB, days]);

    const averages = rows.length
      ? {
          avg_connection: +(rows.reduce((s, r) => s + (r.connection_score || 0), 0) / rows.filter(r => r.connection_score).length || 0).toFixed(1),
          avg_conflict:   +(rows.reduce((s, r) => s + (r.conflict_level   || 0), 0) / rows.filter(r => r.conflict_level  ).length || 0).toFixed(1),
          total_checkins: rows.length,
        }
      : { avg_connection: null, avg_conflict: null, total_checkins: 0 };

    return { checkins: rows, averages };
  }

  /**
   * Update the permissions JSONB on a household link.
   * @param {number} linkId
   * @param {object} permissions
   * @returns {Promise<object>}
   */
  async function updatePermissions(linkId, permissions) {
    const { rows } = await pool.query(`
      UPDATE household_links
      SET permissions = $2
      WHERE id = $1
      RETURNING *
    `, [linkId, JSON.stringify(permissions)]);
    return rows[0] || null;
  }

  return {
    linkUsers,
    getLink,
    getLinkedUsers,
    shareCommitment,
    getSharedCommitments,
    logRelationshipCheckin,
    getRelationshipPulse,
    updatePermissions,
  };
}
