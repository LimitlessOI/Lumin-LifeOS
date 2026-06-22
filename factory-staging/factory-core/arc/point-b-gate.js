/**
 * SYNOPSIS: Point B corridor + B→C machine path + Point C Alpha gates.
 * Intent thin/incomplete is ONLY valid in development (pre-handoff-intent-gate → Chair).
 * After handoff: intent gaps = system failure, not founder re-question.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadMissionJson } from './mission-paths.js';
import { validateDepartmentReceipts } from './department-simulations.js';

export const ALPHA_BLOCKING_PHASES = new Set(['P4']);

export const PRE_ARC_RECEIPT_PATHS = [
  { id: 'SNT_INTENT_ATTACK', file: 'receipts/SNT_INTENT_ATTACK_RECEIPT.json' },
  { id: 'CHAIR_FORECAST', file: 'receipts/CHAIR_FORECAST_SIMULATION_RECEIPT.json' },
  { id: 'CFO_RESOURCE', file: 'receipts/CFO_RESOURCE_SIMULATION_RECEIPT.json' },
  { id: 'WISDOM_REVIEW', file: 'receipts/WISDOM_REVIEW_RECEIPT.json' },
];

export const POST_ARC_RECEIPT_PATHS = [
  { id: 'ARC_TWIN_SIM', file: 'receipts/ARC_TWIN_SIMULATION_RECEIPT.json' },
  { id: 'BUILDER_SIM', file: 'receipts/BUILDER_SIMULATION_REPORT.json' },
  { id: 'SNT_TRANSLATION', file: 'receipts/SNT_TRANSLATION_ATTACK_REPORT.json' },
  { id: 'PRE_BUILD', file: 'PRE_BUILD_VALIDATION_PACKET.json' },
];

const HANDOFF_READY_LEVELS = new Set(['SUFFICIENT', 'LOCKED']);

function loadJsonIfExists(absPath) {
  if (!fs.existsSync(absPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch {
    return null;
  }
}

function isStubSntReceipt(data) {
  if (!data) return true;
  const attacks = data.attacks ?? [];
  const verdict = String(data.verdict || '');
  if ((data.attacks_run ?? attacks.length) === 0 && verdict.includes('clearance_yes')) return true;
  const blockingPasses = attacks.filter((a) => a.severity === 'blocking' && a.pass);
  if (blockingPasses.some((a) => !a.evidence_if_wrong)) return true;
  return false;
}

function isEmptyBuilderSim(data, blueprint) {
  const blueprintSteps = blueprint?.steps?.length || 0;
  if (!blueprintSteps) return false;
  if (data?.steps?.length) return false;
  if (data?.summary?.clear_to_build === true && Number(data?.summary?.total_gaps || 0) === 0) {
    return false;
  }
  return true;
}

function loadAcceptanceVerdict(missionFolder, blueprint) {
  const objective = loadJsonIfExists(path.join(missionFolder, 'OBJECTIVE_VERDICT.json'));
  const rel = objective?.receipt || blueprint?.receipt_path || blueprint?.acceptance_receipt;
  if (!rel) return null;
  const abs = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);
  return loadJsonIfExists(abs);
}

function isProofLapMission(roadmap, missionId, baseline, objective) {
  if (roadmap?.proof_lap_mission === missionId) return true;
  if (baseline?.proof_lap_only === true) return true;
  if (objective?.proof_lap_only === true) return true;
  if (String(roadmap?.full_map_note || '').toLowerCase().includes('proof lap')) return true;
  return false;
}

/**
 * Corridor entered — Chair locked handoff. No intent re-litigation.
 */
