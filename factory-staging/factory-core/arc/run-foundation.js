/**
 * Full foundation pipeline — founder document A→Alpha machine path.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from '../builder/run-step.js';
import { resolveMissionFolder, loadMissionJson } from './mission-paths.js';
import { bootstrapProductMission } from './bootstrap-product-mission.js';
import { runDepartmentSimulations } from './department-simulations.js';
import { evaluatePreHandoffIntentGate, writePreHandoffReport } from './pre-handoff-intent-gate.js';
import { evaluateIdcExitGate } from './foundation/idc-exit-gate.js';
import {
  writePreArcEnrichment,
  writeConsensusReceipt,
  assembleFullPreArcPacket,
} from './foundation/pre-arc-enrichment.js';
import { buildFullCoverageMap, writeCoverageMap, readFounderText } from './foundation/coverage-map.js';
import { writeResultScoreboard, evaluateReleasePassGate } from './foundation/result-scoreboard.js';
import { runArcTranslate } from './translate-mission.js';
import { evaluatePointBGate } from './point-b-gate.js';
import {
  writeModeAToBTransitionReceipt,
  writePredictionReceipt,
} from './foundation/prediction-receipt.js';
import { evaluateBuilderEntryGate } from './foundation/builder-entry-gate.js';
import { evaluateMissionDoctrine } from './foundation/doctrine-enforcement.js';
import { scoreRealityAgainstSimulations } from './foundation/reality-score.js';
import { appendMissionLedger } from './foundation/mission-ledger.js';
import {
  buildUpstreamRoute,
  writeChairFailureReceipt,
  writeUpstreamRouteReport,
} from './upstream-routing.js';
import { repairForStage } from './foundation/phase-repair.js';
import { founderStopActive } from './gate-enforcement.js';
import {
  recordObstacle,
  recordCookingSliceObstacle,
  applySystemAdjustments,
} from './foundation/obstacle-lesson-loop.js';
import {
  evaluatePointBTargetReached,
  loadPointBTarget,
  resolvePointBMissionId,
  ensurePointBMissionFolder,
} from './foundation/point-b-target.js';

function loadBpPriority(missionId) {
  const p = path.join(REPO_ROOT, 'builderos-reboot/BP_PRIORITY.json');
  if (!fs.existsSync(p)) return null;
  try {
    const q = JSON.parse(fs.readFileSync(p, 'utf8'));
    return (q.items || []).find((i) => i.mission_id === missionId) || null;
  } catch {
    return null;
  }
}

function writeJson(absPath, data) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${JSON.stringify(data, null, 2)}\n`);
}

function lockChairHandoff(missionFolder, missionId) {
  writeJson(path.join(missionFolder, 'CHAIR_HANDOFF_RECEIPT.json'), {
    schema: 'chair_handoff_receipt_v1',
    mission_id: missionId,
    handoff_at: new Date().toISOString(),
    from_stage: 'development',
    to_stage: 'protected_corridor',
    locked_by: 'Chair',
    department_receipts: [
      'receipts/SNT_INTENT_ATTACK_RECEIPT.json',
      'receipts/CHAIR_FORECAST_SIMULATION_RECEIPT.json',
      'receipts/CFO_RESOURCE_SIMULATION_RECEIPT.json',
      'receipts/WISDOM_REVIEW_RECEIPT.json',
    ],
    idc_exit_pass: true,
    note: 'Full foundation development stage complete. Adam job done until Alpha.',
  });
}

export function runDevelopmentStage(missionIdOrPath, { force = false } = {}) {
  const folder = resolveMissionFolder(missionIdOrPath);
  if (!folder) return { ok: false, error: 'mission_not_found' };

  const missionId = path.basename(folder);
  if (force) bootstrapProductMission(missionId, { force: true });

  const founderText = readFounderText(folder);
  const baseline = loadMissionJson(folder, 'INTENT_BASELINE.json');
  const queueEntry = loadBpPriority(missionId);
  writeCoverageMap(folder, buildFullCoverageMap(missionId, founderText, baseline, queueEntry));

  writeModeAToBTransitionReceipt(folder);
  writePredictionReceipt(folder);

  const deptSims = runDepartmentSimulations(folder);
  writeConsensusReceipt(folder, deptSims);
  writePreArcEnrichment(folder);

  const preHandoff = evaluatePreHandoffIntentGate(folder);
  writePreHandoffReport(folder, preHandoff);

  const preViolations = [
    ...(deptSims.failed_seats.map((s) => `department:${s}`)),
    ...preHandoff.violations,
  ];
  if (preViolations.length) {
    const route = buildUpstreamRoute({
      missionId,
      violations: preViolations,
      defectOwnerSeat: 'Chair',
      pushedBy: 'ARC',
      chairCanSynthesize: false,
    });
    writeUpstreamRouteReport(folder, route);
    writeChairFailureReceipt(folder, route);
    return { ok: false, stage: 'development', violations: preViolations, route };
  }

  lockChairHandoff(folder, missionId);
  assembleFullPreArcPacket(folder);

  const idcExit = evaluateIdcExitGate(folder);
  writeJson(path.join(folder, 'receipts/IDC_EXIT_GATE_REPORT.json'), idcExit);
  if (!idcExit.pass) {
    return { ok: false, stage: 'development', violations: idcExit.violations, idcExit };
  }

  return { ok: true, stage: 'development', deptSims, idcExit };
}

export function runCorridorStage(missionIdOrPath, { dryRun = false } = {}) {
  const folder = resolveMissionFolder(missionIdOrPath);
  const translate = runArcTranslate(path.basename(folder), { dryRun, writeBlueprint: !dryRun });
  return { ok: translate.ok, translate };
}

export function runBuilderStage(missionIdOrPath) {
  const missionId = path.basename(resolveMissionFolder(missionIdOrPath));
  const r = spawnSync(
    process.execPath,
    [path.join(REPO_ROOT, 'builderos-reboot/scripts/execute-mission.mjs'), missionId],
    { cwd: REPO_ROOT, stdio: 'pipe', encoding: 'utf8' },
  );
  return { ok: r.status === 0, exit: r.status, stdout: r.stdout, stderr: r.stderr };
}

export function runFoundationPipeline(missionIdOrPath, { force = false, dryRun = false } = {}) {
  const folder = resolveMissionFolder(missionIdOrPath);
  const missionId = path.basename(folder);
  const started = Date.now();
  const report = {
    schema: 'foundation_pipeline_report_v1',
    mission_id: missionId,
    at: new Date().toISOString(),
    doctrine: 'FOUNDER_PACKET_V2 full machine path',
    stages: {},
  };

  report.stages.development = runDevelopmentStage(missionId, { force });
  if (!report.stages.development.ok) {
    writeJson(path.join(folder, 'receipts/FOUNDATION_PIPELINE_REPORT.json'), report);
    return { ok: false, report };
  }

  report.stages.corridor = runCorridorStage(missionId, { dryRun });
  if (!report.stages.corridor.ok) {
    writeJson(path.join(folder, 'receipts/FOUNDATION_PIPELINE_REPORT.json'), report);
    return { ok: false, report };
  }

  if (!dryRun) {
    const builderEntry = evaluateBuilderEntryGate(folder);
    report.stages.builder_entry = builderEntry;
    if (!builderEntry.pass) {
      writeJson(path.join(folder, 'receipts/BUILDER_ENTRY_GATE_REPORT.json'), builderEntry);
      report.stages.builder = { ok: false, blocked: true, violations: builderEntry.violations };
      appendMissionLedger({
        mission_id: missionId,
        event: 'builder_entry_blocked',
        runner: 'run-foundation.js',
        latency_ms: Date.now() - started,
        verdict: 'BLOCKED',
        violations: builderEntry.violations,
      });
      writeJson(path.join(folder, 'receipts/FOUNDATION_PIPELINE_REPORT.json'), report);
      return { ok: false, report };
    }

    report.stages.builder = runBuilderStage(missionId);
    if (!report.stages.builder.ok) {
      appendMissionLedger({
        mission_id: missionId,
        event: 'builder_execute_fail',
        runner: 'execute-mission.mjs',
        latency_ms: Date.now() - started,
        verdict: 'FAIL',
        note: 'See BUILDER_RUN_RECEIPT.json',
      });
      writeJson(path.join(folder, 'receipts/FOUNDATION_PIPELINE_REPORT.json'), report);
      return { ok: false, report };
    }
  }

  const bp = loadMissionJson(folder, 'BLUEPRINT.json');
  report.stages.final_gate = evaluatePointBGate(folder, { blueprint: bp });
  scoreRealityAgainstSimulations(folder);
  report.stages.scoreboard = writeResultScoreboard(folder);
  report.stages.release_gate = evaluateReleasePassGate(folder);
  report.stages.doctrine = evaluateMissionDoctrine(folder, { blueprint: bp });

  report.ok = report.stages.final_gate.machine_path_complete && report.stages.doctrine.pass;
  report.awaiting_alpha = report.ok && !report.stages.final_gate.alpha_reached;
  writeJson(path.join(folder, 'receipts/FOUNDATION_PIPELINE_REPORT.json'), report);
  appendMissionLedger({
    mission_id: missionId,
    event: 'foundation_pipeline_complete',
    runner: 'run-foundation.js',
    latency_ms: Date.now() - started,
    verdict: report.ok ? 'PASS' : 'FAIL',
  });
  return { ok: report.ok, report };
}

function runPhaseUntilPass({
  phaseName,
  missionFolder,
  cookingSliceSize,
  totalAttemptsRef,
  loopReceipt,
  runFn,
  maxAttempts = Infinity,
}) {
  let lastResult = null;
  let phaseAttempts = 0;
  let sliceAttempts = 0;
  let budgetSlices = 0;

  while (true) {
    if (Number.isFinite(maxAttempts) && totalAttemptsRef.count >= maxAttempts) {
      const obstacle = recordObstacle(missionFolder, {
        phase: phaseName,
        attempt: phaseAttempts,
        kind: 'attempt_budget_per_run',
        violations: [`attempt_budget_per_run exhausted at ${totalAttemptsRef.count}`],
      });
      loopReceipt.obstacles.push(obstacle);
      loopReceipt.stoppage = {
        reason: 'attempt_budget_per_run',
        phase: phaseName,
        stoppage_is_failure: true,
        stopping_is_failure: true,
        lesson: 'Per-run attempt cap hit — outer loop must continue toward Point B',
      };
      return { ok: false, attempt_budget_exhausted: true, lastResult, obstacle };
    }
    const founderStop = founderStopActive();
    if (founderStop.active) {
      loopReceipt.stoppage = {
        reason: 'founder_stop',
        phase: phaseName,
        acceptable: true,
        stoppage_is_failure: false,
        path: founderStop.path,
      };
      return { ok: false, stopped: 'founder_stop', founder_stop: true };
    }

    phaseAttempts += 1;
    totalAttemptsRef.count += 1;
    sliceAttempts += 1;

    lastResult = runFn({ attempt: phaseAttempts, force: phaseAttempts > 1 });
    const record = {
      phase: phaseName,
      attempt: phaseAttempts,
      slice: budgetSlices + 1,
      cooking_spent: totalAttemptsRef.count,
      at: new Date().toISOString(),
      ok: Boolean(lastResult?.ok),
    };

    if (lastResult?.ok) {
      loopReceipt.attempts.push(record);
      loopReceipt.phases[phaseName] = { ok: true, attempts: phaseAttempts, budget_slices: budgetSlices };
      return lastResult;
    }

    const violations = lastResult?.violations
      || lastResult?.translate?.intake?.violations
      || [lastResult?.error].filter(Boolean);

    const obstacle = recordObstacle(missionFolder, {
      phase: phaseName,
      violations,
      result: lastResult,
      attempt: phaseAttempts,
    });
    const repair = repairForStage(missionFolder, phaseName, lastResult, { obstacle });
    applySystemAdjustments(missionFolder, obstacle);

    record.obstacle = obstacle;
    record.repair = repair;
    record.violations = violations;
    loopReceipt.attempts.push(record);
    loopReceipt.repairs.push(repair);
    loopReceipt.obstacles = loopReceipt.obstacles || [];
    loopReceipt.obstacles.push(obstacle);

    if (sliceAttempts >= cookingSliceSize) {
      budgetSlices += 1;
      sliceAttempts = 0;
      loopReceipt.budget_slices = budgetSlices;
      const sliceObs = recordCookingSliceObstacle(missionFolder, {
        phase: phaseName,
        slice: budgetSlices,
        sliceSize: cookingSliceSize,
        totalAttempts: totalAttemptsRef.count,
      });
      loopReceipt.obstacles.push(sliceObs);
      applySystemAdjustments(missionFolder, sliceObs);
    }
  }
}

/**
 * Never-stop foundation loop — obstacles become lessons; route around until Point B (LifeRE Alpha).
 * Stopping is failure. Only founder_stop halts intentionally.
 */
