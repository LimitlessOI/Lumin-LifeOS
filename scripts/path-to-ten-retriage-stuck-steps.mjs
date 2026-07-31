/**
 * SYNOPSIS: M2PT-005B follow-through — one-time re-triage of steps already stuck in the
 * revive-thrash pattern before same_signature_count tracking was fixed (b3d9c838e).
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Those steps' same_signature_count is frozen at a stale, wrong value from before the fix
 * (was never incrementing for STEP_STATUS_FORBIDDEN failures). Resuming never-stop as-is
 * would let each one burn several more revive cycles before the corrected 3-strike logic
 * catches up. This scans every product's BUILD_QUEUE.json for steps already showing the
 * thrash signature (blocked, revive_count >= 3, not already escalated/demoted) and applies
 * escalateBlockedStep() directly -- the same sticky, sanctioned stop condition the
 * orchestrator itself uses, not an ad-hoc field.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { escalateBlockedStep } from '../services/product-build-orchestrator.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRODUCTS_DIR = path.join(ROOT, 'docs/products');

function listQueues() {
  let ids = [];
  try {
    ids = fs.readdirSync(PRODUCTS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
  return ids
    .map((id) => ({ id, queuePath: path.join(PRODUCTS_DIR, id, 'BUILD_QUEUE.json') }))
    .filter((p) => fs.existsSync(p.queuePath));
}

function isStuck(step) {
  return step.status === 'blocked'
    && typeof step.revive_count === 'number'
    && step.revive_count >= 3
    && step.escalation_required !== true
    && step.demoted !== true;
}

function main() {
  const results = [];
  for (const { id, queuePath } of listQueues()) {
    let queue;
    try {
      queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    } catch (err) {
      results.push({ product: id, error: `unreadable: ${err.message}` });
      continue;
    }
    if (!Array.isArray(queue.steps)) continue;
    const stuckIds = queue.steps.filter(isStuck).map((s) => s.id);
    if (!stuckIds.length) continue;

    for (const stepId of stuckIds) {
      const outcome = escalateBlockedStep(queue, stepId, {
        escalation_note: 'M2PT-005B retroactive re-triage: stuck in revive-thrash before same_signature_count tracking was fixed (b3d9c838e). revive_count was already >=3 under the old broken tracking -- escalating directly rather than letting it silently re-thrash for several more cycles once never-stop resumes.',
        escalated_by: 'path-to-ten-retriage-stuck-steps.mjs',
      });
      results.push({ product: id, step_id: stepId, outcome: outcome.status });
    }

    fs.writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
  }

  console.log(JSON.stringify({ retriaged: results.length, results }, null, 2));
  return results;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) main();

export { isStuck, main };
