#!/usr/bin/env node
/** Generate mission packs FACTORY-REBOOT-0006 through 0010. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '../..');

function sha256File(absPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

function makeStep(missionId, stepId, phaseId, title, contentName, targetRel, prev, sandbox = 'factory-staging/**') {
  const sourceRel = `builderos-reboot/MISSIONS/${missionId}/CONTENT/${contentName}`;
  const abs = path.join(REPO_ROOT, sourceRel);
  return {
    step_id: stepId,
    phase_id: phaseId,
    title,
    target_file: targetRel,
    action_type: 'write_file_exact',
    exact_inputs: { content_source_path: sourceRel },
    exact_output_contract: { type: 'byte_exact_copy', sha256: sha256File(abs) },
    allowed_context_files: [sourceRel],
    forbidden_context_files: ['**'],
    dependencies: prev ? [prev] : [],
    non_goals: ['Do not widen authority.'],
    acceptance_test_ids: [`AT-${stepId}-1`],
    blocked_return_type_on_failure: 'BLOCKED_RETURN_TO_BPB',
    sandbox_boundary: sandbox,
    authority_owner: 'Builder',
    on_block: 'BLOCKED_RETURN_TO_BPB',
  };
}

function writePack(missionId, scope, steps, phase) {
  const dir = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS', missionId);
  fs.mkdirSync(dir, { recursive: true });
  const blockedReturn = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'builderos-reboot/MISSIONS/FACTORY-REBOOT-0001/BLOCKED_RETURN_SCHEMA.json'), 'utf8'),
  );
  const blueprint = { mission_id: missionId, blueprint_id: `${missionId}-v1`, scope, allowed_action_types: ['write_file_exact'], steps };
  const files = {
    'README.md': `# ${missionId}\n\nPhase ${phase}. Scope: ${scope}\n`,
    'PRODUCT_DEVELOPMENT_RESULT.json': JSON.stringify({ status: 'PASS', mission_id: missionId, phase_boundary: scope }, null, 2),
    'FOUNDER_PACKET.json': JSON.stringify({ mission_id: missionId, scope: [scope], success_criteria: ['acceptance tests pass'] }, null, 2),
    'BLUEPRINT.json': JSON.stringify(blueprint, null, 2),
    'AUTHORITY_CHECK.json': JSON.stringify({
      mission_id: missionId,
      checks: steps.map((s) => ({ step_id: s.step_id, allowed_roles: ['Builder', 'Coder'], forbidden_roles: ['C2'], requires_founder_input: false })),
    }, null, 2),
    'SALVAGE_MAP.json': '[]\n',
    'BLOCKED_RETURN_SCHEMA.json': JSON.stringify(blockedReturn, null, 2),
  };
  for (const [name, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), name.endsWith('.md') ? body : `${body}\n`, 'utf8');
  }
  console.log(`${missionId}: ${steps.length} steps`);
}

const packs = [
  {
    id: 'FACTORY-REBOOT-0006',
    scope: 'execute_mission_over_http',
    phase: 'P16',
    files: [
      ['S601', 'Write run-mission dispatch', 'run-mission.js', 'factory-staging/factory-core/builder/run-mission.js'],
      ['S602', 'Write execute-mission route contract', 'factory-execute-mission-routes.js', 'factory-staging/factory-core/routes/factory-execute-mission-routes.js'],
      ['S603', 'Wire execute-mission routes', 'register-routes.js', 'factory-staging/startup/register-routes.js'],
    ],
  },
  {
    id: 'FACTORY-REBOOT-0007',
    scope: 'council_adapter_quarantine',
    phase: 'P17',
    files: [
      ['S701', 'Write council adapter module', 'council-adapter.js', 'factory-staging/factory-core/canon/services/council-adapter.js'],
      ['S702', 'Write council adapter boundary doc', 'COUNCIL_ADAPTER_BOUNDARY.md', 'factory-staging/factory-core/canon/services/COUNCIL_ADAPTER_BOUNDARY.md'],
      ['S703', 'Wire council status route', 'register-routes.js', 'factory-staging/startup/register-routes.js'],
    ],
  },
  {
    id: 'FACTORY-REBOOT-0008',
    scope: 'sentry_acceptance_hardening',
    phase: 'P18',
    files: [
      ['S801', 'Write verify-step-contract', 'verify-step-contract.js', 'factory-staging/factory-core/sentry/verify-step-contract.js'],
      ['S802', 'Harden run-verification', 'run-verification.js', 'factory-staging/factory-core/sentry/run-verification.js'],
    ],
  },
  {
    id: 'FACTORY-REBOOT-0009',
    scope: 'autopilot_queue_runner',
    phase: 'P19',
    files: [
      ['S901', 'Write autopilot runner script', 'autopilot-runner.mjs', 'builderos-reboot/scripts/autopilot-runner.mjs'],
    ],
  },
  {
    id: 'FACTORY-REBOOT-0010',
    scope: 'cutover_readiness_export',
    phase: 'P20',
    files: [
      ['S1001', 'Write export manifest script', 'export-factory-staging.mjs', 'builderos-reboot/scripts/export-factory-staging.mjs'],
      ['S1002', 'Write readiness report script', 'readiness-report.mjs', 'builderos-reboot/scripts/readiness-report.mjs'],
      ['S1003', 'Wire readiness HTTP route', 'register-routes.js', 'factory-staging/startup/register-routes.js'],
    ],
  },
];

for (const pack of packs) {
  let prev = null;
  const steps = pack.files.map(([stepId, title, content, target]) => {
    const sandbox = target.startsWith('builderos-reboot/') ? 'builderos-reboot/**' : 'factory-staging/**';
    const step = makeStep(pack.id, stepId, pack.phase, title, content, target, prev, sandbox);
    prev = stepId;
    return step;
  });
  writePack(pack.id, pack.scope, steps, pack.phase);
}

console.log('Generated missions 0006–0010');
