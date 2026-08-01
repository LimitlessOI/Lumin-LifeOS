/**
 * SYNOPSIS: Deterministic BUILD_QUEUE self-healer. Re-evaluates every non-done step
 * with the current artifact-proof gate and marks satisfied steps done. Un-demotes
 * pending steps whose previous failure was a transient assertion bug. Resets
 * false-done dependencies so downstream pending steps become selectable.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBuildQueue, evaluateStepExpectations, STEP_STATUS, normalizeQueue } from '../services/product-build-orchestrator.js';
import { commitQueueStatusToRepo, loadBuildQueuePreferRemote } from '../services/never-stop-product-factory.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRODUCTS_DIR = path.join(ROOT, 'docs/products');

function listProductIds() {
  try {
    return fs.readdirSync(PRODUCTS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch { return []; }
}

async function healQueue(productId) {
  const queue = await loadBuildQueuePreferRemote(productId);
  let changed = false;
  const claimed = [];
  const unblocked = [];
  const unDemoted = [];

  // Pass 1: claim already-satisfied non-done steps (pre-existing artifacts, golden tags merged, etc.)
  for (const step of queue.steps || []) {
    if (step.status === STEP_STATUS.DONE) continue;
    if (step.human_hold || step.pause_for_founder) continue;
    const hasDeclared =
      (Array.isArray(step?.file_contains) && step.file_contains.length > 0)
      || (Array.isArray(step?.expected_exports) && step.expected_exports.length > 0)
      || Boolean(step?.route)
      || (Array.isArray(step?.behavior_assertions) && step.behavior_assertions.length > 0);
    if (!hasDeclared) continue;
    let proof;
    try {
      proof = await evaluateStepExpectations(step, { root: ROOT });
    } catch (err) {
      proof = { ok: false, applicable: true, reason: `heal_eval_threw: ${err.message}` };
    }
    if (proof.ok) {
      step.status = STEP_STATUS.DONE;
      step.completed_at = new Date().toISOString();
      step.heal_claimed = true;
      step.heal_reason = proof.reason || 'artifact_proof_pass';
      claimed.push(step.id);
      changed = true;
    } else if (step.demoted === true && String(proof.reason || '').includes('assertion_threw')) {
      // Transient assertion bug (e.g. route on non-JS target) likely fixed by gate change.
      step.demoted = false;
      step.attempts = 0;
      step.un_demoted = true;
      unDemoted.push(step.id);
      changed = true;
    }
  }

  // Pass 2: re-evaluate DONE dependencies and downgrade false-dones to pending
  // so downstream steps can be selected for real rebuild.
  for (const step of queue.steps || []) {
    if (step.status !== STEP_STATUS.DONE) continue;
    const hasDeclared =
      (Array.isArray(step?.file_contains) && step.file_contains.length > 0)
      || (Array.isArray(step?.expected_exports) && step.expected_exports.length > 0)
      || Boolean(step?.route)
      || (Array.isArray(step?.behavior_assertions) && step.behavior_assertions.length > 0);
    if (!hasDeclared) continue;
    let proof;
    try {
      proof = await evaluateStepExpectations(step, { root: ROOT });
    } catch (err) {
      proof = { ok: false, applicable: true, reason: `heal_eval_threw: ${err.message}` };
    }
    if (!proof.ok) {
      step.status = STEP_STATUS.PENDING;
      step.demoted = false;
      step.attempts = 0;
      step.last_error = proof.reason;
      step.heal_unblocked = true;
      unblocked.push(step.id);
      changed = true;
    }
  }

  if (!changed) return { productId, changed: false };

  queue.updated_at = new Date().toISOString();
  const localPath = path.join(PRODUCTS_DIR, productId, 'BUILD_QUEUE.json');
  fs.writeFileSync(localPath, `${JSON.stringify(normalizeQueue(queue, localPath), null, 2)}\n`);
  const commit = await commitQueueStatusToRepo(queue, 'self-heal');
  return { productId, changed: true, claimed, unblocked, unDemoted, commit };
}

async function main() {
  const results = [];
  for (const productId of listProductIds()) {
    try {
      const r = await healQueue(productId);
      if (r.changed) results.push(r);
    } catch (err) {
      results.push({ productId, changed: false, error: err.message });
    }
  }
  console.log(JSON.stringify({ ok: true, healed: results }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
