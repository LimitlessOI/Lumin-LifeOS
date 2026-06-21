/**
 * SYNOPSIS: Full system ARC translate — intake validate → compile → simulate → write.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from '../builder/run-step.js';
import { validateArcIntake } from './validate-arc-intake.js';
import { compileBlueprint } from './compile-blueprint.js';
import { simulateBlueprintSteps } from './simulate-blueprint-steps.js';
import { resolveMissionFolder, missionRel } from './mission-paths.js';
import { writeAcceptanceTests } from './sync-acceptance.js';
import { coldBuilderWalk } from './builder-cold-walk.js';
import { evaluatePointBGate, evaluateCorridorEntered } from './point-b-gate.js';
import { writeSystemFailureDefect, isIntentRelatedGap } from './system-failure-defect.js';
import { buildUpstreamRoute, writeUpstreamRouteReport, classifyDrift } from './upstream-routing.js';
import { runSntTranslationAttack } from './foundation/snt-translation-attack.js';
import { runStudioSimulation } from './foundation/studio-simulation.js';
import { evaluateStudioBlockingGate } from './foundation/builder-entry-gate.js';
import { isHardGate } from './gate-enforcement.js';

function writeJson(absPath, data) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${JSON.stringify(data, null, 2)}\n`);
}

function syncAcceptance(missionId) {
  const script = path.join(REPO_ROOT, 'builderos-reboot/scripts/sync-acceptance-from-blueprint.mjs');
  if (!fs.existsSync(script)) return { ok: false, detail: 'sync script missing' };
  const r = spawnSync(process.execPath, [script, missionId], { cwd: REPO_ROOT, encoding: 'utf8' });
  return { ok: r.status === 0, detail: (r.stderr || r.stdout || '').trim() };
}

function writePostArcReceipts(missionFolder, { intake, simulation, compile }) {
  const receiptsDir = path.join(missionFolder, 'receipts');
  const missionId = path.basename(missionFolder);

  writeJson(path.join(receiptsDir, 'BUILDER_SIMULATION_REPORT.json'), simulation);

  const twin = {
    mission_id: missionId,
    simulated_at: new Date().toISOString(),
    simulated_by: 'factory-core/arc/translate-mission.js',
    compile_mode: compile?.blueprint?.compile_mode || 'mechanical',
    intent_sources_cited: compile?.blueprint?.intent_sources || [],
    blocking_gaps: simulation.summary.blocking_gaps,
    verdict: simulation.summary.clear_to_build ? 'PASS' : 'FAIL',
  };
  fs.writeFileSync(
    path.join(receiptsDir, 'ARC_TWIN_SIMULATION_RECEIPT.json'),
    `${JSON.stringify(twin, null, 2)}\n`,
  );
}

/**
 * Full system ARC translate — intake validate → compile → simulate → write.
 */
