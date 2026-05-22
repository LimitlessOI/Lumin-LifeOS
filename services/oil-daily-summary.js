// services/oil-daily-summary.js
/** @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md */

import { pool } from '../core/database.js';
import { writeSecurityReceipt, SECURITY_RECEIPT_TYPES } from './oil-security-receipts.js';

const TYPE_DEFAULTS = {
  gemini_live_proof: 0,
  oil_audit_run: 0,
  red_team_finding: 0,
  security_fix_verified: 0,
  daily_oil_summary: 0,
  honeypot_probe: 0,
  canary_trip: 0,
  builder_supervised_build: 0,
  builder_mode_change: 0,
};

export async function generateDailyOILSummary(poolOverride) {
  const db = poolOverride || pool;

  const { rows: byTypeRows } = await db.query(`
    SELECT receipt_type, COUNT(*)::int AS count
    FROM security_receipts
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY receipt_type
    ORDER BY count DESC
  `);

  const { rows: totalRows } = await db.query(`
    SELECT COUNT(*)::int AS total
    FROM security_receipts
    WHERE created_at > NOW() - INTERVAL '24 hours'
  `);

  const by_type = { ...TYPE_DEFAULTS };
  for (const { receipt_type, count } of byTypeRows) {
    if (receipt_type in by_type) by_type[receipt_type] = count;
  }

  const summary = {
    date: new Date().toISOString(),
    window_hours: 24,
    total_receipts: totalRows[0]?.total ?? 0,
    by_type,
  };

  const { receipt_id } = await writeSecurityReceipt(
    SECURITY_RECEIPT_TYPES.DAILY_OIL_SUMMARY,
    summary,
    db
  );

  return { summary, receipt_id };
}
