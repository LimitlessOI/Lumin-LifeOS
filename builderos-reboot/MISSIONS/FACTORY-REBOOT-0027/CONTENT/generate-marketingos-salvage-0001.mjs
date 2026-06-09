#!/usr/bin/env node
/** Generate first product salvage mission pack (MarketingOS stub per Phase 12). */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const missionId = 'PRODUCT-MARKETINGOS-SALVAGE-0001';
const dir = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS', missionId);
fs.mkdirSync(dir, { recursive: true });

const readmeContent = '# MarketingOS Salvage Stub\n\nFirst product mission blueprint shell. Expand via BPB before coder execution.\n';
const sha256 = crypto.createHash('sha256').update(readmeContent).digest('hex');

const blueprint = {
  mission_id: missionId,
  blueprint_id: `${missionId}-v1`,
  scope: 'phase_12_first_product_salvage_stub',
  allowed_action_types: ['write_file_exact'],
  steps: [{
    step_id: 'MS001',
    phase_id: 'P12',
    title: 'Write product salvage readme stub',
    target_file: 'builderos-reboot/product-salvage/MARKETINGOS_README.md',
    action_type: 'write_file_exact',
    exact_inputs: { exact_content: readmeContent },
    exact_output_contract: { type: 'byte_exact_copy', sha256 },
    allowed_context_files: [],
    forbidden_context_files: ['**'],
    dependencies: [],
    non_goals: ['Do not implement product code without full BPB expansion.'],
    acceptance_test_ids: ['AT-MS001-1'],
    blocked_return_type_on_failure: 'BLOCKED_RETURN_TO_BPB',
    sandbox_boundary: 'builderos-reboot/**',
    authority_owner: 'BPB',
    on_block: 'BLOCKED_RETURN_TO_BPB',
  }],
};

const blockedReturn = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'builderos-reboot/MISSIONS/FACTORY-REBOOT-0001/BLOCKED_RETURN_SCHEMA.json'), 'utf8'));

for (const [name, body] of Object.entries({
  'README.md': `# ${missionId}\n\nPhase 12 first product salvage mission (stub).\n`,
  'PRODUCT_DEVELOPMENT_RESULT.json': `${JSON.stringify({ status: 'PASS', mission_id: missionId, scope: ['marketingos_salvage_stub'] }, null, 2)}\n`,
  'FOUNDER_PACKET.json': `${JSON.stringify({ mission_id: missionId, product: 'MarketingOS', salvage_source: 'docs/projects/AMENDMENT_*', founder_approval_required: true }, null, 2)}\n`,
  'BLUEPRINT.json': `${JSON.stringify(blueprint, null, 2)}\n`,
  'AUTHORITY_CHECK.json': `${JSON.stringify({ mission_id: missionId, checks: [{ step_id: 'MS001', allowed_roles: ['BPB', 'Coder'], forbidden_roles: [], requires_founder_input: true }] }, null, 2)}\n`,
  'SALVAGE_MAP.json': `${JSON.stringify([{ source: 'docs/projects', target: 'product-salvage' }], null, 2)}\n`,
  'BLOCKED_RETURN_SCHEMA.json': `${JSON.stringify(blockedReturn, null, 2)}\n`,
  'ACCEPTANCE_TESTS.json': `${JSON.stringify([{ test_id: 'AT-MS001-1', type: 'file_sha256_matches', target: 'builderos-reboot/product-salvage/MARKETINGOS_README.md', expected_sha256: sha256 }], null, 2)}\n`,
})) {
  fs.writeFileSync(path.join(dir, name), body, 'utf8');
}
console.log(`Generated ${missionId}`);
