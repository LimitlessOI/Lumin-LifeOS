#!/usr/bin/env node
/**
 * SYNOPSIS: Integration test: greenfield exact_content step via dispatchExecuteStep. Integration test: greenfield exact_content step via dispatchExecuteStep. */
import fs from 'node:fs';
import path from 'node:path';
import { repoRootFromScriptMeta, detectFactoryLayout } from './factory-repo-layout.mjs';

const REPO_ROOT = repoRootFromScriptMeta(import.meta.url);
const layout = detectFactoryLayout(REPO_ROOT);
process.chdir(REPO_ROOT);

const markerPath = path.join(REPO_ROOT, 'factory-staging/greenfield/PROOF_MARKER.txt');
if (fs.existsSync(markerPath)) fs.unlinkSync(markerPath);

const blueprintPath = path.join(REPO_ROOT, layout.missionsRel, 'FACTORY-GREENFIELD-0001/BLUEPRINT.json');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
const step = blueprint.steps[0];

const { dispatchExecuteStep } = await import(
  path.join(REPO_ROOT, 'factory-staging/factory-core/builder/run-step.js')
);
const { httpStatus, body } = await dispatchExecuteStep({
  mission_id: 'FACTORY-GREENFIELD-0001',
  blueprint_id: blueprint.blueprint_id,
  step,
  skip_intake_gate: true,
});

if (httpStatus !== 200 || body.builder?.input_mode !== 'greenfield') {
  console.error('FAIL greenfield integration', httpStatus, body);
  process.exit(1);
}

console.log(`PASS greenfield integration (layout=${layout.mode})`);
console.log(`  input_mode=${body.builder.input_mode} sha256=${body.builder.sha256.slice(0, 16)}…`);
