/**
 * services/data-sovereignty.js
 *
 * Full erasure on demand. User data belongs to the user.
 * When a user requests deletion, cascade through all LifeOS tables,
 * log exactly what was removed, return a confirmation hash.
 *
 * Exports:
 *   createDataSovereignty({ pool, logger }) → DataSovereignty
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import crypto from 'node:crypto';

// All LifeOS tables that contain user_id — hardcoded for safety
// (never dynamically discovered — accidental table scan would be a data risk)
const LIFEOS_USER_TABLES = [
  'commitments',
  'commitment_prods',
  'integrity_score_log',
  'joy_checkins',
  'joy_score_log',
  'health_checkins',
  'inner_work_log',
  'daily_mirror_log',
  'lifeos_notification_queue',
  'lifeos_outreach_tasks',
  'lifeos_communication_log',
  'lifeos_calendar_rules',
  'wearable_data',
  'health_correlations',
  'emergency_events',
  'emergency_contacts',
  'conversation_debriefs',
  'emotional_patterns',
  'parenting_moments',
  'repair_actions',
  'inner_work_effectiveness',
  'purpose_profiles',
  'energy_observations',
  'dreams',
  'fulfillment_orders',
  'truth_delivery_log',
  'relationship_checkins',
  'shared_commitments',
  'victory_moments',
  'victory_reels',
];

export function createDataSovereignty({ pool, logger }) {
  const log = logger || console;

  /**
   * Delete all data for a user across every LifeOS table.
   * Non-fatal per-table: errors are collected and reported but do not
   * stop the cascade.
   *
   * @param {number|string} userId
   * @param {object}  [opts]
   * @param {string}  [opts.initiatedBy='user']  'user'|'admin'|'legal'
   * @returns {Promise<{ok: boolean, records_deleted: number, tables_cleared: number, confirmation_hash: string, errors: string[]}>}
   */
  async function deleteAllUserData(userId, { initiatedBy = 'user' } = {}) {
    const uid = parseInt(userId, 10);
    if (!uid || isNaN(uid)) throw new Error('Invalid userId');

    const tablesClearedNames = [];
    let recordsDeleted = 0;
    const errors = [];

    // 1. Delete from every known user table
    for (const table of LIFEOS_USER_TABLES) {
      try {
        const result = await pool.query(
          `DELETE FROM ${table} WHERE user_id = $1`,
          [uid]
        );
        const count = result.rowCount || 0;
        if (count > 0) {
          tablesClearedNames.push(table);
          recordsDeleted += count;
        }
      } catch (err) {
        // Table may not exist yet (pre-migration) — log and continue
        const msg = `Table ${table}: ${err.message}`;
        log.warn ? log.warn({ err, table }, msg) : log.warn(msg);
        errors.push(msg);
      }
    }

    // 2. Soft-delete the lifeos_users row — preserve handle for audit trail,
    //    clear sensitive identity fields
    try {
      await pool.query(`
        UPDATE lifeos_users
        SET
          active          = FALSE,
          be_statement    = NULL,
          do_statement    = NULL,
          have_vision     = NULL,
          updated_at      = NOW()
        WHERE id = $1
      `, [uid]);
      tablesClearedNames.push('lifeos_users (soft-deleted)');
    } catch (err) {
      const msg = `lifeos_users soft-delete: ${err.message}`;
      log.warn ? log.warn({ err }, msg) : log.warn(msg);
      errors.push(msg);
    }

    // 3. Delete from adam_decisions where context marks this as lifeos data
    try {
      const result = await pool.query(`
        DELETE FROM adam_decisions
        WHERE context->>'source' = 'lifeos'
          AND (context->>'user_id')::bigint = $1
      `, [uid]);
      const count = result.rowCount || 0;
      if (count > 0) {
        tablesClearedNames.push('adam_decisions');
        recordsDeleted += count;
      }
    } catch (err) {
      // Non-fatal — adam_decisions may not have this structure on all deployments
      const msg = `adam_decisions: ${err.message}`;
      log.warn ? log.warn({ err }, msg) : log.warn(msg);
      errors.push(msg);
    }

    // 4. Compute confirmation hash
    const completedAt = new Date();
    const confirmation_hash = crypto
      .createHash('sha256')
      .update(`${uid}:${Date.now()}`)
      .digest('hex');

    // 5. Insert deletion audit record
    try {
      await pool.query(`
        INSERT INTO data_deletion_log
          (user_id, completed_at, tables_cleared, records_deleted, confirmation_hash, initiated_by)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        uid,
        completedAt,
        tablesClearedNames,
        recordsDeleted,
        confirmation_hash,
        initiatedBy,
      ]);
    } catch (err) {
      // Even if the audit log fails, the deletion already happened — report the error
      const msg = `data_deletion_log insert failed: ${err.message}`;
      log.error ? log.error({ err }, msg) : log.error(msg);
      errors.push(msg);
    }

    return {
      ok: true,
      records_deleted: recordsDeleted,
      tables_cleared: tablesClearedNames.length,
      confirmation_hash,
      errors,
    };
  }

  /**
   * Get the current consent state for a user across all features.
   * Returns only the most recent action per feature.
   *
   * @param {number|string} userId
   * @returns {Promise<Record<string, 'granted'|'revoked'>>}
   */
  async function getConsent(userId) {
    const uid = parseInt(userId, 10);
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (feature)
        feature,
        action
      FROM consent_registry
      WHERE user_id = $1
      ORDER BY feature, consented_at DESC
    `, [uid]);

    const result = {};
    for (const row of rows) {
      result[row.feature] = row.action;
    }
    return result;
  }

  /**
   * Get all past deletion events for a user.
   *
   * @param {number|string} userId
   * @returns {Promise<Array>}
   */
  async function getDeletionLog(userId) {
    const uid = parseInt(userId, 10);
    const { rows } = await pool.query(`
      SELECT *
      FROM data_deletion_log
      WHERE user_id = $1
      ORDER BY requested_at DESC
    `, [uid]);
    return rows;
  }

  return {
    deleteAllUserData,
    getConsent,
    getDeletionLog,
  };
}
