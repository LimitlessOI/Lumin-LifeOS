/**
 * SYNOPSIS: One-time correction after the isOriginalOverlayBlueprintStep fix
 * (2026-08-14) -- re-evaluates steps already marked skipped/off_print against
 * the corrected isAuthorizedQueueSlice, and resets any that now legitimately
 * pass back to pending so the never-stop loop picks them up again. Steps that
 * still fail the check (no real blueprint_id) are left exactly as they are --
 * this does not grant anything new, it only un-sticks what was already
 * authorized before today's classifier bug wrongly caught it.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isAuthorizedQueueSlice } from '../config/overlay-print-sequence.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUEUE_PATH = path.join(ROOT, 'docs/products/universal-overlay/BUILD_QUEUE.json');

function main() {
  const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
  const reclassified = [];
  for (const step of queue.steps) {
    if (step.status !== 'skipped') continue;
    if (!String(step.skip_reason || '').startsWith('off_print')) continue;
    if (!isAuthorizedQueueSlice(step)) continue; // still correctly off-print, leave alone

    reclassified.push(step.id);
    step.status = 'pending';
    step.skip_reason = null;
    step.reclassified_at = new Date().toISOString();
    step.reclassify_note = 'isOriginalOverlayBlueprintStep fix 2026-08-14: was wrongly off_print due to old numeric id predating the TALOA-* convention; blueprint_id confirms real original-blueprint authorization.';
  }

  fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2) + '\n');
  console.log('Reclassified back to pending:', JSON.stringify(reclassified));
}

main();
