/**
 * SYNOPSIS: Records a new transaction in the database. * @param {object} transactionData - The transaction details. * @param {string} transactionData.userId - The ID of the user initiating the transaction. * @param {number} transactionData.amount - The
 */
export function createTransactionService({ pool, logger }) {

  /**
   * Records a new transaction in the database. * @param {object} transactionData - The transaction details. * @param {string} transactionData.userId - The ID of the user initiating the transaction. * @param {number} transactionData.amount - The transaction amount. * @param {string} transactionData.currency - The currency code (e.g., 'USD'). * @param {string} transactionData.type - The type of transaction (e.g., 'deposit', 'purchase'). * @param {string} [transactionData.status='pending'] - The initial status of the transaction. * @returns {Promise<object>} The newly created transaction record. * @param {string} transactionId - The ID of the transaction. * @param {string} userId - The ID of the user who owns the transaction. * @returns {Promise<object|null>} The transaction record, or null if not found/unauthorized. */
  async function getTransaction(transactionId, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM transactions WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [transactionId, userId]
    );
    if (!rows[0]) {
      const err = new Error('transaction_not_found_or_unauthorized');
      err.status = 404;
      throw err;
    }
    return rows[0];
  }

  /**
   * Lists transactions for a specific user, with optional filtering by status. * @param {string} userId - The ID of the user. * @param {object} [options] - Filtering options. * @param {string} [options.status] - Filter by transaction status (e.g., 'completed', 'pending'). * @param {number} [options.limit=50] - Maximum number of transactions to return. * @returns {Promise<Array<object>>} A list of transaction records. */
  async function listTransactions(userId, { status, limit = 50 } = {}) {
    const conditions = ['user_id = $1'];
    const params = [userId];
    let paramIndex = 1;

    if (status) {
      paramIndex++;
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
    }

    paramIndex++;
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    params.push(lim);

    const { rows } = await pool.query(
      `SELECT * FROM transactions WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT $${paramIndex}`,
      params
    );
    return rows;
  }

  /**
   * Updates the status of an existing transaction. * @param {string} transactionId - The ID of the transaction to update. * @param {string} userId - The ID of the user who owns the transaction. * @param {string} newStatus - The new status for the transaction (e.g., 'completed', 'failed'). * @returns {Promise<object>} The updated transaction record. */
  async function updateTransactionStatus(transactionId, userId, newStatus) {
    const validStatuses = new Set(['pending', 'completed', 'failed', 'refunded', 'cancelled']);
    if (!validStatuses.has(newStatus)) {
      const err = new Error('invalid_transaction_status');
      err.status = 400;
      throw err;
    }

    const { rows } = await pool.query(
      `UPDATE transactions SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *`,
      [newStatus, transactionId, userId]
    );
    if (!rows[0]) {
      const err = new Error('transaction_not_found_or_unauthorized');
      err.status = 404;
      throw err;
    }
    logger.info?.({ transactionId, userId, newStatus }, '[TC-SERVICE] Transaction status updated');
    return rows[0];
  }

  return {
    recordTransaction,
    getTransaction,
    listTransactions,
    updateTransactionStatus,
  };
}