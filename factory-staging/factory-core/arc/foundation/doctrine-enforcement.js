/**
 * SYNOPSIS: Fail-closed doctrine enforcement — no discards, role compliance, result truth wins.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../../builder/run-step.js';
import { loadMissionJson } from '../mission-paths.js';
import { isHardGate, isProofLapMission, loadBpPriorityMission } from '../gate-enforcement.js';
import { validateDepartmentReceipts } from '../department-simulations.js';
import { isStubSntReceipt, isEmptyBuilderSim } from '../point-b-gate.js';
import { validateReceiptMeasurements } from './simulation-measurements.js';

const PHASE_PATH = path.join(REPO_ROOT, 'builderos-reboot/governance/MISSION_PHASE_ARTIFACTS.json');

function loadPhaseRegistry() {
  if (!fs.existsSync(PHASE_PATH)) return { phases: {} };
  return JSON.parse(fs.readFileSync(PHASE_PATH, 'utf8'));
}

function artifactExists(missionFolder, spec) {
  const primary = path.join(missionFolder, spec.path);
  if (fs.existsSync(primary)) return { pass: true, path: spec.path };
  if (spec.alt) {
    const alt = path.join(missionFolder, spec.alt);
    if (fs.existsSync(alt)) return { pass: true, path: spec.alt };
  }
  return { pass: false, path: spec.path };
}

export function evaluatePhaseArtifacts(missionFolder, phaseName) {
  const registry = loadPhaseRegistry();
  const phase = registry.phases?.[phaseName];
  if (!phase) return { pass: true, violations: [], skipped: true };

  const violations = [];
  const checks = {};
  for (const spec of phase.required || []) {
    const result = artifactExists(missionFolder, spec);
    checks[spec.id] = result;
    if (!result.pass) {
      violations.push(`doctrine:${phaseName}:missing ${spec.id} (${spec.path})`);
    }
  }

  return {
    phase: phaseName,
    gate: phase.gate,
    pass: violations.length === 0,
    violations,
    checks,
    discard_policy: 'none — PARKED requires explicit receipt',
  };
}

export function evaluateBlueprintNoDiscard(missionFolder, blueprint) {
  const violations = [];
  const builderRun = loadMissionJson(missionFolder, 'BUILDER_RUN_RECEIPT.json');
  const blueprintSteps = blueprint?.steps || [];
  if (!blueprintSteps.length) return { pass: true, violations: [], skipped: true };

  const executed = new Map((builderRun?.step_results || []).map((s) => [s.step_id, s]));
  for (const step of blueprintSteps) {
    const sid = step.step_id;
    const row = executed.get(sid);
    if (!row) {
      violations.push(`doctrine:blueprint step ${sid} not executed — cannot discard`);
      continue;
    }
    if (row.status !== 'DONE' && row.status !== 'DRY_RUN') {
      violations.push(`doctrine:blueprint step ${sid} status ${row.status}`);
    }
    if (step.exact_output_contract?.sha256 && row.sha256 && row.sha256 !== step.exact_output_contract.sha256) {
      violations.push(`doctrine:blueprint step ${sid} sha256 mismatch`);
    }
  }

  return { pass: violations.length === 0, violations, steps_required: blueprintSteps.length, steps_done: executed.size };
}

export function evaluateResultTruth(missionFolder, blueprint) {
  const violations = [];
  const objective = loadMissionJson(missionFolder, 'OBJECTIVE_VERDICT.json');
  const builderRun = loadMissionJson(missionFolder, 'BUILDER_RUN_RECEIPT.json');
  const rel = objective?.receipt || blueprint?.receipt_path;
  let acceptance = null;
  if (rel) {
    const abs = path.isAbsolute(rel) ? rel : path.join(REPO_ROOT, rel);
    if (fs.existsSync(abs)) {
      try {
        acceptance = JSON.parse(fs.readFileSync(abs, 'utf8'));
      } catch {
        /* ignore */
      }
    }
  }

  const exitCode = builderRun?.acceptance_exit_code;
  const acceptancePass = acceptance?.verdict === 'PASS' && (acceptance?.tests_failed?.length ?? 0) === 0;
  const objectivePass = ['TECHNICAL_PASS', 'PASS'].includes(objective?.verdict);

  if (exitCode != null && exitCode !== 0 && !acceptancePass && !objectivePass) {
    violations.push('doctrine:acceptance_exit_code !== 0 — mission cannot be healthy');
  }
  if ((acceptance?.verdict === 'FAIL' || (acceptance?.tests_failed?.length > 0)) && !objectivePass) {
    violations.push(`doctrine:acceptance FAIL tests=${(acceptance?.tests_failed || []).join(',')}`);
  }
  if (objective?.verdict === 'NOT_COMPLETE' && loadBpPriorityMission(path.basename(missionFolder))) {
    violations.push('doctrine:OBJECTIVE_VERDICT NOT_COMPLETE on BP mission');
  }

  const onBp = Boolean(loadBpPriorityMission(path.basename(missionFolder)));
  if (onBp && !isProofLapMission(missionFolder)) {
    const healthyVerdicts = new Set(['TECHNICAL_PASS', 'PASS']);
    if (objective?.verdict && !healthyVerdicts.has(objective.verdict) && (exitCode === 0 || acceptancePass)) {
      violations.push(`doctrine:verdict/objective mismatch (${objective.verdict})`);
    }
  }

  return { pass: violations.length === 0, violations, acceptance_verdict: acceptance?.verdict, exit_code: exitCode };
}

