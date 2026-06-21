/**
 * SYNOPSIS: CLI proof freshness check — same rules as GET /command-center/proof-freshness.
 * CLI proof freshness check — same rules as GET /command-center/proof-freshness.
 *
 * @ssot docs/projects/oil/SELF_REPAIR_DETECTION_RULES.md
 */

import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env.local', import.meta.url).pathname, override: true });

import { pool } from '../core/database.js';
import { normalizeSha } from '../services/oil-self-repair-detector.js';
import {
  evaluateProofFreshnessFromPool,
  mergeRuntimeProofWithFreshness,
  PROOF_FRESHNESS_RULES,
} from '../services/oil-proof-freshness.js';
import { detectRuntimeProofMismatch } from '../services/oil-self-repair-detector.js';
import { readReceiptsByType, SECURITY_RECEIPT_TYPES } from '../services/oil-security-receipts.js';

async function main() {
  const railwayDeploySha = normalizeSha(
    process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GITHUB_SHA || ''
  );
  const geminiRows = await readReceiptsByType(SECURITY_RECEIPT_TYPES.GEMINI_LIVE_PROOF, 1, pool);
  const freshness = await evaluateProofFreshnessFromPool(pool, {
    railwayDeploySha,
    geminiReceiptRow: geminiRows[0] || null,
  });

  const lp = geminiRows[0];
  const receiptCommitSha =
    normalizeSha(lp?.payload?.runtime?.commit_sha) ||
    normalizeSha(lp?.payload?.details?.runtime?.commit_sha);

  const runtimeProof = detectRuntimeProofMismatch({
    railwayDeploySha,
    receiptCommitSha,
  });
  const merged = mergeRuntimeProofWithFreshness(runtimeProof, freshness);

  const out = {
    railway_deploy_sha: railwayDeploySha,
    receipt_commit_sha: receiptCommitSha,
    freshness,
    runtime_proof: merged,
    rules: PROOF_FRESHNESS_RULES,
  };

  console.log(JSON.stringify(out, null, 2));
  console.error('\n=== OIL Proof Freshness ===');
  console.error(`Overall: ${freshness.overall} · stale=${freshness.stale_count}`);
  for (const [k, p] of Object.entries(freshness.proofs)) {
    console.error(`  ${k}: ${p.status} — ${p.reason}`);
  }
  console.error(`Runtime proof (merged): ${merged.status} · blocks_build=${merged.blocks_build}`);

  await pool.end();
  process.exit(freshness.stale ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err.message || err);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(2);
});