export function evaluateCorridorEntered(missionFolder) {
  const missionId = path.basename(missionFolder);
  const violations = [];
  const checks = {};

  const founderMd = path.join(missionFolder, 'FOUNDER_PACKET.md');
  const founderJson = path.join(missionFolder, 'FOUNDER_PACKET.json');
  checks.founder_packet = { pass: fs.existsSync(founderMd) || fs.existsSync(founderJson) };
  if (!checks.founder_packet.pass) violations.push('corridor:missing founder packet');

  const baseline = loadMissionJson(missionFolder, 'INTENT_BASELINE.json');
  checks.intent_baseline = {
    pass: baseline?.status === 'HANDOFF_READY',
    status: baseline?.status || null,
  };
  if (baseline?.status !== 'HANDOFF_READY') {
    violations.push(`corridor:handoff not locked (${baseline?.status || 'missing'})`);
  }

  const chairHandoff =
    fs.existsSync(path.join(missionFolder, 'CHAIR_HANDOFF_RECEIPT.json')) ||
    fs.existsSync(path.join(missionFolder, 'FOUNDER_HANDOFF_RECEIPT.json'));
  checks.chair_handoff = { pass: chairHandoff };
  if (!chairHandoff) violations.push('corridor:missing CHAIR_HANDOFF_RECEIPT');

  const preArc = loadMissionJson(missionFolder, 'PRE_ARC_INPUT_PACKET.json');
  checks.pre_arc_packet = { pass: Boolean(preArc?.manifest?.length) };
  if (!preArc?.manifest?.length) violations.push('corridor:missing PRE_ARC_INPUT_PACKET.json');

  for (const spec of PRE_ARC_RECEIPT_PATHS) {
    const exists = fs.existsSync(path.join(missionFolder, spec.file));
    checks[`pre_arc_${spec.id}`] = { pass: exists, path: spec.file };
    if (!exists) violations.push(`corridor:missing ${spec.file}`);
  }

  const departments = validateDepartmentReceipts(missionFolder);
  checks.departments = departments.checks;
  if (!departments.pass) {
    violations.push(...departments.violations.map((v) => `corridor:${v}`));
  }

  return {
    schema: 'corridor_entered_gate_v1',
    mission_id: missionId,
    point: 'B',
    pass: violations.length === 0,
    violations,
    checks,
    lesson: violations.length
      ? 'Corridor not properly entered — Chair must complete development handoff first.'
      : 'Protected corridor entered. Adam job done until Alpha. Intent not re-litigated.',
  };
}

/** @deprecated use evaluateCorridorEntered — kept for import compat */
export function evaluateHandoffGate(missionFolder) {
  return evaluateCorridorEntered(missionFolder);
}

/**
 * B→C machine path — ARC + Builder + acceptance. Intent gaps here = system failure.
 */
export function evaluateMachinePathGate(missionFolder, { blueprint } = {}) {
  const missionId = path.basename(missionFolder);
  const roadmap = loadMissionJson(missionFolder, 'BLUEPRINT_ROADMAP.json');
  const baseline = loadMissionJson(missionFolder, 'INTENT_BASELINE.json');
  const objective = loadMissionJson(missionFolder, 'OBJECTIVE_VERDICT.json');
  const proofLap = isProofLapMission(roadmap, missionId, baseline, objective);

  const violations = [];
  const checks = {};

  const corridor = evaluateCorridorEntered(missionFolder);
  checks.corridor = { pass: corridor.pass, violations: corridor.violations };
  if (!corridor.pass) violations.push(...corridor.violations);

  if (proofLap) {
    violations.push('machine:proof_lap_only — meta wiring is not product machine path');
  }

  const phases = roadmap?.phases || [];
  const futureAlphaBlockers = phases.filter(
    (p) => p.status === 'FUTURE' && ALPHA_BLOCKING_PHASES.has(p.phase_id),
  );
  if (futureAlphaBlockers.length) {
    violations.push(
      `machine:roadmap FUTURE ${futureAlphaBlockers.map((p) => p.phase_id).join(',')}`,
    );
  }

  const blueprintPhases = new Set((blueprint?.steps || []).map((s) => s.phase_id).filter(Boolean));
  const readyPhases = phases.filter((p) => p.status === 'BUILDER_READY');
  const readyMissingSteps = readyPhases.filter((p) => {
    if (blueprintPhases.has(p.phase_id)) return false;
    if (p.phase_id === 'P5' && blueprint?.acceptance_command) return false;
    return true;
  });
  if (readyMissingSteps.length) {
    violations.push(
      `machine:blueprint missing phases ${readyMissingSteps.map((p) => p.phase_id).join(',')}`,
    );
  }

  if (!proofLap) {
    for (const spec of POST_ARC_RECEIPT_PATHS) {
      const exists = fs.existsSync(path.join(missionFolder, spec.file));
      checks[`post_arc_${spec.id}`] = { pass: exists, path: spec.file };
      if (!exists) violations.push(`machine:missing ${spec.file}`);
    }

    const snt = loadJsonIfExists(path.join(missionFolder, 'receipts/SNT_TRANSLATION_ATTACK_REPORT.json'));
    if (isStubSntReceipt(snt)) violations.push('machine:SNT_TRANSLATION_ATTACK stub');

    const builderSim = loadJsonIfExists(path.join(missionFolder, 'receipts/BUILDER_SIMULATION_REPORT.json'));
    if (isEmptyBuilderSim(builderSim, blueprint)) {
      violations.push('machine:BUILDER_SIMULATION_REPORT empty steps for non-empty blueprint');
    }

    const acceptanceReceipt = loadAcceptanceVerdict(missionFolder, blueprint);
    if (acceptanceReceipt?.verdict === 'FAIL' || (acceptanceReceipt?.tests_failed?.length > 0)) {
      violations.push('machine:acceptance FAIL — result truth wins over corridor pass');
    }

    const preBuild = loadJsonIfExists(path.join(missionFolder, 'PRE_BUILD_VALIDATION_PACKET.json'));
    if (preBuild?.builder_clearance !== 'yes') violations.push('machine:builder_clearance not yes');

    const arcReceipt = loadJsonIfExists(path.join(missionFolder, 'ARC_RUN_RECEIPT.json'));
    checks.arc_run = {
      pass: arcReceipt?.mechanical_handoff_pass === true,
      status: arcReceipt?.translate?.status || null,
    };
    if (arcReceipt?.mechanical_handoff_pass !== true) {
      violations.push('machine:ARC mechanical handoff not pass');
    }

    const builderRun = loadJsonIfExists(path.join(missionFolder, 'BUILDER_RUN_RECEIPT.json'));
    checks.builder_executed = { pass: false, value: builderRun?.verdict || null };
    const builderOk =
      builderRun?.verdict === 'TECHNICAL_PASS' || builderRun?.verdict === 'PASS';
    checks.builder_executed.pass = builderOk;
    if (!builderOk) violations.push('machine:Builder not TECHNICAL_PASS');
  }

  return {
    schema: 'machine_path_gate_v1',
    mission_id: missionId,
    point: 'B_to_C',
    proof_lap_only: proofLap,
    pass: violations.length === 0,
    violations,
    checks,
    awaiting_founder_at_alpha: true,
    lesson: violations.length
      ? 'System failed B→C — ARC or Builder did not complete. If intent gap: system failure, not founder.'
      : 'Machine path complete. Ready for Adam Alpha evaluation.',
  };
}

