#!/usr/bin/env node
/**
 * SYNOPSIS: Fail-closed verifier for production mission governance: blueprint-named gates must be wired hard before handoff/execution.
 * @ssot builderos-reboot/governance/PRODUCTION_MISSION_GATE_REGISTRY.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'PRODUCT-LIFERE-UNIVERSAL-OVERLAY-DEPLOY-0001';
const BP_REL = `builderos-reboot/MISSIONS/${MISSION}/BLUEPRINT.json`;
const REG_REL = 'builderos-reboot/governance/PRODUCTION_MISSION_GATE_REGISTRY.json';

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function main() {
  const bp = readJson(BP_REL);
  const reg = readJson(REG_REL);
  const findings = [];

  if (bp.blueprint_status === 'handoff_ready') {
    findings.push('blueprint_status may not be handoff_ready until all required gates are WIRED_HARD');
  }
  if (bp.failure_policy?.authority !== 'builderos-reboot/LOOP_ESCALATION_CONTRACT.json') {
    findings.push('failure_policy must delegate to the locked LOOP_ESCALATION_CONTRACT.json');
  }
  if (bp.failure_policy?.local_override_forbidden !== true) {
    findings.push('local retry/escalation override must be forbidden');
  }

  const required = new Set();
  for (const step of bp.steps || []) {
    if (!step.owner) findings.push(`${step.step_id}: owner missing`);
    if (step.mutation_allowed === undefined) findings.push(`${step.step_id}: mutation_allowed missing`);
    if (!step.acceptance) findings.push(`${step.step_id}: acceptance predicate missing`);
    if (!Array.isArray(step.required_gates) || step.required_gates.length === 0) {
      findings.push(`${step.step_id}: required_gates missing`);
      continue;
    }
    for (const gate of step.required_gates) required.add(gate);
  }

  for (const gate of [...required].sort()) {
    const row = reg.gates?.[gate];
    if (!row) {
      findings.push(`${gate}: absent from production gate registry`);
      continue;
    }
    if (row.status !== 'WIRED_HARD') {
      findings.push(`${gate}: ${row.status}${row.gap ? ` — ${row.gap}` : ''}`);
    }
    for (const evidence of row.evidence || []) {
      if (!fs.existsSync(path.join(ROOT, evidence))) findings.push(`${gate}: evidence path missing: ${evidence}`);
    }
  }

  const result = {
    schema: 'production_mission_governance_verification_v1',
    mission_id: MISSION,
    checked_at: new Date().toISOString(),
    required_gate_count: required.size,
    blocking_findings: findings,
    ok: findings.length === 0,
    verdict: findings.length === 0 ? 'GOVERNANCE_READY_FOR_EXECUTION' : 'BLOCKED_GOVERNANCE_NOT_HARD',
  };
  console.log(JSON.stringify(result, null, 2));
  process.exit(findings.length === 0 ? 0 : 1);
}

main();
