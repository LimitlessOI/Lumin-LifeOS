/**
 * SYNOPSIS: HARD builder entry gate — post-ARC bundle + Studio block.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadMissionJson } from '../mission-paths.js';
import { POST_ARC_RECEIPT_PATHS, isEmptyBuilderSim } from '../point-b-gate.js';
import { isHardGate, isProofLapMission } from '../gate-enforcement.js';

function loadJsonIfExists(absPath) {
  if (!fs.existsSync(absPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch {
    return null;
  }
}

export function evaluatePostArcBundleGate(missionFolder) {
  const missionId = path.basename(missionFolder);
  const violations = [];
  const checks = {};

  if (isProofLapMission(missionFolder)) {
    return {
      schema: 'post_arc_bundle_gate_v1',
      mission_id: missionId,
      pass: true,
      skipped: true,
      reason: 'proof_lap_only',
      violations: [],
      checks: {},
    };
  }

  for (const spec of POST_ARC_RECEIPT_PATHS) {
    const abs = path.join(missionFolder, spec.file);
    const exists = fs.existsSync(abs);
    checks[spec.id] = { pass: exists, path: spec.file };
    if (!exists) violations.push(`post_arc:missing ${spec.file}`);
  }

  const preBuild = loadJsonIfExists(path.join(missionFolder, 'PRE_BUILD_VALIDATION_PACKET.json'));
  checks.builder_clearance = { pass: preBuild?.builder_clearance === 'yes' };
  if (preBuild && preBuild.builder_clearance !== 'yes') {
    violations.push('post_arc:builder_clearance not yes');
  }

  const builderSim = loadJsonIfExists(path.join(missionFolder, 'receipts/BUILDER_SIMULATION_REPORT.json'));
  const blueprint = loadMissionJson(missionFolder, 'BLUEPRINT.json');
  if (isEmptyBuilderSim(builderSim, blueprint)) {
    violations.push('post_arc:BUILDER_SIMULATION_REPORT empty steps');
  }
  const blocking = builderSim?.summary?.blocking_gaps ?? builderSim?.blocking_gaps ?? 0;
  checks.builder_sim_blocking = { pass: blocking === 0, blocking_gaps: blocking };
  if (blocking > 0) violations.push(`post_arc:builder_sim blocking_gaps=${blocking}`);

  return {
    schema: 'post_arc_bundle_gate_v1',
    mission_id: missionId,
    pass: violations.length === 0,
    violations,
    checks,
    enforcement: isHardGate('POST_ARC_BUNDLE') ? 'HARD' : 'SOFT',
  };
}

export function evaluateStudioBlockingGate(missionFolder) {
  const missionId = path.basename(missionFolder);
  const studio = loadJsonIfExists(path.join(missionFolder, 'receipts/STUDIO_EXPERIENCE_SIMULATION_RECEIPT.json'));
  const studioPacket = loadJsonIfExists(path.join(missionFolder, 'STUDIO_DESIGN_PACKET.json'));

  if (!studio) {
    return {
      schema: 'studio_blocking_gate_v1',
      mission_id: missionId,
      pass: true,
      skipped: true,
      reason: 'no_studio_receipt',
      violations: [],
    };
  }

  if (studio.in_scope === false) {
    return {
      schema: 'studio_blocking_gate_v1',
      mission_id: missionId,
      pass: true,
      skipped: true,
      reason: 'studio_not_in_scope',
      violations: [],
    };
  }

  const violations = [];
  if (studio.pass !== true) {
    violations.push(`studio:${studio.verdict || 'failed'}`);
    for (const fp of studio.friction_points || []) {
      violations.push(`studio:friction:${fp}`);
    }
  }
  if (studio.in_scope === true && studioPacket == null) {
    violations.push('studio:missing STUDIO_DESIGN_PACKET.json');
  }
  if (studio.in_scope === true && studioPacket && !studioPacket.implementation_contract) {
    violations.push('studio:design packet missing implementation contract');
  }

  return {
    schema: 'studio_blocking_gate_v1',
    mission_id: missionId,
    pass: violations.length === 0,
    in_scope: true,
    verdict: studio.verdict,
    violations,
    enforcement: isHardGate('STUDIO_BLOCKING') ? 'HARD' : 'SOFT',
  };
}

export function evaluateBuilderEntryGate(missionFolder) {
  const postArc = evaluatePostArcBundleGate(missionFolder);
  const studio = evaluateStudioBlockingGate(missionFolder);
  const violations = [...postArc.violations, ...studio.violations];
  const hard = isHardGate('BUILDER_ENTRY') || isHardGate('POST_ARC_BUNDLE') || isHardGate('STUDIO_BLOCKING');

  return {
    schema: 'builder_entry_gate_v1',
    mission_id: path.basename(missionFolder),
    pass: violations.length === 0,
    status: violations.length === 0 ? 'BUILDER_ENTRY_PASS' : 'BLOCKED_RETURN_TO_ARC_OR_IDC',
    violations,
    checks: { post_arc: postArc, studio },
    enforcement: hard ? 'HARD' : 'SOFT',
  };
}
