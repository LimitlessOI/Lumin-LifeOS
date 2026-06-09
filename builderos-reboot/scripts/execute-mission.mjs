#!/usr/bin/env node
/**
 * Execute all steps in a mission blueprint, then run acceptance tests.
 * Usage: node execute-mission.mjs FACTORY-REBOOT-0004 [--from S401] [--dry-run]
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadBlueprint,
  sortStepsByDependencies,
  writeFileExactStep,
} from './mission-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const missionId = process.argv[2];
const fromStep = process.argv.includes('--from') ? process.argv[process.argv.indexOf('--from') + 1] : null;
const dryRun = process.argv.includes('--dry-run');

if (!missionId) {
  console.error('Usage: node execute-mission.mjs <mission-id> [--from STEP] [--dry-run]');
  process.exit(1);
}

const blueprint = loadBlueprint(missionId);
let steps = sortStepsByDependencies(blueprint.steps);
if (fromStep) {
  const startIdx = steps.findIndex((s) => s.step_id === fromStep);
  if (startIdx < 0) {
    console.error(`--from step ${fromStep} not found`);
    process.exit(1);
  }
  steps = steps.slice(startIdx);
}

console.log(`Mission ${missionId}: ${steps.length} step(s) to execute${dryRun ? ' (dry-run)' : ''}`);

for (const step of steps) {
  console.log(`\n--- ${step.step_id}: ${step.title}`);
  if (dryRun) {
    console.log(`  would write ${step.target_file} <= ${step.exact_inputs?.content_source_path}`);
    continue;
  }

  const result = writeFileExactStep(step);
  if (!result.ok) {
    console.error('FAILED', result);
    process.exit(1);
  }
  console.log(`  DONE ${step.target_file} (${result.bytes} bytes, sha256=${result.sha256.slice(0, 12)}…)`);
}

if (dryRun) {
  console.log('\nDry-run complete.');
  process.exit(0);
}

console.log('\nRunning acceptance tests…');
const acceptance = spawnSync(
  process.execPath,
  [path.join(__dirname, 'run-mission-acceptance.mjs'), missionId],
  { stdio: 'inherit', cwd: path.join(__dirname, '../..') },
);

process.exit(acceptance.status ?? 1);
