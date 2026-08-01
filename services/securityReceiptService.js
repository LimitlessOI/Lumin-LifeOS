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
    if (receiptType.startsWith('table_')) {
      const table = receiptType.substring(6);
      const { rows } = await pool.query(`INSERT INTO ${table} (${Object.keys(receiptData).join(', ')}) VALUES (${Object.values(receiptData).map(v => `'${v}'`).join(', ')}) RETURNING *`);
      return rows[0];
    } else if (receiptType.startsWith('jsonl_')) {
      const jsonl = receiptType.substring(6);
      const { rows } = await pool.query(`INSERT INTO jsonl_receipts (receipt_json) VALUES ('${JSON.stringify(receiptData)}') RETURNING *`);
      return rows[0];
    } else {
      throw new Error('Unsupported receipt type');
    }
  } catch (error) {
    logger.error({ error }, 'Error in processNewReceiptType');
    throw new Error('Failed in processNewReceiptType');
  }
}