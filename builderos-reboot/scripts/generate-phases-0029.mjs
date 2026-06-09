#!/usr/bin/env node
/** Generate mission pack FACTORY-REBOOT-0029 — TSOS hot path + guardrails. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '../..');
const missionId = 'FACTORY-REBOOT-0029';

function sha256File(absPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

function makeStep(stepId, phaseId, title, contentName, targetRel, prev, sandbox) {
  const sourceRel = `builderos-reboot/MISSIONS/${missionId}/CONTENT/${contentName}`;
  return {
    step_id: stepId,
    phase_id: phaseId,
    title,
    target_file: targetRel,
    action_type: 'write_file_exact',
    exact_inputs: { content_source_path: sourceRel },
    exact_output_contract: { type: 'byte_exact_copy', sha256: sha256File(path.join(REPO_ROOT, sourceRel)) },
    allowed_context_files: [sourceRel],
    forbidden_context_files: ['**'],
    dependencies: prev ? [prev] : [],
    non_goals: ['TSOS must not gain mission authority.'],
    acceptance_test_ids: [`AT-${stepId}-1`],
    blocked_return_type_on_failure: 'BLOCKED_RETURN_TO_BPB',
    sandbox_boundary: sandbox,
    authority_owner: 'TSOS',
    on_block: 'BLOCKED_RETURN_TO_BPB',
  };
}

const files = [
  ['S2901', 'TSOS guardrails module', 'tsos-guardrails.js', 'factory-staging/factory-core/tsos/tsos-guardrails.js', 'factory-staging/**'],
  ['S2902', 'TSOS record-step-metrics with append', 'record-step-metrics.js', 'factory-staging/factory-core/tsos/record-step-metrics.js', 'factory-staging/**'],
  ['S2903', 'TSOS summary reader', 'tsos-summary.js', 'factory-staging/factory-core/tsos/tsos-summary.js', 'factory-staging/**'],
  ['S2904', 'Wire TSOS into run-step dispatch', 'run-step.js', 'factory-staging/factory-core/builder/run-step.js', 'factory-staging/**'],
  ['S2905', 'Wire TSOS summary route', 'register-routes.js', 'factory-staging/startup/register-routes.js', 'factory-staging/**'],
  ['S2906', 'TSOS integration test script', 'factory-tsos-integration.mjs', 'builderos-reboot/scripts/factory-tsos-integration.mjs', 'builderos-reboot/**'],
  ['S2907', 'TSOS integration doc', 'TSOS_FACTORY_INTEGRATION.md', 'builderos-reboot/TSOS_FACTORY_INTEGRATION.md', 'builderos-reboot/**'],
];

let prev = null;
const steps = files.map(([stepId, title, content, target, sandbox]) => {
  const step = makeStep(stepId, 'P39', title, content, target, prev, sandbox);
  prev = stepId;
  return step;
});

const dir = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS', missionId);
fs.mkdirSync(dir, { recursive: true });
const blockedReturn = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'builderos-reboot/MISSIONS/FACTORY-REBOOT-0001/BLOCKED_RETURN_SCHEMA.json'), 'utf8'),
);
const blueprint = { mission_id: missionId, blueprint_id: `${missionId}-v1`, scope: 'tsos_hot_path_with_guardrails', allowed_action_types: ['write_file_exact'], steps };

for (const [name, body] of Object.entries({
  'README.md': `# ${missionId}\n\nTSOS measurement on execute-step hot path with guardrails.\n`,
  'PRODUCT_DEVELOPMENT_RESULT.json': `${JSON.stringify({ status: 'PASS', mission_id: missionId, scope: ['tsos_integration'] }, null, 2)}\n`,
  'FOUNDER_PACKET.json': `${JSON.stringify({ mission_id: missionId, scope: ['TSOS measures efficiency; never declares truth'] }, null, 2)}\n`,
  'BLUEPRINT.json': `${JSON.stringify(blueprint, null, 2)}\n`,
  'AUTHORITY_CHECK.json': `${JSON.stringify({ mission_id: missionId, checks: steps.map((s) => ({ step_id: s.step_id, allowed_roles: ['TSOS', 'Builder'], forbidden_roles: ['C2'], requires_founder_input: false })) }, null, 2)}\n`,
  'SALVAGE_MAP.json': '[]\n',
  'BLOCKED_RETURN_SCHEMA.json': `${JSON.stringify(blockedReturn, null, 2)}\n`,
})) {
  fs.writeFileSync(path.join(dir, name), body, 'utf8');
}

console.log(`${missionId}: ${steps.length} steps`);
