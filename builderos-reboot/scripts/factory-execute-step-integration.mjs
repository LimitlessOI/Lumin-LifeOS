#!/usr/bin/env node
/**
 * Integration test: dispatchExecuteStep writes proof file via live runtime.
 * Usage: node builderos-reboot/scripts/factory-execute-step-integration.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(REPO_ROOT);

const { dispatchExecuteStep, resolveRepoPath } = await import(
  '../../factory-staging/factory-core/builder/run-step.js'
);

const sourceRel = 'builderos-reboot/MISSIONS/FACTORY-REBOOT-0005/CONTENT/proof-source.txt';
const targetRel = 'factory-staging/test-fixtures/proof-output.txt';
const sourceBytes = fs.readFileSync(resolveRepoPath(sourceRel));
const expectedSha = crypto.createHash('sha256').update(sourceBytes).digest('hex');

const step = {
  step_id: 'INTEGRATION-PROOF-001',
  action_type: 'write_file_exact',
  target_file: targetRel,
  sandbox_boundary: 'factory-staging/**',
  exact_inputs: { content_source_path: sourceRel },
  exact_output_contract: { type: 'byte_exact_copy', sha256: expectedSha },
};

const before = fs.existsSync(resolveRepoPath(targetRel));
if (before) fs.unlinkSync(resolveRepoPath(targetRel));

const { httpStatus, body } = dispatchExecuteStep({
  mission_id: 'FACTORY-REBOOT-0005',
  blueprint_id: 'integration-proof',
  step,
});

if (httpStatus !== 200 || body.builder?.status !== 'DONE') {
  console.error('FAIL dispatch', httpStatus, body);
  process.exit(1);
}

const written = fs.readFileSync(resolveRepoPath(targetRel), 'utf8');
if (written !== sourceBytes.toString('utf8')) {
  console.error('FAIL content mismatch');
  process.exit(1);
}

console.log('PASS execute-step integration');
console.log(`  wrote ${targetRel}`);
console.log(`  sha256=${body.builder.sha256.slice(0, 16)}…`);
