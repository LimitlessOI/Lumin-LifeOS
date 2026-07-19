#!/usr/bin/env node
/**
 * SYNOPSIS: Stamp a BUILD_QUEUE.json step with a known-bad failure signature
 *   before resetting it to `pending` for a rebuild — so if the governed
 *   autonomous shipping loop's factory reproduces the SAME defect, it skips
 *   the escalation ladder and rotates model immediately instead of quietly
 *   re-shipping the identical bug.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Why this exists: observed live (2026-07-18, blueprint reconciliation
 * Section A) — two separate defects (routes/builderOSTokenReceipt.js,
 * routes/cronVerificationRoutes.js) were each fixed once by deleting the
 * broken stub, the owning BUILD_QUEUE step was reset to `pending` "so the
 * factory rebuilds it properly," and the factory reproduced the identical
 * broken import BOTH times, with zero early warning, because a plain status
 * reset wipes same_signature_count back to 0. This tool is the ritual step
 * a human/GAP-FILL fix runs alongside that reset so the lesson persists.
 *
 * Usage:
 *   node scripts/mark-step-known-bad-signature.mjs --product <id> --step <id> \
 *     --error "the exact last_error string that was fixed" \
 *     --note "one-line description of what was wrong and how it was fixed" \
 *     [--reset-pending]
 *
 * --reset-pending also clears status/commit_sha/built_sha/proof and sets
 * status back to pending in the same write (the two are meant to happen
 * together; doing them separately risks someone forgetting the stamp).
 */
import { loadBuildQueue, persistQueue, STEP_STATUS } from '../services/product-build-orchestrator.js';
import {
  failureSignature,
  loadKnownBadSignaturesRegistry,
  saveKnownBadSignaturesRegistry,
  recordRepoWideKnownBadSignature,
} from '../services/governed-autonomous-shipping-loop.js';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--reset-pending') { out.resetPending = true; continue; }
    if (a.startsWith('--')) {
      const key = a.slice(2);
      out[key] = argv[i + 1];
      i += 1;
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { product, step: stepId, error, note } = args;
  if (!product || !stepId || !error || !note) {
    console.error(
      'Usage: node scripts/mark-step-known-bad-signature.mjs --product <id> --step <id> --error "<last_error text>" --note "<what was wrong / how it was fixed>" [--reset-pending]',
    );
    process.exit(1);
  }

  const queue = loadBuildQueue(product);
  const found = queue.steps.find((s) => s.id === stepId || s.step_id === stepId);
  if (!found) {
    console.error(`step ${stepId} not found in ${product}'s BUILD_QUEUE.json`);
    process.exit(1);
  }

  const signature = failureSignature(error);
  if (!Array.isArray(found.known_bad_signatures)) found.known_bad_signatures = [];
  const already = found.known_bad_signatures.some((k) => k?.signature === signature);
  if (already) {
    console.log(`signature already recorded known-bad on step ${stepId} — no change.`);
  } else {
    found.known_bad_signatures.push({ signature, note, recorded_at: new Date().toISOString() });
    console.log(`recorded known-bad signature on ${product}/${stepId}: ${signature}`);
  }

  // Also record repo-wide (data/known-bad-signatures-registry.json), not just
  // on this one step — closes the blind spot where a fix's stamp lived only on
  // a branch's copy of a step, and a DIFFERENT branch/product/step reproducing
  // the identical signature had no way to know it was already fixed once.
  const registryBefore = loadKnownBadSignaturesRegistry();
  const registryAfter = recordRepoWideKnownBadSignature(
    signature,
    { note, source_product_id: product, source_step_id: stepId },
    registryBefore,
  );
  if (registryAfter.signatures.length === registryBefore.signatures.length) {
    console.log('signature already recorded repo-wide — no change.');
  } else {
    saveKnownBadSignaturesRegistry(registryAfter);
    console.log(`recorded signature repo-wide: ${signature}`);
  }

  if (args.resetPending) {
    found.status = STEP_STATUS.PENDING;
    found.commit_sha = null;
    found.built_sha = null;
    found.proof = null;
    console.log(`reset ${product}/${stepId} → pending (known_bad_signatures preserved).`);
  }

  persistQueue(queue);
}

main();
