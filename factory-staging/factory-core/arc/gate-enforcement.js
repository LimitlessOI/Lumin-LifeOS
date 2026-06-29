/**
 * SYNOPSIS: Load GATE_ENFORCEMENT_MATRIX and evaluate HARD gates (fail-closed).
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../builder/run-step.js';

const MATRIX_PATH = path.join(REPO_ROOT, 'builderos-reboot/governance/GATE_ENFORCEMENT_MATRIX.json');

let cachedMatrix = null;

export function loadGateMatrix() {
  if (cachedMatrix) return cachedMatrix;
  if (!fs.existsSync(MATRIX_PATH)) {
    return { gates: [], enforcement_levels: {} };
  }
  cachedMatrix = JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8'));
  return cachedMatrix;
}

export function gateEnforcementLevel(gateId) {
  const matrix = loadGateMatrix();
  const gate = (matrix.gates || []).find((g) => g.gate_id === gateId);
  if (!gate) return 'SOFT';
  return gate.enforcement ?? gate.enforcement_target ?? gate.enforcement_v1 ?? 'SOFT';
}

export function isHardGate(gateId) {
  return gateEnforcementLevel(gateId) === 'HARD';
}

export function founderStopActive() {
  const paths = [
    path.join(REPO_ROOT, 'builderos-reboot/FOUNDER_STOP.json'),
    path.join(REPO_ROOT, 'data/founder_stop.json'),
  ];
  for (const p of paths) {
    if (!fs.existsSync(p)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (data.stop === true || data.founder_stop === true) return { active: true, path: p, data };
    } catch {
      /* ignore */
    }
  }
  return { active: false };
}

export function loadBpPriorityMission(missionId) {
  const p = path.join(REPO_ROOT, 'builderos-reboot/BP_PRIORITY.json');
  if (!fs.existsSync(p)) return null;
  try {
    const q = JSON.parse(fs.readFileSync(p, 'utf8'));
    return (q.items || []).find((i) => i.mission_id === missionId) || null;
  } catch {
    return null;
  }
}

export function isProofLapMission(missionFolder) {
  const missionId = path.basename(missionFolder);
  if (missionId.startsWith('BUILDEROS-INTAKE-LOOP')) return true;
  const baselinePath = path.join(missionFolder, 'INTENT_BASELINE.json');
  if (!fs.existsSync(baselinePath)) return false;
  try {
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    return baseline.proof_lap_only === true;
  } catch {
    return false;
  }
}

const TIER_PATH = path.join(REPO_ROOT, 'builderos-reboot/governance/BUILDEROS_EXECUTION_TIER.json');

export function loadExecutionTierConfig() {
  if (!fs.existsSync(TIER_PATH)) return { tiers: {} };
  try {
    return JSON.parse(fs.readFileSync(TIER_PATH, 'utf8'));
  } catch {
    return { tiers: {} };
  }
}

export function isGateRequiredForTier(gateId, executionTier = 'LOAD_BEARING') {
  const tier = String(executionTier || 'LOAD_BEARING').toUpperCase();
  const cfg = loadExecutionTierConfig();
  const def = cfg.tiers?.[tier];
  if (!def) return isHardGate(gateId);
  if ((def.gates_skipped || []).includes(gateId)) return false;
  if ((def.gates_required || []).includes(gateId)) return true;
  if (tier === 'MECHANICAL') return false;
  return isHardGate(gateId);
}
