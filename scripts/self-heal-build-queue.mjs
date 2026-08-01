/**
 * SYNOPSIS: Deterministic BUILD_QUEUE self-healer. Re-evaluates every step with
 * the current artifact-proof gate: already-satisfied non-done steps become DONE,
 * false-DONE steps are demoted back to PENDING, and demoted pending steps are
 * revived when their previous failure was a transient assertion bug. Results are
 * committed back to the repo per product.
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

async function evaluate(step) {
  try {
    return await evaluateStepExpectations(step, { root: ROOT });
  } catch (err) {
    return { ok: false, applicable: true, reason: `heal_eval_threw: ${err.message}` };
  }
}

async function healQueue(productId) {
  const queue = await loadBuildQueuePreferRemote(productId);
  let changed = false;
  const claimed = [];
  const unblocked = [];
  const unDemoted = [];

  for (const step of queue.steps || []) {
    if (step.human_hold || step.pause_for_founder) continue;
    const proof = await evaluate(step);
    if (step.status !== STEP_STATUS.DONE) {
      if (proof.ok) {
        step.status = STEP_STATUS.DONE;
        step.completed_at = new Date().toISOString();
        step.heal_claimed = true;
        step.heal_reason = proof.reason || 'artifact_proof_pass';
        claimed.push(step.id);
        changed = true;
      } else if (step.demoted === true && String(proof.reason || '').includes('assertion_threw')) {
        step.demoted = false;
        step.attempts = 0;
        step.un_demoted = true;
        unDemoted.push(step.id);
        changed = true;
      }
    } else {
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
