/**
 * SYNOPSIS: Exports linkTokenReceiptToTask — services/kernel-token-linker.js.
 * @ssot docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md
 */

/**
 * Links a token usage receipt to a build task in the ledger.
 *
 * @param {object} pool - The PostgreSQL connection pool.
 * @param {string} taskId - The ID of the build task.
 * @param {number} [sinceMs=Date.now() - 120000] - The timestamp in milliseconds to search for token receipts from.
 * @returns {Promise<{ linked: boolean, token_id: string | null, method: 'direct' | 'window' | null, rows_updated: number, error?: string }>}
 */
export async function linkTokenReceiptToTask(pool, taskId, sinceMs = Date.now() - 120000) {
  if (!pool) {
    return { linked: false, error: 'no_pool', token_id: null, method: null, rows_updated: 0 };
  }

  let tokenRow = null;
  let method = null;
  let rowsUpdated = 0;

  try {
    // Step 1: Try to find a token receipt directly linked by request_id or session_id
    const directResult = await pool.query(
      'SELECT id FROM token_usage_log WHERE request_id = $1 OR session_id = $1 ORDER BY logged_at DESC LIMIT 1',
      [taskId]
    );

    if (directResult.rows.length > 0) {
      tokenRow = directResult.rows[0];
      method = 'direct';
    } else {
      // Step 2: If not found directly, try to find a token receipt within the time window
      const windowResult = await pool.query(
        'SELECT id FROM token_usage_log WHERE logged_at >= $1::timestamptz ORDER BY logged_at DESC LIMIT 1',
        [new Date(sinceMs).toISOString()]
      );

      if (windowResult.rows.length > 0) {
        tokenRow = windowResult.rows[0];
        method = 'window';
      }
    }

    // Step 3: If a token receipt is found, update the build_task_ledger
    if (tokenRow) {
      const updateResult = await pool.query(
        'UPDATE build_task_ledger SET token_receipt_id = $2, updated_at = NOW() WHERE task_id = $1 AND token_receipt_id IS NULL',
        [taskId, tokenRow.id]
      );
      rowsUpdated = updateResult.rowCount;
    }

    return {
      linked: rowsUpdated > 0,
      token_id: tokenRow?.id || null,
      method: method,
      rows_updated: rowsUpdated,
    };
  } catch (error) {
    console.error(`Error linking token receipt to task ${taskId}:`, error);
    return {
      linked: false,
      token_id: null,
      method: null,
      rows_updated: 0,
    };
  }
}