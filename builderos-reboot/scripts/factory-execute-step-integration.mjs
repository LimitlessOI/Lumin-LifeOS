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

const escapedTargetRel = 'factory-staging/test-fixtures/sandbox/../../../path-traversal-proof.txt';
const escapedTargetPath = resolveRepoPath(escapedTargetRel);
if (fs.existsSync(escapedTargetPath)) fs.unlinkSync(escapedTargetPath);

const traversal = dispatchExecuteStep({
  mission_id: 'FACTORY-REBOOT-0005',
  blueprint_id: 'integration-proof',
  skip_intake_gate: true,
  step: {
    step_id: 'INTEGRATION-TRAVERSAL-001',
    action_type: 'write_file_exact',
    target_file: escapedTargetRel,
    sandbox_boundary: 'factory-staging/test-fixtures/sandbox/**',
    exact_inputs: { exact_content: 'TRAVERSAL_PROOF' },
  },
});

if (traversal.httpStatus !== 422 || traversal.body?.status !== 'BLOCKED_RETURN_TO_BPB') {
  console.error('FAIL traversal target was not blocked', traversal);
  if (fs.existsSync(escapedTargetPath)) fs.unlinkSync(escapedTargetPath);
  process.exit(1);
}

if (fs.existsSync(escapedTargetPath)) {
  console.error('FAIL traversal target wrote outside sandbox');
  fs.unlinkSync(escapedTargetPath);
  process.exit(1);
}

const mismatchRel = 'factory-staging/test-fixtures/sha-mismatch-proof.txt';
const mismatchPath = resolveRepoPath(mismatchRel);
if (fs.existsSync(mismatchPath)) fs.unlinkSync(mismatchPath);

const mismatch = dispatchExecuteStep({
  mission_id: 'FACTORY-REBOOT-0005',
  blueprint_id: 'integration-proof',
  skip_intake_gate: true,
  step: {
    step_id: 'INTEGRATION-SHA-MISMATCH-001',
    action_type: 'write_file_exact',
    target_file: mismatchRel,
    sandbox_boundary: 'factory-staging/test-fixtures/**',
    exact_inputs: { exact_content: 'BAD_SHA_PROOF' },
    exact_output_contract: { type: 'byte_exact_copy', sha256: '0'.repeat(64) },
  },
});

if (mismatch.httpStatus !== 409 || mismatch.body?.status !== 'FAILED_VERIFICATION') {
  console.error('FAIL sha mismatch did not fail verification', mismatch);
  if (fs.existsSync(mismatchPath)) fs.unlinkSync(mismatchPath);
  process.exit(1);
}

if (fs.existsSync(mismatchPath)) {
  console.error('FAIL sha mismatch wrote target before verification');
  fs.unlinkSync(mismatchPath);
  process.exit(1);
}

console.log('PASS execute-step integration');
console.log(`  wrote ${targetRel}`);
console.log(`  sha256=${body.builder.sha256.slice(0, 16)}…`);
console.log('  blocked traversal target outside sandbox');
console.log('  blocked byte-exact sha mismatch before write');
