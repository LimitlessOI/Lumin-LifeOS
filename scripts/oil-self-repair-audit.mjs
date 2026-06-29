/**
 * SYNOPSIS: OIL self-repair audit — runtime proof parity + proof-store + known OIL misses.
 * OIL self-repair audit — runtime proof parity + proof-store + known OIL misses.
 * No secrets printed. Exit 1 only on P0 runtime-proof blockers (optional --strict).
 *
 * Usage:
 *   node scripts/oil-self-repair-audit.mjs
 *   node scripts/oil-self-repair-audit.mjs --write-receipts
 *   node scripts/oil-self-repair-audit.mjs --strict   # exit 1 on P0
 *
 * @ssot docs/products/project-governance/PRODUCT_HOME.md
 */

import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env.local', import.meta.url).pathname, override: true });

import pg from 'pg';
import { runSelfRepairAudit } from '../services/oil-self-repair-detector.js';

const writeReceipts = process.argv.includes('--write-receipts');
const strict = process.argv.includes('--strict');

async function main() {
  let pool = null;
  if (writeReceipts && process.env.DATABASE_URL) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  }

  const report = await runSelfRepairAudit({ pool, writeReceipts });

  console.log(JSON.stringify(report, null, 2));

  const p0 = report.runtime_proof?.p0_blockers?.length || 0;
  const notVerified = !report.runtime_proof?.verified;
  const localOnly = report.proof_store?.local_proof_only === true;

  console.error('\n=== OIL Self-Repair Audit Summary ===');
  console.error(`Runtime proof: ${report.runtime_proof?.status}${notVerified ? ' — see mismatches' : ''}`);
  console.error(`Proof store: ${report.proof_store?.status}${localOnly ? ' — LOCAL_PROOF_ONLY' : ''}`);
  console.error(`Active OIL misses: ${report.oil_missed_issues_active?.length || 0}`);
  if (report.receipt_writes?.length) {
    console.error(`Receipts written: ${report.receipt_writes.length}`);
  }

  if (pool) await pool.end();

  if (strict && p0 > 0) process.exit(1);
  if (strict && localOnly) process.exit(2);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});