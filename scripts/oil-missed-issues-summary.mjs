/**
 * SYNOPSIS: Summarize tracked OIL missed-issue receipts with schema validation.
 * Summarize tracked OIL missed-issue receipts with schema validation.
 * Local: uses DATABASE_URL + optional PUBLIC_BASE_URL for live detect context.
 *
 * @ssot docs/projects/oil/SELF_REPAIR_DETECTION_RULES.md
 */

import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env.local', import.meta.url).pathname, override: true });

import { pool } from '../core/database.js';
import {
  summarizeOilMisses,
  detectRuntimeProofMismatch,
  detectProofStoreMismatch,
  normalizeSha,
  fetchGitHubMainSha,
  readLocalGitShas,
} from '../services/oil-self-repair-detector.js';
import { readReceiptsByType, SECURITY_RECEIPT_TYPES } from '../services/oil-security-receipts.js';
import { proofStoreFingerprint } from '../services/builder-phase14-ledger.js';

async function buildContext() {
  const git = readLocalGitShas();
  const githubMain = await fetchGitHubMainSha();
  let receiptCommitSha = null;
  try {
    const rows = await readReceiptsByType(SECURITY_RECEIPT_TYPES.GEMINI_LIVE_PROOF, 1, pool);
    const lp = rows[0];
    receiptCommitSha =
      normalizeSha(lp?.payload?.runtime?.commit_sha) ||
      normalizeSha(lp?.payload?.details?.runtime?.commit_sha);
  } catch {
    /* optional */
  }
  const runtimeProof = detectRuntimeProofMismatch({
    localHead: git.localHead,
    githubMainSha: git.githubMainSha || githubMain.sha,
    railwayDeploySha: normalizeSha(process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GITHUB_SHA),
    receiptCommitSha,
  });
  const proofStore = detectProofStoreMismatch(process.env.DATABASE_URL, null);
  return { runtimeProof, proofStore };
}

async function main() {
  const context = await buildContext();
  const summary = await summarizeOilMisses(pool, context);
  console.log(JSON.stringify(summary, null, 2));
  console.error('\n=== OIL Missed-Issue Summary ===');
  console.error(`Status: ${summary.status || (summary.ok ? 'OK' : 'NOT_WIRED')}`);
  console.error(`Receipts: ${summary.receipt_count ?? 0} · Active: ${summary.active_count ?? 0} · Repaired: ${summary.repaired_count ?? 0}`);
  if (summary.invalid_receipt_count) {
    console.error(`Invalid receipts: ${summary.invalid_receipt_count}`);
  }
  if (summary.repeated_categories?.length) {
    console.error('Repeated categories:', summary.repeated_categories.map((c) => `${c.category}(${c.count})`).join(', '));
  }
  await pool.end();
  process.exit(summary.validation_wired === false ? 2 : 0);
}

main().catch(async (err) => {
  console.error(err.message || err);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});