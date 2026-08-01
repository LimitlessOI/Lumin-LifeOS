/**
 * SYNOPSIS: Extend the security receipt service to process new receipt types using either tables or JSONL as backend.
 * @ssot docs/products/oil-security-divisions/PRODUCT_HOME.md
 */
export async function securityReceiptSpine(deps, payload) {
  const { pool, logger } = deps;
  const { id } = payload || {};
  try {
    const { rows } = await pool.query('SELECT * FROM security_receipt_spine WHERE id = $1', [id]);
    return rows[0] || null;
  } catch (error) {
    logger.error({ error }, 'Error in securityReceiptSpine');
    throw new Error('Failed in securityReceiptSpine');
  }
}

export async function processNewReceiptType(deps, payload) {
  const { pool, logger } = deps;
  const { receiptType, receiptData } = payload || {};
  try {
    const normalizedType = String(receiptType || '').toLowerCase();
    if (normalizedType.startsWith('table_')) {
      const table = normalizedType.substring(6);
      if (!/^[a-z_][a-z0-9_]*$/i.test(table)) {
        throw new Error('Invalid receipt table name');
      }
      const columns = Object.keys(receiptData || {});
      const values = Object.values(receiptData || {});
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      const colList = columns.map((c) => (/^[a-z_][a-z0-9_]*$/i.test(c) ? c : null)).filter(Boolean);
      if (colList.length !== columns.length) {
        throw new Error('Invalid receipt column name');
      }
      const { rows } = await pool.query(
        `INSERT INTO ${table} (${colList.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values,
      );
      return rows[0];
    }
    if (normalizedType.startsWith('jsonl_')) {
      const { rows } = await pool.query(
        'INSERT INTO jsonl_receipts (receipt_json) VALUES ($1) RETURNING *',
        [JSON.stringify(receiptData || {})],
      );
      return rows[0];
    }
    throw new Error('Unsupported receipt type');
  } catch (error) {
    logger.error({ error }, 'Error in processNewReceiptType');
    throw new Error('Failed in processNewReceiptType');
  }
}

export async function createReceipt(deps, payload) {
  const { pool, logger } = deps;
  const { receiptData, receiptType = 'generic' } = payload || {};
  try {
    const { rows } = await pool.query(
      'INSERT INTO jsonl_receipts (receipt_type, receipt_json) VALUES ($1, $2) RETURNING *',
      [receiptType, JSON.stringify(receiptData || {})],
    );
    return rows[0];
  } catch (error) {
    logger.error({ error }, 'Error in createReceipt');
    throw new Error('Failed in createReceipt');
  }
}

export async function getReceipt(deps, payload) {
  const { pool, logger } = deps;
  const { id } = payload || {};
  try {
    const { rows } = await pool.query('SELECT * FROM jsonl_receipts WHERE id = $1', [id]);
    return rows[0] || null;
  } catch (error) {
    logger.error({ error }, 'Error in getReceipt');
    throw new Error('Failed in getReceipt');
  }
}
