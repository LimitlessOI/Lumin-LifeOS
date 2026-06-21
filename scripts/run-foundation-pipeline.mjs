#!/usr/bin/env node
/**
 * SYNOPSIS: Full foundation pipeline — FOUNDER_PACKET_V2 machine path toward Point B (LifeRE Alpha).
 * Full foundation pipeline — FOUNDER_PACKET_V2 machine path toward Point B (LifeRE Alpha).
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import {
  runFoundationPipeline,
  runFoundationPipelineLoop,
} from '../factory-staging/factory-core/arc/run-foundation.js';
import { founderStopActive } from '../factory-staging/factory-core/arc/gate-enforcement.js';
import { loadPointBTarget } from '../factory-staging/factory-core/arc/foundation/point-b-target.js';

const args = process.argv.slice(2);
const missionArg = args.find((a) => !a.startsWith('--'));
const force = process.argv.includes('--force');
const dryRun = process.argv.includes('--dry-run');
const once = process.argv.includes('--once');
const bounded = process.argv.includes('--bounded');
const cookingSliceArg = process.argv.find((a) => a.startsWith('--cooking-slice='))
  || process.argv.find((a) => a.startsWith('--cooking-budget='));
const maxAttemptsArg = process.argv.find((a) => a.startsWith('--max-attempts='));
const cookingSliceSize = cookingSliceArg ? Number(cookingSliceArg.split('=')[1]) : 32;
const maxAttemptsPerRun = maxAttemptsArg ? Number(maxAttemptsArg.split('=')[1]) : (bounded ? 64 : Infinity);

const pointB = loadPointBTarget();
const missionId = missionArg || pointB?.mission_id;

if (!missionId) {
  console.error(
    'Usage: node scripts/run-foundation-pipeline.mjs [mission_id] [--force] [--dry-run] [--once] [--bounded] [--cooking-slice=N] [--max-attempts=N]',
  );
  console.error('Default: never-stop toward Point B (LifeRE Alpha). Stopping is failure.');
  process.exit(1);
}

function runOnce() {
  return once
    ? runFoundationPipeline(missionId, { force, dryRun })
    : runFoundationPipelineLoop(missionId, { force, dryRun, cookingSliceSize, maxAttempts: maxAttemptsPerRun });
}

if (once) {
  const result = runOnce();
  const payload = result.loopReceipt || result.report;
  console.log(JSON.stringify(payload, null, 2));
  process.exit(result.ok ? 0 : 1);
}

let cycles = 0;
while (true) {
  if (founderStopActive().active) {
    console.log(JSON.stringify({ event: 'founder_stop', cycles }, null, 2));
    process.exit(0);
  }

  cycles += 1;
  const result = runOnce();
  const payload = result.loopReceipt || result.report;
  console.log(JSON.stringify({ cycle: cycles, point_b_reached: result.point_b_reached, ok: result.ok, total_attempts: payload?.total_attempts, obstacles: payload?.obstacles?.length }, null, 2));

  if (result.ok && result.point_b_reached) {
    console.log(JSON.stringify(payload, null, 2));
    process.exit(0);
  }

  if (result.founder_stop) {
    process.exit(0);
  }

  if (!Number.isFinite(maxAttemptsPerRun)) {
    continue;
  }

  if (result.attempt_budget_exhausted) {
    continue;
  }
}
