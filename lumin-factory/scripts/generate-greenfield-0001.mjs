#!/usr/bin/env node
/**
 * SYNOPSIS: Emit FACTORY-GREENFIELD-0001 — first greenfield (exact_content) mission pack. Emit FACTORY-GREENFIELD-0001 — first greenfield (exact_content) mission pack. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MISSION_ID = 'FACTORY-GREENFIELD-0001';
const DIR = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS', MISSION_ID);

const markerContent = 'FACTORY-GREENFIELD-PROOF-v1\n';
const markerSha = crypto.createHash('sha256').update(markerContent).digest('hex');
const target = 'factory-staging/greenfield/PROOF_MARKER.txt';

const step = {
  step_id: 'GF001',
  phase_id: 'PG1',
  title: 'Write greenfield proof marker',
  target_file: target,
  action_type: 'write_file_exact',
  exact_inputs: { exact_content: markerContent },
  exact_output_contract: { type: 'byte_exact_copy', sha256: markerSha },
  allowed_context_files: [],
  forbidden_context_files: ['**'],
  dependencies: [],
  non_goals: ['Do not add extra files.'],
  acceptance_test_ids: ['AT-GF001-1'],
  blocked_return_type_on_failure: 'BLOCKED_RETURN_TO_BPB',
  sandbox_boundary: 'factory-staging/**',
  authority_owner: 'Coder',
  on_block: 'BLOCKED_RETURN_TO_BPB',
};

const blueprint = {
  mission_id: MISSION_ID,
  blueprint_id: `${MISSION_ID}-v1`,
  scope: 'first_greenfield_exact_content_step',
  allowed_action_types: ['write_file_exact'],
  steps: [step],
};

const acceptance = [{
  test_id: 'AT-GF001-1',
  step_id: 'GF001',
  type: 'file_sha256_matches',
  target,
  expected_sha256: markerSha,
}];

const blockedReturn = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'builderos-reboot/MISSIONS/FACTORY-REBOOT-0001/BLOCKED_RETURN_SCHEMA.json'), 'utf8'),
);

fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(path.join(DIR, 'README.md'), `# ${MISSION_ID}\n\nFirst greenfield mission: step uses exact_content (no content_source_path).\n`, 'utf8');
fs.writeFileSync(path.join(DIR, 'BLUEPRINT.json'), `${JSON.stringify(blueprint, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(DIR, 'ACCEPTANCE_TESTS.json'), `${JSON.stringify(acceptance, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(DIR, 'FOUNDER_PACKET.json'), `${JSON.stringify({ mission_id: MISSION_ID, scope: ['greenfield proof'] }, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(DIR, 'PRODUCT_DEVELOPMENT_RESULT.json'), `${JSON.stringify({ status: 'PASS', mission_id: MISSION_ID }, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(DIR, 'AUTHORITY_CHECK.json'), `${JSON.stringify({ mission_id: MISSION_ID, checks: [{ step_id: 'GF001', allowed_roles: ['Coder'], forbidden_roles: ['C2'], requires_founder_input: false }] }, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(DIR, 'SALVAGE_MAP.json'), '[]\n', 'utf8');
fs.writeFileSync(path.join(DIR, 'BLOCKED_RETURN_SCHEMA.json'), `${JSON.stringify(blockedReturn, null, 2)}\n`, 'utf8');

console.log(`Generated ${MISSION_ID} greenfield pack`);