export function evaluateSimulationFidelity(missionFolder, blueprint) {
  const violations = [];
  const objective = loadMissionJson(missionFolder, 'OBJECTIVE_VERDICT.json');
  const objectivePass = ['TECHNICAL_PASS', 'PASS'].includes(objective?.verdict);
  const builderSim = loadMissionJson(missionFolder, 'receipts/BUILDER_SIMULATION_REPORT.json');
  const snt = loadMissionJson(missionFolder, 'receipts/SNT_TRANSLATION_ATTACK_REPORT.json');

  if (isEmptyBuilderSim(builderSim, blueprint) && !objectivePass) {
    violations.push('doctrine:BUILDER_SIMULATION_REPORT empty steps for non-empty blueprint');
  }
  if (isStubSntReceipt(snt) && !objectivePass) {
    violations.push('doctrine:SNT_TRANSLATION_ATTACK stub or missing evidence');
  }
  if (builderSim && (builderSim.steps?.length || 0) > 0) {
    for (const step of builderSim.steps) {
      if (step.blocked && !step.decision_gap) {
        violations.push(`doctrine:builder sim step ${step.step_id} blocked without decision_gap`);
      }
    }
  }

  return { pass: violations.length === 0, violations };
}

export function evaluateDepartmentRoleCompliance(missionFolder) {
  const receiptsDir = path.join(missionFolder, 'receipts');
  const violations = [];
  const checks = {};

  for (const seat of ['SNT', 'CHAIR', 'CFO', 'WISDOM']) {
    const fileMap = {
      SNT: 'SNT_INTENT_ATTACK_RECEIPT.json',
      CHAIR: 'CHAIR_FORECAST_SIMULATION_RECEIPT.json',
      CFO: 'CFO_RESOURCE_SIMULATION_RECEIPT.json',
      WISDOM: 'WISDOM_REVIEW_RECEIPT.json',
    };
    const abs = path.join(receiptsDir, fileMap[seat]);
    if (!fs.existsSync(abs)) continue;
    let data;
    try {
      data = JSON.parse(fs.readFileSync(abs, 'utf8'));
    } catch {
      violations.push(`doctrine:${seat} invalid JSON`);
      continue;
    }
    const m = validateReceiptMeasurements(data, seat);
    checks[seat] = m;
    if (!m.pass) violations.push(...m.violations.map((v) => `doctrine:${v}`));
  }

  const dept = validateDepartmentReceipts(missionFolder);
  if (!dept.pass && !['TECHNICAL_PASS', 'PASS'].includes(loadMissionJson(missionFolder, 'OBJECTIVE_VERDICT.json')?.verdict)) {
    violations.push(...dept.violations.map((v) => `doctrine:${v}`));
  }

  return { pass: violations.length === 0, violations, checks, departments: dept };
}

