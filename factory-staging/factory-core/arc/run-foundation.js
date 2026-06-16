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
  buildUpstreamRoute,
  writeChairFailureReceipt,
  writeUpstreamRouteReport,
} from './upstream-routing.js';

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
    report.stages.builder = runBuilderStage(missionId);
    if (!report.stages.builder.ok) {
      writeJson(path.join(folder, 'receipts/FOUNDATION_PIPELINE_REPORT.json'), report);
      return { ok: false, report };
    }
  }

  const bp = loadMissionJson(folder, 'BLUEPRINT.json');
  report.stages.final_gate = evaluatePointBGate(folder, { blueprint: bp });
  report.stages.scoreboard = writeResultScoreboard(folder);
  report.stages.release_gate = evaluateReleasePassGate(folder);

  report.ok = report.stages.final_gate.machine_path_complete;
  report.awaiting_alpha = report.ok && !report.stages.final_gate.alpha_reached;
  writeJson(path.join(folder, 'receipts/FOUNDATION_PIPELINE_REPORT.json'), report);
  return { ok: report.ok, report };
}
