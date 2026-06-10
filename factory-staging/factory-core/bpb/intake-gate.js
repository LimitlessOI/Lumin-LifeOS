import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../builder/run-step.js';
import { validateProductDevelopmentGate } from '../product-development/validate-gate.js';
import { validateFounderPacketCompleteness } from '../founder-packet/validate-completeness.js';
import { runAdamFilter } from '../founder-intent/adam-filter.js';
import { blueprintFreezeCheck } from '../sentry/blueprint-freeze-check.js';
import { validateDeliberationGate } from '../deliberation/validate-deliberation-gate.js';

function loadMissionJson(missionId, filename) {
  const p = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS', missionId, filename);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const STEP_REQUIRED = [
  'step_id',
  'action_type',
  'target_file',
  'sandbox_boundary',
  'authority_owner',
];

/**
 * BPB intake gate — rejects if upstream strategy or blueprint shape is incomplete.
 */
export function runBpbIntakeGate(mission_id, { strict_pd = false, skip_if_missing = false, session_id = null } = {}) {
  if (!mission_id || mission_id === 'unknown') {
    return { ok: false, status: 'AIC_GATE_FAILURE', violations: ['mission_id required'] };
  }

  const missionDir = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS', mission_id);
  if (!fs.existsSync(missionDir)) {
    if (skip_if_missing) {
      return { ok: true, status: 'SKIP', reason: 'mission pack not found' };
    }
    return { ok: false, status: 'AIC_GATE_FAILURE', violations: [`mission pack missing: ${mission_id}`] };
  }

  const founder_packet = loadMissionJson(mission_id, 'FOUNDER_PACKET.json');
  const product_development = loadMissionJson(mission_id, 'PRODUCT_DEVELOPMENT_RESULT.json');
  const blueprint = loadMissionJson(mission_id, 'BLUEPRINT.json');

  const pd = validateProductDevelopmentGate(product_development, { mission_id, strict: strict_pd });
  const fp = validateFounderPacketCompleteness(founder_packet, { mission_id, strict: strict_pd });
  const adam = runAdamFilter({ founder_packet, product_development, strict: strict_pd });
  const freeze = blueprint ? blueprintFreezeCheck(blueprint) : { blueprint_status: 'MISSING', pass: false };

  const violations = [];
  if (!pd.ok && product_development) {
    violations.push(...(pd.violations || []).map((v) => `pd:${v}`));
  }
  if (!fp.ok) violations.push(...(fp.violations || []).map((v) => `fp:${v}`));
  if (!adam.ok) violations.push(...(adam.flags || []).map((v) => `adam:${v}`));
  if (!freeze.pass) violations.push(...(freeze.blocking || []).map((v) => `bpb:${v}`));

  const delibSession = session_id || `mission:${mission_id}`;
  const deliberation = validateDeliberationGate(delibSession, {
    skip_if_missing: skip_if_missing && !strict_pd,
  });
  if (!deliberation.ok && deliberation.status !== 'SKIP') {
    violations.push(...(deliberation.violations || []).map((v) => `delib:${v}`));
  }

  return {
    ok: violations.length === 0,
    status: violations.length === 0 ? 'BPB_INTAKE_PASS' : 'AIC_GATE_FAILURE',
    mission_id,
    checks: { product_development: pd, founder_packet: fp, adam_filter: adam, blueprint_freeze: freeze, deliberation_gate: deliberation },
    violations,
  };
}

export function validateBlueprintSteps(blueprint) {
  const blocking = [];
  const steps = blueprint?.steps || [];
  if (!steps.length) blocking.push('blueprint has no steps');
  for (const step of steps) {
    for (const key of STEP_REQUIRED) {
      if (!step[key]) blocking.push(`step ${step.step_id || '?'} missing ${key}`);
    }
  }
  return { pass: blocking.length === 0, blocking };
}
