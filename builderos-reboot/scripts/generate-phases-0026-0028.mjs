#!/usr/bin/env node
/**
 * SYNOPSIS: Generate mission packs FACTORY-REBOOT-0026 through 0028 (Phase 11–12 completion). Generate mission packs FACTORY-REBOOT-0026 through 0028 (Phase 11–12 completion). */
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
  const blockedReturn = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'builderos-reboot/MISSIONS/FACTORY-REBOOT-0001/BLOCKED_RETURN_SCHEMA.json'), 'utf8'));
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
  { id: 'FACTORY-REBOOT-0026', scope: 'phase_11_full_loop_proof', phase: 'P36', files: [
    ['S2601', 'Generate proof loop mission pack', 'generate-proof-loop-0001.mjs', 'builderos-reboot/scripts/generate-proof-loop-0001.mjs', 'builderos-reboot/**'],
    ['S2602', 'Full loop proof runner', 'run-full-loop-proof.mjs', 'builderos-reboot/scripts/run-full-loop-proof.mjs', 'builderos-reboot/**'],
  ]},
  { id: 'FACTORY-REBOOT-0027', scope: 'phase_12_product_salvage', phase: 'P37', files: [
    ['S2701', 'Product salvage candidates generator', 'generate-product-salvage.mjs', 'builderos-reboot/scripts/generate-product-salvage.mjs', 'builderos-reboot/**'],
    ['S2702', 'MarketingOS salvage pack generator', 'generate-marketingos-salvage-0001.mjs', 'builderos-reboot/scripts/generate-marketingos-salvage-0001.mjs', 'builderos-reboot/**'],
  ]},
  { id: 'FACTORY-REBOOT-0028', scope: 'certification_v2_phase_11_12', phase: 'P38', files: [
    ['S2801', 'Certification v2 emitter', 'emit-project-certification-v2.mjs', 'builderos-reboot/scripts/emit-project-certification.mjs', 'builderos-reboot/**'],
  ]},
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

console.log('Generated missions 0026–0028');