/**
 * Full doctrine evaluation for a mission — use at builder entry, post-acceptance, never-stop.
 */
export function evaluateMissionDoctrine(missionFolder, { blueprint = null } = {}) {
  const missionId = path.basename(missionFolder);
  const bp = blueprint || loadMissionJson(missionFolder, 'BLUEPRINT.json');
  const proofLap = isProofLapMission(missionFolder);
  const onBp = Boolean(loadBpPriorityMission(missionId));
  const hard = onBp && !proofLap;

  const corridorEntered = fs.existsSync(path.join(missionFolder, 'ARC_RUN_RECEIPT.json'));
  const builderDone = fs.existsSync(path.join(missionFolder, 'BUILDER_RUN_RECEIPT.json'));

  const phases = [];
  if (hard && !corridorEntered) phases.push('development');
  if (hard) phases.push('corridor');
  if (hard && builderDone) phases.push('builder');
  if (hard && builderDone) phases.push('technical_pass');
  const phaseResults = {};
  const violations = [];

  for (const phase of phases) {
    phaseResults[phase] = evaluatePhaseArtifacts(missionFolder, phase);
    if (!phaseResults[phase].skipped && !phaseResults[phase].pass) {
      violations.push(...phaseResults[phase].violations);
    }
  }

  if (hard && builderDone) {
    const twinPath = path.join(missionFolder, 'receipts/TWIN_DRIFT_REPORT.json');
    if (!fs.existsSync(twinPath)) {
      violations.push('doctrine:technical_pass:missing TWIN_DRIFT_REPORT (run acceptance + reality score)');
    }
  }

  const noDiscard = evaluateBlueprintNoDiscard(missionFolder, bp);
  const resultTruth = evaluateResultTruth(missionFolder, bp);
  const simFidelity = evaluateSimulationFidelity(missionFolder, bp);
  const roles = evaluateDepartmentRoleCompliance(missionFolder);

  violations.push(...noDiscard.violations);
  violations.push(...resultTruth.violations);
  violations.push(...simFidelity.violations);
  violations.push(...roles.violations);

  const pass = violations.length === 0;
  const report = {
    schema: 'mission_doctrine_report_v1',
    mission_id: missionId,
    evaluated_at: new Date().toISOString(),
    pass,
    enforcement: hard ? 'HARD' : 'SOFT',
    violations,
    checks: {
      phases: phaseResults,
      blueprint_no_discard: noDiscard,
      result_truth: resultTruth,
      simulation_fidelity: simFidelity,
      department_roles: roles,
    },
    lesson: pass
      ? 'Doctrine satisfied — simulation measurements filed for Hist to score against reality.'
      : 'Doctrine violation — fix before claiming healthy or advancing queue.',
  };

  const out = path.join(missionFolder, 'receipts/MISSION_DOCTRINE_REPORT.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);

  return report;
}

export function doctrineBlocksAdvance(missionFolder, options = {}) {
  const report = evaluateMissionDoctrine(missionFolder, options);
  if (report.pass) return { blocked: false, report };
  if (report.enforcement === 'HARD' && isHardGate('BUILD_PASS_CLAIM')) {
    return { blocked: true, report, blocker: 'doctrine_violation' };
  }
  return { blocked: report.violations.some((v) => v.includes('acceptance')), report };
}
