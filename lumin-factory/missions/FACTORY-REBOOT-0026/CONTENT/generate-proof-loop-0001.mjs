#!/usr/bin/env node
/**
 * SYNOPSIS: Generate FACTORY-PROOF-LOOP-0001 mission pack (Phase 11 anchor). Generate FACTORY-PROOF-LOOP-0001 mission pack (Phase 11 anchor). */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const missionId = 'FACTORY-PROOF-LOOP-0001';
const dir = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS', missionId);
fs.mkdirSync(dir, { recursive: true });

const markerContent = 'FACTORY-FULL-LOOP-PROOF-v1\n';
const sha256 = crypto.createHash('sha256').update(markerContent).digest('hex');

const blueprint = {
  mission_id: missionId,
  blueprint_id: `${missionId}-v1`,
  scope: 'phase_11_full_governed_loop_proof',
  allowed_action_types: ['write_file_exact'],
  steps: [{
    step_id: 'FL001',
    phase_id: 'P11',
    title: 'Write full loop proof marker',
    target_file: 'factory-staging/proof-loop/LOOP_MARKER.txt',
    action_type: 'write_file_exact',
    exact_inputs: { exact_content: markerContent },
    exact_output_contract: { type: 'byte_exact_copy', sha256 },
    allowed_context_files: [],
    forbidden_context_files: ['**'],
    dependencies: [],
    non_goals: ['Do not widen scope beyond proof marker.'],
    acceptance_test_ids: ['AT-FL001-1'],
    blocked_return_type_on_failure: 'BLOCKED_RETURN_TO_BPB',
    sandbox_boundary: 'factory-staging/**',
    authority_owner: 'Coder',
    on_block: 'BLOCKED_RETURN_TO_BPB',
  }],
};

const blockedReturn = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'builderos-reboot/MISSIONS/FACTORY-REBOOT-0001/BLOCKED_RETURN_SCHEMA.json'), 'utf8'));

for (const [name, body] of Object.entries({
  'README.md': `# ${missionId}\n\nPhase 11 full governed loop proof mission.\n`,
  'PRODUCT_DEVELOPMENT_RESULT.json': `${JSON.stringify({ status: 'PASS', mission_id: missionId, scope: ['phase_11_full_loop'] }, null, 2)}\n`,
  'FOUNDER_PACKET.json': `${JSON.stringify({ mission_id: missionId, founder_touches: 1, scope: ['Prove builder→sentry→historian→tsos→c2 loop'] }, null, 2)}\n`,
  'BLUEPRINT.json': `${JSON.stringify(blueprint, null, 2)}\n`,
  'AUTHORITY_CHECK.json': `${JSON.stringify({ mission_id: missionId, checks: [{ step_id: 'FL001', allowed_roles: ['Coder'], forbidden_roles: ['C2'], requires_founder_input: false }] }, null, 2)}\n`,
  'SALVAGE_MAP.json': '[]\n',
  'BLOCKED_RETURN_SCHEMA.json': `${JSON.stringify(blockedReturn, null, 2)}\n`,
  'ACCEPTANCE_TESTS.json': `${JSON.stringify([], null, 2)}\n`,
})) {
  fs.writeFileSync(path.join(dir, name), body, 'utf8');
}

// Sync acceptance with step_id via shared script pattern
const bp = JSON.parse(fs.readFileSync(path.join(dir, 'BLUEPRINT.json'), 'utf8'));
const tests = bp.steps.map((step) => ({
  test_id: `AT-${step.step_id}-1`,
  step_id: step.step_id,
  type: 'file_sha256_matches',
  target: step.target_file,
  expected_sha256: step.exact_output_contract.sha256,
}));
fs.writeFileSync(path.join(dir, 'ACCEPTANCE_TESTS.json'), `${JSON.stringify(tests, null, 2)}\n`);
console.log(`Generated ${missionId}`);
