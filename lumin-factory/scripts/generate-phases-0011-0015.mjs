#!/usr/bin/env node
/**
 * SYNOPSIS: Generate mission packs FACTORY-REBOOT-0011 through 0015. Generate mission packs FACTORY-REBOOT-0011 through 0015. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '../..');

function sha256File(absPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

function makeStep(missionId, stepId, phaseId, title, contentName, targetRel, prev, sandbox) {
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
  for (const [name, body] of Object.entries({
    'README.md': `# ${missionId}\n\nScope: ${scope}\n`,
    'PRODUCT_DEVELOPMENT_RESULT.json': `${JSON.stringify({ status: 'PASS', mission_id: missionId, phase_boundary: scope }, null, 2)}\n`,
    'FOUNDER_PACKET.json': `${JSON.stringify({ mission_id: missionId, scope: [scope] }, null, 2)}\n`,
    'BLUEPRINT.json': `${JSON.stringify(blueprint, null, 2)}\n`,
    'AUTHORITY_CHECK.json': `${JSON.stringify({ mission_id: missionId, checks: steps.map((s) => ({ step_id: s.step_id, allowed_roles: ['Builder', 'Coder'], forbidden_roles: ['C2'], requires_founder_input: false })) }, null, 2)}\n`,
    'SALVAGE_MAP.json': '[]\n',
    'BLOCKED_RETURN_SCHEMA.json': `${JSON.stringify(blockedReturn, null, 2)}\n`,
  })) {
    fs.writeFileSync(path.join(dir, name), body, 'utf8');
  }
  console.log(`${missionId}: ${steps.length} steps`);
}

const packs = [
  {
    id: 'FACTORY-REBOOT-0011',
    scope: 'lumin_factory_cutover_bundle',
    phase: 'P21',
    files: [
      ['S1101', 'Write bundle builder script', 'build-lumin-factory-bundle.mjs', 'builderos-reboot/scripts/build-lumin-factory-bundle.mjs', 'builderos-reboot/**'],
      ['S1102', 'Write cutover guide', 'lumin-factory-README.md', 'builderos-reboot/LUMIN_FACTORY_CUTOVER.md', 'builderos-reboot/**'],
      ['S1103', 'Write cutover verify script', 'cutover-verify.mjs', 'builderos-reboot/scripts/cutover-verify.mjs', 'builderos-reboot/**'],
    ],
  },
  {
    id: 'FACTORY-REBOOT-0012',
    scope: 'determinism_mechanical_receipt',
    phase: 'P22',
    files: [
      ['S1201', 'Write determinism mechanical script', 'run-determinism-mechanical.mjs', 'builderos-reboot/scripts/run-determinism-mechanical.mjs', 'builderos-reboot/**'],
      ['S1202', 'Write determinism coder prompt', 'DETERMINISM_CODER_PROMPT.md', 'builderos-reboot/DETERMINISM_CODER_PROMPT.md', 'builderos-reboot/**'],
    ],
  },
  {
    id: 'FACTORY-REBOOT-0013',
    scope: 'greenfield_exact_content',
    phase: 'P23',
    files: [
      ['S1301', 'Extend run-step for greenfield', 'run-step.js', 'factory-staging/factory-core/builder/run-step.js', 'factory-staging/**'],
      ['S1302', 'Write greenfield pack generator', 'generate-greenfield-0001.mjs', 'builderos-reboot/scripts/generate-greenfield-0001.mjs', 'builderos-reboot/**'],
      ['S1303', 'Write greenfield integration test', 'greenfield-integration.mjs', 'builderos-reboot/scripts/greenfield-integration.mjs', 'builderos-reboot/**'],
    ],
  },
  {
    id: 'FACTORY-REBOOT-0014',
    scope: 'factory_http_client',
    phase: 'P24',
    files: [
      ['S1401', 'Write factory HTTP client', 'factory-http-client.mjs', 'builderos-reboot/scripts/factory-http-client.mjs', 'builderos-reboot/**'],
    ],
  },
  {
    id: 'FACTORY-REBOOT-0015',
    scope: 'mission_history_and_readiness_v2',
    phase: 'P25',
    files: [
      ['S1501', 'Write mission history module', 'mission-history.js', 'factory-staging/factory-core/historian/mission-history.js', 'factory-staging/**'],
      ['S1502', 'Upgrade readiness report', 'readiness-report.mjs', 'builderos-reboot/scripts/readiness-report.mjs', 'builderos-reboot/**'],
      ['S1503', 'Wire mission-history route', 'register-routes.js', 'factory-staging/startup/register-routes.js', 'factory-staging/**'],
    ],
  },
];

for (const pack of packs) {
  let prev = null;
  const steps = pack.files.map(([stepId, title, content, target, sandbox]) => {
    const step = makeStep(pack.id, stepId, pack.phase, title, content, target, prev, sandbox);
    prev = stepId;
    return step;
  });
  writePack(pack.id, pack.scope, steps, pack.phase);
}

console.log('Generated missions 0011–0015');
