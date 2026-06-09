#!/usr/bin/env node
/** Integration test: greenfield exact_content step via dispatchExecuteStep. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(REPO_ROOT);

const markerPath = path.join(REPO_ROOT, 'factory-staging/greenfield/PROOF_MARKER.txt');
if (fs.existsSync(markerPath)) fs.unlinkSync(markerPath);

const blueprint = JSON.parse(fs.readFileSync('builderos-reboot/MISSIONS/FACTORY-GREENFIELD-0001/BLUEPRINT.json', 'utf8'));
const step = blueprint.steps[0];

const { dispatchExecuteStep } = await import('../../factory-staging/factory-core/builder/run-step.js');
const { httpStatus, body } = dispatchExecuteStep({
  mission_id: 'FACTORY-GREENFIELD-0001',
  blueprint_id: blueprint.blueprint_id,
  step,
});

if (httpStatus !== 200 || body.builder?.input_mode !== 'greenfield') {
  console.error('FAIL greenfield integration', httpStatus, body);
  process.exit(1);
}

console.log('PASS greenfield integration');
console.log(`  input_mode=${body.builder.input_mode} sha256=${body.builder.sha256.slice(0, 16)}…`);
