#!/usr/bin/env node
/**
 * SYNOPSIS: Generate mission packs FACTORY-REBOOT-0016 through 0025. Generate mission packs FACTORY-REBOOT-0016 through 0025. */
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

function writePack(missionId, scope, steps) {
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
  { id: 'FACTORY-REBOOT-0016', scope: 'greenfield_3x_determinism', phase: 'P26', files: [['S1601', 'Greenfield 3x determinism script', 'run-greenfield-determinism-3x.mjs', 'builderos-reboot/scripts/run-greenfield-determinism-3x.mjs', 'builderos-reboot/**']] },
  { id: 'FACTORY-REBOOT-0017', scope: 'blueprint_duplication_test', phase: 'P27', files: [['S1701', 'Duplication rematerialize test', 'factory-duplication-test.mjs', 'builderos-reboot/scripts/factory-duplication-test.mjs', 'builderos-reboot/**']] },
  { id: 'FACTORY-REBOOT-0018', scope: 'queue_dry_run_autopilot', phase: 'P28', files: [['S1801', 'Queue dry-run script', 'autopilot-run-queue.mjs', 'builderos-reboot/scripts/autopilot-run-queue.mjs', 'builderos-reboot/**']] },
  { id: 'FACTORY-REBOOT-0019', scope: 'lumin_factory_repo_init', phase: 'P29', files: [
    ['S1901', 'Init lumin-factory repo script', 'init-lumin-factory-repo.mjs', 'builderos-reboot/scripts/init-lumin-factory-repo.mjs', 'builderos-reboot/**'],
    ['S1902', 'Root package.json template', 'lumin-factory-root-package.json', 'builderos-reboot/MISSIONS/FACTORY-REBOOT-0019/CONTENT/lumin-factory-root-package.json', 'builderos-reboot/**'],
    ['S1903', 'Root README template', 'lumin-factory-root-README.md', 'builderos-reboot/MISSIONS/FACTORY-REBOOT-0019/CONTENT/lumin-factory-root-README.md', 'builderos-reboot/**'],
  ]},
  { id: 'FACTORY-REBOOT-0020', scope: 'factory_ci_umbrella', phase: 'P30', files: [['S2001', 'Factory CI script', 'factory-ci.mjs', 'builderos-reboot/scripts/factory-ci.mjs', 'builderos-reboot/**']] },
  { id: 'FACTORY-REBOOT-0021', scope: 'sentry_mechanical_checks', phase: 'P31', files: [
    ['S2101', 'SENTRY mechanical checks', 'run-sentry-checks.mjs', 'builderos-reboot/scripts/run-sentry-checks.mjs', 'builderos-reboot/**'],
    ['S2102', 'Evaluation packet for reviewers', 'EVALUATION_PACKET.md', 'builderos-reboot/EVALUATION_PACKET.md', 'builderos-reboot/**'],
  ]},
  { id: 'FACTORY-REBOOT-0022', scope: 'mission_pack_index', phase: 'P32', files: [['S2201', 'Mission pack index generator', 'generate-mission-pack-index.mjs', 'builderos-reboot/scripts/generate-mission-pack-index.mjs', 'builderos-reboot/**']] },
  { id: 'FACTORY-REBOOT-0023', scope: 'readiness_report_v3', phase: 'P33', files: [['S2301', 'Readiness report v3', 'readiness-report.mjs', 'builderos-reboot/scripts/readiness-report.mjs', 'builderos-reboot/**']] },
  { id: 'FACTORY-REBOOT-0024', scope: 'project_certification', phase: 'P34', files: [['S2401', 'Project certification emitter', 'emit-project-certification.mjs', 'builderos-reboot/scripts/emit-project-certification.mjs', 'builderos-reboot/**']] },
  { id: 'FACTORY-REBOOT-0025', scope: 'operator_complete_guide', phase: 'P35', files: [['S2501', 'Operator complete guide', 'OPERATOR_COMPLETE.md', 'builderos-reboot/OPERATOR_COMPLETE.md', 'builderos-reboot/**']] },
];

for (const pack of packs) {
  let prev = null;
  const steps = pack.files.map(([stepId, title, content, target, sandbox]) => {
    const step = makeStep(pack.id, stepId, pack.phase, title, content, target, prev, sandbox);
    prev = stepId;
    return step;
  });
  writePack(pack.id, pack.scope, steps);
}

console.log('Generated missions 0016–0025');
