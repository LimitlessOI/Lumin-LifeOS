// services/oil-daily-summary.js
/**
 * @ssot AMENDMENT_19_PROJECT_GOVERNANCE.md
 */

import { Pool } from '../core/db.js';
import { writeSecurityReceipt, SECURITY_RECEIPT_TYPES } from './oil-security-receipts.js';

export async function generateDailyOILSummary(poolOverride) {
  const db = poolOverride || Pool;
  const query1 = {
    text: `
      SELECT receipt_type, COUNT()::int AS count
      FROM security_receipts
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY receipt_type
      ORDER BY count DESC
    `,
  };
  const query2 = {
    text: `
      SELECT COUNT()::int AS total
      FROM security_receipts
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `,
  };

  const { rows: byType } = await db.query(query1);
  const { rows: total } = await db.query(query2);

  const summary = {
    date: new Date().toISOString(),
    window_hours: 24,
    total_receipts: total[0].total,
    by_type: byType.reduce((acc, { receipt_type, count }) => {
      acc[receipt_type] = count;
      return acc;
    }, {}),
  };

  const { receipt_id } = await writeSecurityReceipt({
    type: SECURITY_RECEIPT_TYPES.DAILY_OIL_SUMMARY,
    payload: summary,
  });

  return { summary, receipt_id };
}