export function runFoundationPipelineLoop(missionIdOrPath, options = {}) {
  const cookingSliceSize = options.cookingSliceSize
    ?? options.cookingBudget
    ?? options.maxTotalAttempts
    ?? 32;
  const maxAttempts = options.maxAttempts ?? Infinity;
  const force = options.force ?? false;
  const dryRun = options.dryRun ?? false;

  const pointBTarget = loadPointBTarget();
  ensurePointBMissionFolder();
  const missionId = resolvePointBMissionId(missionIdOrPath);
  const folder = resolveMissionFolder(missionId);
  if (!folder) {
    return {
      ok: false,
      error: 'mission_not_found',
      point_b: pointBTarget?.label || 'LifeRE Alpha',
      stoppage: { reason: 'mission_not_found', stoppage_is_failure: true, stopping_is_failure: true },
    };
  }

  const started = Date.now();
  const totalAttemptsRef = { count: 0 };
  const loopReceipt = {
    schema: 'foundation_loop_receipt_v3',
    mission_id: path.basename(folder),
    point_b_target: pointBTarget?.label || 'LifeRE Alpha',
    point_b_mission_id: pointBTarget?.mission_id || null,
    mode: 'obstacle_lesson_never_stop',
    doctrine: {
      stopping_is_failure: true,
      obstacle_is_lesson: true,
      must_adjust_system: true,
    },
    started_at: new Date().toISOString(),
    cooking_slice_size: cookingSliceSize,
    attempts: [],
    phases: {},
    repairs: [],
    obstacles: [],
  };

  if (Number.isFinite(maxAttempts) && maxAttempts <= 0) {
    loopReceipt.stoppage = { reason: 'max_attempts_zero', stoppage_is_failure: true };
    return { ok: false, loopReceipt };
  }

  const phaseOpts = { cookingSliceSize, totalAttemptsRef, loopReceipt, maxAttempts };

  const development = runPhaseUntilPass({
    phaseName: 'development',
    missionFolder: folder,
    ...phaseOpts,
    runFn: ({ force: retryForce }) => runDevelopmentStage(missionId, { force: force || retryForce }),
  });
  if (development?.founder_stop || development?.attempt_budget_exhausted) {
    finalizeLoopReceipt(loopReceipt, { started, totalAttemptsRef, ok: false, pointB: null });
    writeJson(path.join(folder, 'receipts/FOUNDATION_LOOP_RECEIPT.json'), loopReceipt);
    return { ok: false, loopReceipt, founder_stop: Boolean(development?.founder_stop), attempt_budget_exhausted: Boolean(development?.attempt_budget_exhausted) };
  }

  const corridor = runPhaseUntilPass({
    phaseName: 'corridor',
    missionFolder: folder,
    ...phaseOpts,
    runFn: () => {
      const translate = runCorridorStage(missionId, { dryRun });
      return { ok: translate.ok, translate };
    },
  });
  if (corridor?.founder_stop || corridor?.attempt_budget_exhausted) {
    finalizeLoopReceipt(loopReceipt, { started, totalAttemptsRef, ok: false, pointB: null });
    writeJson(path.join(folder, 'receipts/FOUNDATION_LOOP_RECEIPT.json'), loopReceipt);
    return { ok: false, loopReceipt, founder_stop: Boolean(corridor?.founder_stop), attempt_budget_exhausted: Boolean(corridor?.attempt_budget_exhausted) };
  }

  if (!dryRun) {
    const builderEntry = runPhaseUntilPass({
      phaseName: 'builder_entry',
      missionFolder: folder,
      ...phaseOpts,
      runFn: () => {
        const gate = evaluateBuilderEntryGate(folder);
        return { ok: gate.pass, ...gate };
      },
    });
    if (builderEntry?.founder_stop || builderEntry?.attempt_budget_exhausted) {
      finalizeLoopReceipt(loopReceipt, { started, totalAttemptsRef, ok: false, pointB: null });
      writeJson(path.join(folder, 'receipts/FOUNDATION_LOOP_RECEIPT.json'), loopReceipt);
      return { ok: false, loopReceipt, founder_stop: Boolean(builderEntry?.founder_stop), attempt_budget_exhausted: Boolean(builderEntry?.attempt_budget_exhausted) };
    }

    const builder = runPhaseUntilPass({
      phaseName: 'builder',
      missionFolder: folder,
      ...phaseOpts,
      runFn: () => runBuilderStage(missionId),
    });
    if (builder?.founder_stop || builder?.attempt_budget_exhausted) {
      finalizeLoopReceipt(loopReceipt, { started, totalAttemptsRef, ok: false, pointB: null });
      writeJson(path.join(folder, 'receipts/FOUNDATION_LOOP_RECEIPT.json'), loopReceipt);
      return { ok: false, loopReceipt, founder_stop: Boolean(builder?.founder_stop), attempt_budget_exhausted: Boolean(builder?.attempt_budget_exhausted) };
    }
  }

  const finalResult = runPhaseUntilPass({
    phaseName: 'final_gate',
    missionFolder: folder,
    ...phaseOpts,
    runFn: () => {
      const bp = loadMissionJson(folder, 'BLUEPRINT.json');
      const finalGate = evaluatePointBGate(folder, { blueprint: bp });
      const doctrine = evaluateMissionDoctrine(folder, { blueprint: bp });
      const pointB = evaluatePointBTargetReached(folder);
      const violations = [...(finalGate.violations || []), ...(doctrine.violations || [])];
      const machineOk = finalGate.machine_path_complete && doctrine.pass;
      const ok = machineOk && pointB.ok;
      return { ok, finalGate, doctrine, pointB, violations, machineOk };
    },
  });
  if (finalResult?.founder_stop || finalResult?.attempt_budget_exhausted) {
    finalizeLoopReceipt(loopReceipt, { started, totalAttemptsRef, ok: false, pointB: null });
    writeJson(path.join(folder, 'receipts/FOUNDATION_LOOP_RECEIPT.json'), loopReceipt);
    return { ok: false, loopReceipt, founder_stop: Boolean(finalResult?.founder_stop), attempt_budget_exhausted: Boolean(finalResult?.attempt_budget_exhausted) };
  }

  const pointB = evaluatePointBTargetReached(folder);
  const pipelineOk = Boolean(pointB.ok);

  if (pipelineOk) {
    scoreRealityAgainstSimulations(folder);
    loopReceipt.phases.scoreboard = writeResultScoreboard(folder);
    loopReceipt.phases.release_gate = evaluateReleasePassGate(folder);
  } else {
    loopReceipt.phases.final_gate_detail = finalResult?.finalGate;
    loopReceipt.phases.doctrine_detail = finalResult?.doctrine;
    loopReceipt.phases.point_b = pointB;
  }

  finalizeLoopReceipt(loopReceipt, { started, totalAttemptsRef, ok: pipelineOk, pointB });
  loopReceipt.point_b_reached = pipelineOk;
  loopReceipt.awaiting_alpha = !pipelineOk && Boolean(finalResult?.machineOk);

  writeJson(path.join(folder, 'receipts/FOUNDATION_LOOP_RECEIPT.json'), loopReceipt);
  writeJson(path.join(folder, 'receipts/FOUNDATION_PIPELINE_REPORT.json'), {
    schema: 'foundation_pipeline_report_v1',
    mission_id: path.basename(folder),
    at: new Date().toISOString(),
    ok: pipelineOk,
    point_b_reached: pipelineOk,
    point_b_target: pointBTarget?.label,
    loop_mode: true,
    loop_receipt: 'receipts/FOUNDATION_LOOP_RECEIPT.json',
    obstacle_ledger: 'receipts/OBSTACLE_LESSON_LEDGER.json',
    stages: loopReceipt.phases,
    stoppage: loopReceipt.stoppage || null,
  });

  appendMissionLedger({
    mission_id: path.basename(folder),
    event: pipelineOk ? 'point_b_reached' : 'obstacle_loop_in_progress',
    runner: 'run-foundation.js',
    latency_ms: loopReceipt.latency_ms,
    verdict: pipelineOk ? 'POINT_B_PASS' : 'OBSTACLE_NOT_POINT_B',
    total_attempts: totalAttemptsRef.count,
    note: pipelineOk ? pointBTarget?.label : `obstacles=${loopReceipt.obstacles?.length || 0}`,
  });

  return { ok: pipelineOk, loopReceipt, point_b_reached: pipelineOk, pointB };
}

function finalizeLoopReceipt(loopReceipt, { started, totalAttemptsRef, ok, pointB }) {
  loopReceipt.finished_at = new Date().toISOString();
  loopReceipt.ok = ok;
  loopReceipt.point_b_reached = ok;
  loopReceipt.total_attempts = totalAttemptsRef.count;
  loopReceipt.latency_ms = Date.now() - started;
  loopReceipt.point_b = pointB || null;
  if (!ok && !loopReceipt.stoppage) {
    loopReceipt.stoppage = {
      reason: 'not_at_point_b',
      stoppage_is_failure: true,
      stopping_is_failure: true,
      lesson: 'Did not reach Point B — caller must continue loop; stopping is failure',
    };
  }
}
