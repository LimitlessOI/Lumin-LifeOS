/**
 * SYNOPSIS: services/oil-daily-summary.js
 */
// services/oil-daily-summary.js
/** @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md */

import {
  writeSecurityReceipt,
  SECURITY_RECEIPT_TYPES,
  SEC_F01_CORE_RECEIPT_TYPES,
} from './oil-security-receipts.js';

const TYPE_DEFAULTS = {
  gemini_live_proof: 0,
  runtime_proof: 0,
  oil_audit_run: 0,
  security_fix_verified: 0,
  audit_verification: 0,
  daily_oil_summary: 0,
};

export async function generateDailyOILSummary(poolOverride) {
  const db = poolOverride;
  if (!db) {
    throw new Error('generateDailyOILSummary requires an explicit pool');
  }

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

  const { rows: coreRows } = await db.query(
    `SELECT COUNT(*)::int AS total
       FROM security_receipts
      WHERE created_at > NOW() - INTERVAL '24 hours'
        AND receipt_type = ANY($1::text[])`,
    [SEC_F01_CORE_RECEIPT_TYPES]
  );

  const by_type = { ...TYPE_DEFAULTS };
  for (const { receipt_type, count } of byTypeRows) {
    if (receipt_type in by_type) by_type[receipt_type] = count;
  }

  const compat_total = Math.max((totalRows[0]?.total ?? 0) - (coreRows[0]?.total ?? 0), 0);

  const summary = {
    status: 'PASS',
    subject: 'security_receipts_24h',
    summary: 'Daily security receipt summary generated from live receipt data.',
    date: new Date().toISOString(),
    window_hours: 24,
    total_receipts: totalRows[0]?.total ?? 0,
    sec_f01_core_receipts: coreRows[0]?.total ?? 0,
    compat_receipts: compat_total,
    by_type,
    not_wired: {
      active_defense: true,
      deception: true,
      credential_rotation: true,
      auto_remediation: true,
    },
  };

  const { receipt_id } = await writeSecurityReceipt(
    SECURITY_RECEIPT_TYPES.DAILY_OIL_SUMMARY,
    summary,
    db
  );

  return { summary, receipt_id };
}
