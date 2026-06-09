#!/usr/bin/env node
/** Generate FACTORY-REBOOT-0005 mission pack (live execute-step wiring). */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '../..');
const MISSION_ID = 'FACTORY-REBOOT-0005';
const MISSION_DIR = path.join(REPO_ROOT, 'builderos-reboot', 'MISSIONS', MISSION_ID);

function sha256File(absPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

function makeStep(stepId, phaseId, title, contentName, targetRel, prev) {
  const sourceRel = `builderos-reboot/MISSIONS/${MISSION_ID}/CONTENT/${contentName}`;
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
    non_goals: ['Do not widen execute-step authority.'],
    acceptance_test_ids: [`AT-${stepId}-1`],
    blocked_return_type_on_failure: 'BLOCKED_RETURN_TO_BPB',
    sandbox_boundary: 'factory-staging/**',
    authority_owner: 'Builder',
    on_block: 'BLOCKED_RETURN_TO_BPB',
  };
}

const files = [
  ['S501', 'P15', 'Write Builder run-step dispatch', 'run-step.js', 'factory-staging/factory-core/builder/run-step.js'],
  ['S502', 'P15', 'Write SENTRY run-verification + historian receipt', 'run-verification.js', 'factory-staging/factory-core/sentry/run-verification.js'],
  ['S503', 'P15', 'Wire live execute-step routes', 'register-routes.js', 'factory-staging/startup/register-routes.js'],
  ['S504', 'P15', 'Write integration proof source fixture', 'proof-source.txt', 'factory-staging/test-fixtures/proof-source.txt'],
];

let prev = null;
const steps = files.map(([id, phase, title, content, target]) => {
  const step = makeStep(id, phase, title, content, target, prev);
  prev = id;
  return step;
});

const blueprint = {
  mission_id: MISSION_ID,
  blueprint_id: `${MISSION_ID}-v1`,
  scope: 'live_execute_step_dispatch',
  allowed_action_types: ['write_file_exact'],
  steps,
};

const blockedReturn = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'builderos-reboot/MISSIONS/FACTORY-REBOOT-0001/BLOCKED_RETURN_SCHEMA.json'), 'utf8'),
);

fs.mkdirSync(MISSION_DIR, { recursive: true });

const pack = {
  'README.md': `# ${MISSION_ID}

Live execute-step dispatch for factory-staging.

## Execute

\`\`\`bash
npm run factory:materialize-0005
npm run factory:integration
\`\`\`
`,
  'PRODUCT_DEVELOPMENT_RESULT.json': JSON.stringify({
    status: 'PASS',
    mission_id: MISSION_ID,
    resolved_questions: ['how execute-step runs one write_file_exact step'],
    unresolved_questions: ['full council adapter wiring'],
    phase_boundary: 'live_execute_step_only',
  }, null, 2),
  'FOUNDER_PACKET.json': JSON.stringify({
    mission_id: MISSION_ID,
    priority: 'high',
    scope: ['live POST /factory/execute-step', 'SENTRY pass/fail on DONE', 'historian step receipts'],
    non_goals: ['no multi-step orchestration', 'no council live calls'],
    success_criteria: ['integration test passes', 'acceptance tests pass'],
  }, null, 2),
  'BLUEPRINT.json': JSON.stringify(blueprint, null, 2),
  'AUTHORITY_CHECK.json': JSON.stringify({
    mission_id: MISSION_ID,
    checks: steps.map((s) => ({
      step_id: s.step_id,
      allowed_roles: ['Builder', 'Coder'],
      forbidden_roles: ['C2'],
      requires_founder_input: false,
    })),
  }, null, 2),
  'SALVAGE_MAP.json': JSON.stringify([], null, 2),
  'BLOCKED_RETURN_SCHEMA.json': JSON.stringify(blockedReturn, null, 2),
};

for (const [name, body] of Object.entries(pack)) {
  fs.writeFileSync(path.join(MISSION_DIR, name), name.endsWith('.md') ? body : `${body}\n`, 'utf8');
}

console.log(`Generated ${MISSION_ID} with ${steps.length} steps`);
