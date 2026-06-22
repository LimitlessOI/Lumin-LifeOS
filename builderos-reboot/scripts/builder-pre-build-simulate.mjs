#!/usr/bin/env node
/**
 * SYNOPSIS: Builder pre-build simulation — maps step decision gaps before execute-mission writes files.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { simulateBlueprintSteps } from '../../factory-staging/factory-core/arc/simulate-blueprint-steps.js';
import { coldBuilderWalk } from '../../factory-staging/factory-core/arc/builder-cold-walk.js';
import { blueprintFreezeCheck } from '../../factory-staging/factory-core/sentry/blueprint-freeze-check.js';
import { REPO_ROOT, loadBlueprint, missionDir } from './mission-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function writeJson(absPath, data) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${JSON.stringify(data, null, 2)}\n`);
}

function buildAction(step) {
  if (step.action_type !== 'write_file_exact') {
    return `unsupported action_type ${step.action_type}`;
  }
  const src = step.exact_inputs?.content_source_path;
  if (src) return `copy ${src} → ${step.target_file}`;
  if (step.exact_inputs?.exact_content != null) return `write inline exact_content → ${step.target_file}`;
  return `missing content source for ${step.target_file}`;
}

function gapsForStep(stepId, simulation, coldWalk) {
  const simGaps = (simulation.all_gaps || []).filter((gap) => gap.step_id === stepId).map((gap) => gap.decision_gap);
  const cold = (coldWalk.steps || []).find((step) => step.step_id === stepId);
  const coldGap = cold?.decision_gap ? [cold.decision_gap] : [];
  return [...new Set([...simGaps, ...coldGap].filter(Boolean))];
}

export function runBuilderPreBuildSimulate(missionId, { blueprint = null, writeReceipts = false } = {}) {
  const resolvedBlueprint = blueprint || loadBlueprint(missionId);
  const missionFolder = missionDir(missionId);
  const simulation = simulateBlueprintSteps(resolvedBlueprint, { missionFolder });
  const coldWalk = coldBuilderWalk(resolvedBlueprint);
  const freeze = blueprintFreezeCheck(resolvedBlueprint);

  const decisionTable = (resolvedBlueprint.steps || []).map((step) => {
    const decisionGaps = gapsForStep(step.step_id, simulation, coldWalk);
    const blocked = decisionGaps.length > 0;
    return {
      step_id: step.step_id,
      title: step.title,
      target_file: step.target_file,
      action_type: step.action_type,
      builder_action: buildAction(step),
      decision_gaps: decisionGaps,
      blocked,
      clear_to_execute: !blocked,
    };
  });

  const stepsTotal = decisionTable.length;
  const stepsBlocked = decisionTable.filter((row) => row.blocked).length;
  const stepsClear = stepsTotal - stepsBlocked;
  const blockingGaps = Math.max(
    Number(simulation.summary?.blocking_gaps || 0),
    Number(coldWalk.summary?.decision_gaps || 0),
    freeze.pass ? 0 : 1,
  );

  const report = {
    schema: 'builder_pre_build_simulation_v1',
    mission_id: resolvedBlueprint.mission_id || missionId,
    blueprint_id: resolvedBlueprint.blueprint_id || null,
    simulated_at: new Date().toISOString(),
    simulated_by: 'builderos-reboot/scripts/builder-pre-build-simulate.mjs',
    procedure: [
      'simulate_blueprint_steps',
      'cold_builder_walk',
      'sha256_content_contracts',
      'blueprint_freeze_check',
      'assemble_pre_build_packet',
    ],
    decision_table: decisionTable,
    summary: {
      steps_total: stepsTotal,
      steps_blocked: stepsBlocked,
      steps_clear: stepsClear,
      blocking_gaps: blockingGaps,
      clear_to_build: blockingGaps === 0,
      freeze_pass: freeze.pass,
    },
    simulation_summary: simulation.summary,
    cold_walk_summary: coldWalk.summary,
    freeze,
  };

  if (writeReceipts) {
    const receiptPath = path.join(missionFolder, 'receipts/BUILDER_PRE_BUILD_SIMULATION.json');
    writeJson(receiptPath, report);
    const assembleScript = path.join(REPO_ROOT, 'scripts/assemble-pre-build-packet.mjs');
    if (fs.existsSync(assembleScript)) {
      spawnSync(
        process.execPath,
        [
          assembleScript,
          path.relative(REPO_ROOT, missionFolder),
          '--sim-report',
          path.relative(REPO_ROOT, receiptPath),
        ],
        { cwd: REPO_ROOT, stdio: 'ignore' },
      );
    }
  }

  return {
    ok: blockingGaps === 0,
    status: blockingGaps === 0 ? 'PRE_BUILD_PASS' : 'BLOCKED_RETURN_TO_ARC',
    blocking_gaps: blockingGaps,
    report,
  };
}

const missionId = process.argv[2];
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (!missionId) {
    console.error('Usage: node builderos-reboot/scripts/builder-pre-build-simulate.mjs <mission-id>');
    process.exit(1);
  }
  const result = runBuilderPreBuildSimulate(missionId, { writeReceipts: true });
  console.log(JSON.stringify(result.report, null, 2));
  process.exit(result.ok ? 0 : 1);
}
