#!/usr/bin/env node
/**
 * Regression checks for factory execute-step sandbox containment.
 * @ssot docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRootFromScriptMeta } from './factory-repo-layout.mjs';

const REPO_ROOT = repoRootFromScriptMeta(import.meta.url);
process.chdir(REPO_ROOT);

const { dispatchExecuteStep, pathMatchesSandbox, resolveRepoPath } = await import(
  path.join(REPO_ROOT, 'factory-staging/factory-core/builder/run-step.js')
);

function assert(condition, message, details = {}) {
  if (condition) return;
  console.error('FAIL sandbox security:', message, details);
  process.exit(1);
}

const traversalTarget = 'factory-staging/../server.js';
assert(
  pathMatchesSandbox(traversalTarget, 'factory-staging/**') === false,
  'path traversal target matched factory-staging sandbox',
);

const serverPath = resolveRepoPath('server.js');
const beforeServer = fs.readFileSync(serverPath, 'utf8');
const traversalResult = dispatchExecuteStep({
  mission_id: 'FACTORY-SANDBOX-SECURITY',
  blueprint_id: 'sandbox-regression',
  skip_intake_gate: true,
  step: {
    step_id: 'SANDBOX-TRAVERSAL-001',
    action_type: 'write_file_exact',
    target_file: traversalTarget,
    sandbox_boundary: 'factory-staging/**',
    exact_inputs: { exact_content: 'should-not-overwrite-server' },
  },
});

assert(
  traversalResult.httpStatus === 422 && traversalResult.body?.gap_type === 'authority_violation',
  'traversal dispatch was not blocked as an authority violation',
  traversalResult,
);
assert(fs.readFileSync(serverPath, 'utf8') === beforeServer, 'server.js changed during traversal test');

const sourceEscapeTarget = 'factory-staging/test-fixtures/source-escape-output.txt';
const sourceEscapePath = resolveRepoPath(sourceEscapeTarget);
if (fs.existsSync(sourceEscapePath)) fs.unlinkSync(sourceEscapePath);

const sourceEscapeResult = dispatchExecuteStep({
  mission_id: 'FACTORY-SANDBOX-SECURITY',
  blueprint_id: 'sandbox-regression',
  skip_intake_gate: true,
  step: {
    step_id: 'SANDBOX-SOURCE-ESCAPE-001',
    action_type: 'write_file_exact',
    target_file: sourceEscapeTarget,
    sandbox_boundary: 'factory-staging/**',
    exact_inputs: { content_source_path: '../package.json' },
  },
});

assert(
  sourceEscapeResult.httpStatus === 422 && sourceEscapeResult.body?.gap_type === 'authority_violation',
  'source path escape was not blocked as an authority violation',
  sourceEscapeResult,
);
assert(!fs.existsSync(sourceEscapePath), 'source escape test wrote target file');

console.log('PASS factory sandbox security');
