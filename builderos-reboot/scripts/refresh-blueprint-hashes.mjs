#!/usr/bin/env node
/**
 * SYNOPSIS: Recompute byte_exact_copy sha256 pins in BLUEPRINT.json from files on disk. Recompute byte_exact_copy sha256 pins in BLUEPRINT.json from files on disk. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const missionId = process.argv[2];
if (!missionId) {
  console.error('Usage: node refresh-blueprint-hashes.mjs FACTORY-REBOOT-0001');
  process.exit(1);
}

const blueprintPath = path.join(ROOT, 'builderos-reboot', 'MISSIONS', missionId, 'BLUEPRINT.json');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
let updated = 0;

for (const step of blueprint.steps) {
  const contract = step.exact_output_contract;
  if (contract?.type !== 'byte_exact_copy' || !step.target_file) continue;
  if (step.target_file.endsWith('/ACCEPTANCE_TESTS.json')) continue;
  const sourceRel = step.exact_inputs?.content_source_path;
  const filePath = sourceRel
    ? path.join(ROOT, sourceRel)
    : path.join(ROOT, step.target_file);
  if (!fs.existsSync(filePath)) {
    console.error('MISSING', step.target_file);
    process.exit(1);
  }
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  if (contract.sha256 !== sha256) {
    console.log(`${step.step_id} ${step.target_file}: ${contract.sha256} -> ${sha256}`);
    contract.sha256 = sha256;
    updated++;
  }
}

fs.writeFileSync(blueprintPath, `${JSON.stringify(blueprint, null, 2)}\n`, 'utf8');
console.log(`Updated ${updated} hash pin(s) in ${blueprintPath}`);