/**
 * Point C Alpha — founder evaluates outcome after machine delivers.
 */
export function evaluateAlphaGate(missionFolder, { blueprint } = {}) {
  const machine = evaluateMachinePathGate(missionFolder, { blueprint });
  const objective = loadMissionJson(missionFolder, 'OBJECTIVE_VERDICT.json');
  const violations = [...machine.violations];

  if (objective?.founder_usability_pass !== true) {
    violations.push('alpha:founder has not confirmed Alpha yet');
  }

  return {
    schema: 'alpha_gate_v1',
    mission_id: path.basename(missionFolder),
    point: 'C',
    machine_path_pass: machine.pass,
    pass: machine.pass && objective?.founder_usability_pass === true,
    founder_usability_pass: objective?.founder_usability_pass === true,
    violations,
    checks: {
      ...machine.checks,
      founder_usability: {
        pass: objective?.founder_usability_pass === true,
        value: objective?.founder_usability_pass ?? null,
      },
    },
    lesson: machine.pass
      ? objective?.founder_usability_pass
        ? 'Alpha reached.'
        : 'Machine delivered. Adam evaluates at Alpha.'
      : 'Cannot reach Alpha — machine path incomplete.',
  };
}

/** Combined report for CLI + receipts */
export function evaluatePointBGate(missionFolder, opts = {}) {
  const corridor = evaluateCorridorEntered(missionFolder);
  const machine = evaluateMachinePathGate(missionFolder, opts);
  const alpha = evaluateAlphaGate(missionFolder, opts);
  const roadmap = loadMissionJson(missionFolder, 'BLUEPRINT_ROADMAP.json');
  const baseline = loadMissionJson(missionFolder, 'INTENT_BASELINE.json');
  const objective = loadMissionJson(missionFolder, 'OBJECTIVE_VERDICT.json');
  const proofLap = isProofLapMission(roadmap, path.basename(missionFolder), baseline, objective);
  const builderRun = loadJsonIfExists(path.join(missionFolder, 'BUILDER_RUN_RECEIPT.json'));

  return {
    schema: 'point_b_gate_v2',
    mission_id: path.basename(missionFolder),
    evaluated_at: new Date().toISOString(),
    proof_lap_only: proofLap,
    handoff: corridor,
    corridor,
    machine_path: machine,
    alpha,
    point_b_reached: corridor.pass,
    machine_path_complete: machine.pass,
    alpha_reached: alpha.pass,
    pass: machine.pass,
    status: proofLap
      ? 'PROOF_LAP_NOT_PRODUCT_PATH'
      : alpha.pass
        ? 'ALPHA_PASS'
        : machine.pass
          ? 'MACHINE_PATH_PASS_AWAITING_ALPHA'
          : corridor.pass
            ? 'BLOCKED_MACHINE_PATH'
            : 'BLOCKED_CORRIDOR',
    violations: machine.violations,
    infrastructure_only:
      proofLap &&
      (builderRun?.verdict === 'INFRA_PASS' || builderRun?.verdict === 'PASS') &&
      objective?.technical_pass === true,
    lesson: machine.pass
      ? 'Corridor protected. Machine delivered. Alpha = founder evaluation only.'
      : corridor.pass
        ? 'Corridor entered. System must complete ARC → Builder → acceptance.'
        : 'Development handoff incomplete — Chair resolves before corridor.',
  };
}

export { isStubSntReceipt, isEmptyBuilderSim };