export function runArcTranslate(missionId, { dryRun = false, writeBlueprint = true } = {}) {
  const missionFolder = resolveMissionFolder(missionId);
  if (!missionFolder) {
    return { ok: false, status: 'BLOCKED_RETURN_TO_IDC', error: 'mission_not_found' };
  }

  const intake = validateArcIntake(missionId, { corridor: true });
  if (!intake.ok) {
    writeJson(path.join(missionFolder, 'receipts/BLOCKED_RETURN_TO_IDC.json'), {
      schema: 'blocked_return_to_idc_v1',
      mission_id: path.basename(missionFolder),
      at: new Date().toISOString(),
      status: intake.status,
      violations: intake.violations,
      idc_questions: intake.idc_questions,
    });
    return { ok: false, status: intake.status, intake };
  }

  const compile = compileBlueprint(missionId);
  if (!compile.ok) {
    return { ok: false, status: compile.status, intake, compile };
  }

  writeAcceptanceTests(missionFolder, compile.blueprint);
  const simulation = simulateBlueprintSteps(compile.blueprint, { missionFolder, trustArcPipeline: true });
  const coldWalk = coldBuilderWalk(compile.blueprint);
  const corridor = evaluateCorridorEntered(missionFolder);
  const pointB = evaluatePointBGate(missionFolder, { blueprint: compile.blueprint });

  writeJson(path.join(missionFolder, 'receipts/CORRIDOR_ENTERED_GATE_REPORT.json'), corridor);
  writeJson(path.join(missionFolder, 'receipts/BUILDER_COLD_SIMULATION_REPORT.json'), coldWalk);
  writeJson(path.join(missionFolder, 'receipts/POINT_B_GATE_REPORT.json'), pointB);

  const mechanicalPass = simulation.summary.clear_to_build && coldWalk.summary.architect_pass;

  if (!mechanicalPass) {
    const intentGaps = (simulation.all_gaps || []).filter(isIntentRelatedGap);
    if (intentGaps.length) {
      const drift = classifyDrift({ actor: 'system', kind: 'intent_gap_post_handoff', detail: 'corridor started with uncleared intent' });
      writeSystemFailureDefect(missionFolder, {
        reason: 'Intent gap after handoff — should have been caught in development (Chair failure)',
        defect_owner_seat: 'Chair',
        which_phase_should_have_caught_it: 'Pre-ARC',
        gaps: intentGaps,
        drift,
      });
      const route = buildUpstreamRoute({
        missionId: path.basename(missionFolder),
        violations: intentGaps.map((g) => g.decision_gap),
        defectOwnerSeat: 'Chair',
        pushedBy: 'ARC',
        chairCanSynthesize: false,
      });
      writeUpstreamRouteReport(missionFolder, route);
    }
  }

  const receipt = {
    schema: 'arc_run_receipt_v1',
    mission_id: path.basename(missionFolder),
    run_at: new Date().toISOString(),
    runner: 'factory-core/arc/translate-mission.js',
    arc_job: 'factory-staging/factory-core/arc/ARC_JOB.json',
    entry_gate: 'PASS',
    intake_status: intake.status,
    compile_mode: compile.blueprint.compile_mode,
    compile_status: compile.status,
    translate: {
      status: mechanicalPass ? 'MECHANICAL_PASS' : 'FAIL_SIMULATION',
      compiler: compile.blueprint.compiled_by,
    },
    simulation_summary: simulation.summary,
    cold_builder_walk: coldWalk.summary,
    mechanical_handoff_pass: mechanicalPass,
    handoff_pass: corridor.pass,
    corridor_entered: corridor.pass,
    proof_lap_only: pointB.proof_lap_only,
    system_produced: true,
    blueprint_written: false,
  };

  writePostArcReceipts(missionFolder, { intake, simulation, compile });
  runSntTranslationAttack(missionFolder, { blueprint: compile.blueprint, simulation });
  const studioReceipt = runStudioSimulation(missionFolder);
  const studioGate = evaluateStudioBlockingGate(missionFolder);
  if (!studioGate.pass && isHardGate('STUDIO_BLOCKING')) {
    writeJson(path.join(missionFolder, 'receipts/STUDIO_BLOCKING_GATE_REPORT.json'), studioGate);
    writeJson(path.join(missionFolder, 'ARC_RUN_RECEIPT.json'), {
      ...receipt,
      translate: { ...receipt.translate, status: 'BLOCKED_STUDIO' },
      studio_gate: studioGate,
    });
    return {
      ok: false,
      status: 'BLOCKED_RETURN_TO_ARC',
      intake,
      compile,
      simulation,
      studio: studioReceipt,
      studio_gate: studioGate,
      receipt,
    };
  }

  if (!mechanicalPass) {
    writeJson(path.join(missionFolder, 'ARC_RUN_RECEIPT.json'), receipt);
    return {
      ok: false,
      status: 'BLOCKED_RETURN_TO_ARC',
      intake,
      compile,
      simulation,
      cold_walk: coldWalk,
      point_b: pointB,
      receipt,
    };
  }

  let acceptance = { ok: false, skipped: true };
  if (!dryRun && writeBlueprint) {
    const bpPath = path.join(missionFolder, 'BLUEPRINT.json');
    if (fs.existsSync(bpPath)) {
      fs.copyFileSync(bpPath, path.join(missionFolder, 'BLUEPRINT.PREV.json'));
    }
    writeJson(bpPath, { ...compile.blueprint, authored_by: 'ARC' });
    acceptance = syncAcceptance(path.basename(missionFolder));
    if (!acceptance.ok) {
      acceptance = writeAcceptanceTests(missionFolder, compile.blueprint);
    }
    receipt.acceptance_sync = acceptance.ok ? 'PASS' : 'FAIL';
    receipt.blueprint_written = true;
    writeJson(path.join(missionFolder, 'ARC_RUN_RECEIPT.json'), receipt);

    if (acceptance.ok) {
      const writtenBp = { ...compile.blueprint, authored_by: 'ARC' };
      const resim = simulateBlueprintSteps(writtenBp, { missionFolder });
      const rewalk = coldBuilderWalk(writtenBp);
      if (!resim.summary.clear_to_build || !rewalk.summary.architect_pass) {
        receipt.translate.status = 'FAIL_POST_ACCEPTANCE_SYNC';
        writeJson(path.join(missionFolder, 'ARC_RUN_RECEIPT.json'), receipt);
        return { ok: false, status: 'BLOCKED_RETURN_TO_ARC', simulation: resim, cold_walk: rewalk, receipt };
      }
    }

    const preBuildScript = path.join(REPO_ROOT, 'scripts/assemble-pre-build-packet.mjs');
    if (fs.existsSync(preBuildScript)) {
      spawnSync(process.execPath, [
        preBuildScript,
        missionRel(missionFolder),
        '--sim-report',
        path.join(missionRel(missionFolder), 'receipts/BUILDER_SIMULATION_REPORT.json'),
      ], { cwd: REPO_ROOT });
    }
    writeJson(path.join(missionFolder, 'ARC_RUN_RECEIPT.json'), receipt);
  }

  return {
    ok: mechanicalPass && (acceptance.skipped || acceptance.ok),
    status: mechanicalPass ? 'ARC_TRANSLATE_PASS' : 'BLOCKED_RETURN_TO_ARC',
    mission_id: path.basename(missionFolder),
    intake,
    compile: { steps_count: compile.steps_count, content_root: compile.content_root },
    simulation: simulation.summary,
    cold_walk: coldWalk.summary,
    handoff: corridor,
    corridor,
    point_b: pointB,
    acceptance,
    receipt,
  };
}
