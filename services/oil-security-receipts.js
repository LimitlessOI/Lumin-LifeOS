// services/oil-security-receipts.js
import { Pool } from 'pg';

const SECURITY_RECEIPT_TYPES = Object.freeze({
  GEMINI_LIVE_PROOF: "gemini_live_proof",
  OIL_AUDIT_RUN: "oil_audit_run",
  RED_TEAM_FINDING: "red_team_finding",
  SECURITY_FIX_VERIFIED: "security_fix_verified",
  DAILY_OIL_SUMMARY: "daily_oil_summary",
  HONEYPOT_PROBE: "honeypot_probe",
  CANARY_TRIP: "canary_trip",
  BUILDER_SUPERVISED_BUILD: "builder_supervised_build",
  BUILDER_MODE_CHANGE: "builder_mode_change"
});

async function writeSecurityReceipt(receiptType, payload, pool) {
  if (!SECURITY_RECEIPT_TYPES[receiptType]) {
    throw new Error(`Invalid receipt type: ${receiptType}`);
  }
  const result = await pool.query(
    `INSERT INTO security_receipts (receipt_type, payload) VALUES ($1, $2) RETURNING id`,
    [receiptType, payload]
  );
  return { receipt_id: result.rows[0].id };
}

async function readRecentReceipts(limit = 50, pool) {
  const result = await pool.query(
    `SELECT id, receipt_type, payload, created_at FROM security_receipts ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

async function readReceiptsByType(receiptType, limit = 20, pool) {
  if (!SECURITY_RECEIPT_TYPES[receiptType]) {
    throw new Error(`Invalid receipt type: ${receiptType}`);
  }
  const result = await pool.query(
    `SELECT id, receipt_type, payload, created_at FROM security_receipts WHERE receipt_type = $1 ORDER BY created_at DESC LIMIT $2`,
    [receiptType, limit]
  );
  return result.rows;
}

export { SECURITY_RECEIPT_TYPES, writeSecurityReceipt, readRecentReceipts, readReceiptsByType };
```