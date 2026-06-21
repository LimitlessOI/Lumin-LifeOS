#!/usr/bin/env node
/**
 * SYNOPSIS: Generate FACTORY-REBOOT-0004 mission pack (proof / materialize mission).
 * Generate FACTORY-REBOOT-0004 mission pack (proof / materialize mission).
 * Run from repo root: node builderos-reboot/scripts/generate-factory-reboot-0004.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '../..');
const MISSION_ID = 'FACTORY-REBOOT-0004';
const MISSION_DIR = path.join(REPO_ROOT, 'builderos-reboot', 'MISSIONS', MISSION_ID);
const CONTENT_DIR = path.join(MISSION_DIR, 'CONTENT');
const ARTIFACTS_ROOT = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS/FACTORY-REBOOT-0003/ARTIFACTS');

function sha256File(absPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

function rel(p) {
  return p.replace(`${REPO_ROOT}/`, '').replace(/\\/g, '/');
}

function walkFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full, base));
    else out.push(rel(full));
  }
  return out.sort();
}

function makeCopyStep(stepId, phaseId, title, sourceRel, targetRel, prevStepId, testId) {
  const sha256 = sha256File(path.join(REPO_ROOT, sourceRel));
  return {
    step_id: stepId,
    phase_id: phaseId,
    title,
    target_file: targetRel,
    action_type: 'write_file_exact',
    exact_inputs: { content_source_path: sourceRel },
    exact_output_contract: { type: 'byte_exact_copy', sha256 },
    allowed_context_files: [sourceRel],
    forbidden_context_files: ['**'],
    dependencies: prevStepId ? [prevStepId] : [],
    non_goals: ['Do not modify bytes during copy.'],
    acceptance_test_ids: [testId],
    blocked_return_type_on_failure: 'BLOCKED_RETURN_TO_BPB',
    sandbox_boundary: 'factory-staging/**',
    authority_owner: 'Coder',
    on_block: 'BLOCKED_RETURN_TO_BPB',
  };
}

function makeContentStep(stepId, phaseId, title, contentFileName, targetRel, prevStepId, testId) {
  const sourceRel = `builderos-reboot/MISSIONS/${MISSION_ID}/CONTENT/${contentFileName}`;
  return makeCopyStep(stepId, phaseId, title, sourceRel, targetRel, prevStepId, testId);
}

const artifactFiles = walkFiles(ARTIFACTS_ROOT).map((sourceRel) => {
  const suffix = sourceRel.replace('builderos-reboot/MISSIONS/FACTORY-REBOOT-0003/ARTIFACTS/', '');
  return {
    sourceRel,
    targetRel: `factory-staging/${suffix}`,
  };
});

const steps = [];
let prev = null;
let n = 401;

const bootstrap = [
  ['Write factory-staging README', 'factory-staging-README.md', 'factory-staging/README.md'],
  ['Write factory-staging package.json', 'factory-staging-package.json', 'factory-staging/package.json'],
];

for (const [title, contentName, target] of bootstrap) {
  const stepId = `S${n}`;
  steps.push(makeContentStep(stepId, 'P11', title, contentName, target, prev, `AT-${stepId}-1`));
  prev = stepId;
  n++;
}

for (const { sourceRel, targetRel } of artifactFiles) {
  const stepId = `S${n}`;
  const short = path.basename(targetRel);
  steps.push(
    makeCopyStep(
      stepId,
      'P12',
      `Materialize ${short}`,
      sourceRel,
      targetRel,
      prev,
      `AT-${stepId}-1`,
    ),
  );
  prev = stepId;
  n++;
}

const councilSource = 'services/council-service.js';
const councilTarget = 'factory-staging/factory-core/canon/services/council-service.js';
const councilStepId = `S${n}`;
steps.push(
  makeCopyStep(
    councilStepId,
    'P13',
    'Import council-service from parts car (SM-004)',
    councilSource,
    councilTarget,
    prev,
    `AT-${councilStepId}-1`,
  ),
);
prev = councilStepId;
n++;

steps.push(
  makeContentStep(
    `S${n}`,
    'P13',
    'Write council import receipt',
    'council-import-receipt.json',
    'factory-staging/factory-core/canon/services/COUNCIL_IMPORT_RECEIPT.json',
    prev,
    `AT-S${n}-1`,
  ),
);
prev = `S${n}`;
n++;

const wiring = [
  ['Write factory-staging server composition root', 'factory-staging-server.js', 'factory-staging/server.js'],
  ['Write factory-staging route registration', 'factory-staging-register-routes.js', 'factory-staging/startup/register-routes.js'],
  ['Write factory-staging self-check script', 'factory-staging-self-check.mjs', 'factory-staging/scripts/factory-self-check.mjs'],
];

for (const [title, contentName, target] of wiring) {
  const stepId = `S${n}`;
  steps.push(makeContentStep(stepId, 'P14', title, contentName, target, prev, `AT-${stepId}-1`));
  prev = stepId;
  n++;
}

const blueprint = {
  mission_id: MISSION_ID,
  blueprint_id: `${MISSION_ID}-v1`,
  scope: 'proof_mission_materialize_factory_staging',
  allowed_action_types: ['write_file_exact'],
  steps,
};

const authorityChecks = steps.map((s) => ({
  step_id: s.step_id,
  allowed_roles: ['Coder', 'Builder'],
  forbidden_roles: ['C2', 'TSOS'],
  requires_founder_input: false,
}));

const salvageMap = [
  {
    salvage_id: 'SM-004',
    source_path: 'services/council-service.js',
    classification: 'IMPORT_AS_IS',
    target_path: councilTarget,
    reason_kept_or_rejected: 'Real consensus engine preserved byte-identical in proof mission.',
    known_risks: ['Live adapter wiring not in this mission.'],
    required_refactors: ['Mission-scoped adapter before production wiring.'],
    acceptance_proof_required: `AT-${councilStepId}-1 sha256 match`,
  },
  {
    salvage_id: 'SM-0003-PAYLOADS',
    source_path: 'builderos-reboot/MISSIONS/FACTORY-REBOOT-0003/ARTIFACTS/**',
    classification: 'COPY_AS_IS',
    target_path: 'factory-staging/**',
    reason_kept_or_rejected: 'Runtime payloads emitted in 0003; materialized here.',
    known_risks: [],
    required_refactors: [],
    acceptance_proof_required: 'Per-step sha256 acceptance tests',
  },
];

const founderPacket = {
  mission_id: MISSION_ID,
  priority: 'high',
  scope: [
    'materialize factory-staging from mission 0003 payloads',
    'import council-service byte-identically (SM-004)',
    'wire minimal local server stub for smoke checks',
    'prove mission executor + acceptance tooling end-to-end',
  ],
  non_goals: [
    'do not claim full production factory is live',
    'do not wire council into live Railway yet',
    'do not skip acceptance tests after materialization',
  ],
  target_users: ['Coder', 'Builder', 'SENTRY', 'cold-start models'],
  success_criteria: [
    'factory-staging tree exists with all payload files',
    'council import byte-identical to parts car',
    'npm run check passes in factory-staging',
    'mission acceptance tests pass',
  ],
  failure_criteria: [
    'executor cannot materialize from blueprint alone',
    'acceptance tests do not enforce sha256',
    'council import missing or modified',
  ],
  tradeoffs: ['materialize in current repo before clean Lumin-Factory repo cutover'],
  authority: {
    aic: 'mission judgment',
    bpb: 'blueprint emission',
    coder: 'exact step execution only',
    sentry: 'verification review',
  },
  escalation: {
    rule: 'block if any step requires non-coding judgment',
  },
  resources: {
    prior_missions: ['FACTORY-REBOOT-0001', 'FACTORY-REBOOT-0002', 'FACTORY-REBOOT-0003'],
  },
  founder_attention_budget: { level: 'low' },
  existing_assets: ['0003 artifact payloads', 'services/council-service.js'],
  forbidden_carry_forward: ['implicit imports', 'unpinned salvage'],
  evidence_inputs: ['SENTRY audit blockers', 'MISSION_EXECUTION_MODE.md'],
  risk_register: ['same-tier greenfield determinism still requires fresh coder sessions'],
  founder_decision_log: ['emit proof mission as materialize-first for easy implementation'],
  dependency_map: ['factory-staging/**'],
  phase_boundaries: 'P11_through_P14',
  freeze_criteria: ['all steps have sha256 contracts', 'acceptance tests generated'],
  change_control: { rule: 'post-proof missions may wire live runtime; may not delete receipts' },
  product_development_result_ref: `builderos-reboot/MISSIONS/${MISSION_ID}/PRODUCT_DEVELOPMENT_RESULT.json`,
};

const pdr = {
  status: 'PASS',
  mission_id: MISSION_ID,
  resolved_questions: [
    'where materialized factory runtime lives (factory-staging/)',
    'how to execute missions mechanically (execute-mission.mjs)',
    'SM-004 import path and proof',
  ],
  unresolved_questions: [
    'clean repo cutover to Lumin-Factory',
    'live execute-step dispatch implementation',
  ],
  founder_decisions: ['materialize before cutover for easier verification'],
  rejected_alternatives: ['hand-copy files without blueprint executor'],
  accepted_assumptions: ['staging in current repo is acceptable interim'],
  phase_boundary: 'proof_materialize_only',
  founder_attention_budget: { target: 'low', rule: 'executor and acceptance provide evidence' },
  risk_register: ['determinism on greenfield authoring still pending'],
  salvage_guidance: 'SM-004 byte copy with receipt JSON',
};

const blockedReturn = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'builderos-reboot/MISSIONS/FACTORY-REBOOT-0001/BLOCKED_RETURN_SCHEMA.json'), 'utf8'),
);

fs.mkdirSync(MISSION_DIR, { recursive: true });

const files = {
  'README.md': `# ${MISSION_ID}

## Mission

Proof mission: materialize \`factory-staging/\` from frozen payloads and run mechanical acceptance.

## What this proves

- Mission executor can run step-atomic blueprints
- Sha256 acceptance tests enforce byte-exact outputs
- SM-004 council import is byte-identical
- Minimal server stub loads materialized route payloads

## Execute

\`\`\`bash
npm run factory:materialize
cd factory-staging && npm install && npm run check
\`\`\`
`,
  'PRODUCT_DEVELOPMENT_RESULT.json': JSON.stringify(pdr, null, 2),
  'FOUNDER_PACKET.json': JSON.stringify(founderPacket, null, 2),
  'BLUEPRINT.json': JSON.stringify(blueprint, null, 2),
  'AUTHORITY_CHECK.json': JSON.stringify({ mission_id: MISSION_ID, checks: authorityChecks }, null, 2),
  'SALVAGE_MAP.json': JSON.stringify(salvageMap, null, 2),
  'BLOCKED_RETURN_SCHEMA.json': JSON.stringify(blockedReturn, null, 2),
};

for (const [name, body] of Object.entries(files)) {
  if (name.endsWith('.md')) {
    fs.writeFileSync(path.join(MISSION_DIR, name), body, 'utf8');
  } else {
    fs.writeFileSync(path.join(MISSION_DIR, name), `${body}\n`, 'utf8');
  }
}

console.log(`Generated ${MISSION_ID} with ${steps.length} steps at ${MISSION_DIR}`);
