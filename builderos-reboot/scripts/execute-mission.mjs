#!/usr/bin/env node
/**
 * SYNOPSIS: Execute all steps in a mission blueprint, then run acceptance tests.
 * Execute all steps in a mission blueprint, then run acceptance tests.
 * Procedure (mandatory): pre-build simulate → map decision gaps → execute → acceptance → receipt.
 * Usage: node execute-mission.mjs <mission-id> [--from STEP] [--dry-run]
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBuilderPreBuildSimulate } from './builder-pre-build-simulate.mjs';
import { evaluatePointBGate } from '../../factory-staging/factory-core/arc/point-b-gate.js';
import { evaluateBuilderEntryGate } from '../../factory-staging/factory-core/arc/foundation/builder-entry-gate.js';
import { appendMissionLedger } from '../../factory-staging/factory-core/arc/foundation/mission-ledger.js';
import { founderStopActive, isHardGate } from '../../factory-staging/factory-core/arc/gate-enforcement.js';
import { scoreRealityAgainstSimulations } from '../../factory-staging/factory-core/arc/foundation/reality-score.js';
import { evaluateMissionDoctrine, doctrineBlocksAdvance } from '../../factory-staging/factory-core/arc/foundation/doctrine-enforcement.js';
import { writeResultScoreboard } from '../../factory-staging/factory-core/arc/foundation/result-scoreboard.js';
import {
  loadBlueprint,
  missionDir,
  REPO_ROOT,
  sortStepsByDependencies,
  writeFileExactStep,
} from './mission-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = REPO_ROOT;
const missionId = process.argv[2];
const fromStep = process.argv.includes('--from') ? process.argv[process.argv.indexOf('--from') + 1] : null;
const dryRun = process.argv.includes('--dry-run');

if (founderStopActive().active && isHardGate('NEVER_STOP_RUNNER')) {
  console.error('FOUNDER_STOP active — builder execute halted (remove builderos-reboot/FOUNDER_STOP.json to resume)');
  process.exit(2);
}

if (!missionId) {
  console.error('Usage: node execute-mission.mjs <mission-id> [--from STEP] [--dry-run]');
  process.exit(1);
}

const blueprint = loadBlueprint(missionId);
const missionFolder = missionDir(missionId);
const builderEntry = evaluateBuilderEntryGate(missionFolder);
if (!builderEntry.pass) {
  console.error('BLOCKED_RETURN_TO_ARC_OR_IDC — builder entry gate failed:');
  for (const v of builderEntry.violations) console.error(`  - ${v}`);
  appendMissionLedger({
    mission_id: missionId,
    event: 'builder_entry_gate_fail',
    runner: 'execute-mission.mjs',
    verdict: 'BLOCKED',
    violations: builderEntry.violations,
  });
  process.exit(1);
}

let steps = sortStepsByDependencies(blueprint.steps);
if (fromStep) {
  const startIdx = steps.findIndex((s) => s.step_id === fromStep);
  if (startIdx < 0) {
    console.error(`--from step ${fromStep} not found`);
    process.exit(1);
  }
  steps = steps.slice(startIdx);
}

console.log(`\n=== Builder pre-build simulation (${missionId}) ===\n`);
const preBuild = runBuilderPreBuildSimulate(missionId, { blueprint, writeReceipts: true });
for (const row of preBuild.report.decision_table) {
  const flag = row.clear_to_execute ? 'CLEAR' : 'BLOCKED';
  console.log(`${row.step_id} [${flag}] ${row.builder_action}`);
  for (const gap of row.decision_gaps) {
    console.log(`  gap: ${gap}`);
  }
}
console.log(
  `\nPre-build: ${preBuild.status} — blocking_gaps=${preBuild.blocking_gaps}, `
  + `clear=${preBuild.report.summary.steps_clear}/${preBuild.report.summary.steps_total}\n`,
);
if (!preBuild.ok) {
  console.error('BLOCKED_RETURN_TO_ARC — fix blueprint or CONTENT before Builder executes.');
  process.exit(1);
}

const preBuildPacket = path.join(missionDir(missionId), 'PRE_BUILD_VALIDATION_PACKET.json');
if (fs.existsSync(preBuildPacket)) {
  const packet = JSON.parse(fs.readFileSync(preBuildPacket, 'utf8'));
  if (packet.builder_clearance !== 'yes') {
    console.error('BLOCKED — PRE_BUILD_VALIDATION_PACKET.builder_clearance is not yes');
    process.exit(1);
  }
}

console.log(`Mission ${missionId}: ${steps.length} step(s) to execute${dryRun ? ' (dry-run)' : ''}`);

const stepResults = [];
for (const step of steps) {
  console.log(`\n--- ${step.step_id}: ${step.title}`);
  if (dryRun) {
    console.log(`  would write ${step.target_file} <= ${step.exact_inputs?.content_source_path}`);
    stepResults.push({ step_id: step.step_id, status: 'DRY_RUN' });
    continue;
  }

  const result = writeFileExactStep(step);
  if (!result.ok) {
    console.error('FAILED', result);
    process.exit(1);
  }
  stepResults.push({
    step_id: step.step_id,
    status: result.status,
    target_file: result.target_file,
    sha256: result.sha256,
  });
  console.log(`  DONE ${step.target_file} (${result.bytes} bytes, sha256=${result.sha256.slice(0, 12)}…)`);
}

if (dryRun) {
  console.log('\nDry-run complete.');
  process.exit(0);
}

console.log('\nRunning acceptance tests…');
const acceptanceCommand = String(blueprint.acceptance_command || '').trim();
const acceptance = acceptanceCommand
  ? spawnSync(acceptanceCommand, {
      shell: true,
      stdio: 'inherit',
      cwd: REPO,
    })
  : spawnSync(
      process.execPath,
      [path.join(__dirname, 'run-mission-acceptance.mjs'), missionId],
      { stdio: 'inherit', cwd: REPO },
    );

const runReceipt = {
  schema: 'builder_run_receipt_v1',
  mission_id: missionId,
  blueprint_id: blueprint.blueprint_id || null,
  run_at: new Date().toISOString(),
  runner: 'builderos-reboot/scripts/execute-mission.mjs',
  procedure: [
    'builder_pre_build_simulate',
    'decision_gap_map',
    'pre_build_validation_packet',
    'write_file_exact_steps',
    'acceptance_tests',
    'point_b_gate',
  ],
  pre_build: {
    status: preBuild.status,
    blocking_gaps: preBuild.blocking_gaps,
    receipt: 'receipts/BUILDER_PRE_BUILD_SIMULATION.json',
  },
  steps_executed: stepResults.length,
  step_results: stepResults,
  acceptance_exit_code: acceptance.status ?? 1,
};

const pointB = evaluatePointBGate(missionDir(missionId), { blueprint });
const receiptPath = path.join(missionDir(missionId), 'BUILDER_RUN_RECEIPT.json');
const receiptDir = path.join(missionDir(missionId), 'receipts');
fs.mkdirSync(receiptDir, { recursive: true });
fs.writeFileSync(path.join(receiptDir, 'POINT_B_GATE_REPORT.json'), `${JSON.stringify(pointB, null, 2)}\n`);

runReceipt.point_b = {
  handoff_pass: pointB.handoff?.pass,
  machine_path_complete: pointB.machine_path_complete,
  alpha_reached: pointB.alpha_reached,
  status: pointB.status,
  proof_lap_only: pointB.proof_lap_only,
  awaiting_founder_alpha: pointB.machine_path_complete && !pointB.alpha_reached,
  violations: pointB.violations,
};
const acceptanceOk = (acceptance.status ?? 1) === 0;
if (acceptanceOk && pointB.alpha_reached) {
  runReceipt.verdict = 'PASS';
} else if (acceptanceOk && pointB.machine_path_complete) {
  runReceipt.verdict = 'TECHNICAL_PASS';
} else if (acceptanceOk && pointB.proof_lap_only && pointB.infrastructure_only) {
  runReceipt.verdict = 'INFRA_PASS';
} else if (acceptanceOk) {
  runReceipt.verdict = 'TECHNICAL_PASS';
} else {
  runReceipt.verdict = 'FAIL';
}

runReceipt.machine_path_complete = pointB.machine_path_complete;
runReceipt.alpha_reached = pointB.alpha_reached;
runReceipt.awaiting_founder_alpha = pointB.machine_path_complete && !pointB.alpha_reached;

appendMissionLedger({
  mission_id: missionId,
  event: 'builder_execute_complete',
  runner: 'execute-mission.mjs',
  blueprint_id: blueprint.blueprint_id || missionId,
  latency_ms: stepResults.length * 1000,
  verdict: runReceipt.verdict,
});

scoreRealityAgainstSimulations(missionFolder);
writeResultScoreboard(missionFolder);
const doctrine = evaluateMissionDoctrine(missionFolder, { blueprint });
runReceipt.doctrine = { pass: doctrine.pass, violations: doctrine.violations };
if (!doctrine.pass && doctrine.enforcement === 'HARD') {
  runReceipt.verdict = 'FAIL';
  console.error('DOCTRINE_VIOLATION — result truth or artifact policy failed:');
  for (const v of doctrine.violations) console.error(`  - ${v}`);
}

fs.writeFileSync(receiptPath, `${JSON.stringify(runReceipt, null, 2)}\n`);
console.log(`\nWrote ${path.relative(REPO, receiptPath)} — verdict ${runReceipt.verdict}`);
console.log(`Point B handoff: ${pointB.handoff?.pass} | Machine path: ${pointB.machine_path_complete} | Alpha: ${pointB.alpha_reached}`);

process.exit(
  runReceipt.verdict === 'FAIL'
    ? acceptance.status ?? 1
    : 0,
);
