#!/usr/bin/env node
/**
 * Execute one blueprint step (write_file_exact from content_source_path).
 * Usage: node execute-mission-step.mjs FACTORY-REBOOT-0004 S401
 */
import { loadBlueprint, sortStepsByDependencies, writeFileExactStep } from './mission-lib.mjs';

const missionId = process.argv[2];
const stepId = process.argv[3];

if (!missionId || !stepId) {
  console.error('Usage: node execute-mission-step.mjs <mission-id> <step-id>');
  process.exit(1);
}

const blueprint = loadBlueprint(missionId);
const step = blueprint.steps.find((s) => s.step_id === stepId);
if (!step) {
  console.error(`Step ${stepId} not found in ${missionId}`);
  process.exit(1);
}

const deps = sortStepsByDependencies(blueprint.steps);
const order = deps.map((s) => s.step_id);
const idx = order.indexOf(stepId);
if (idx > 0) {
  console.log(`Note: step depends on prior steps through ${order[idx - 1]}`);
}

const result = writeFileExactStep(step);
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
