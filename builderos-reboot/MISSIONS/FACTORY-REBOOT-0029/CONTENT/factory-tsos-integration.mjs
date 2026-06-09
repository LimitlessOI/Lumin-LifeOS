#!/usr/bin/env node
/** Integration: TSOS append on execute-step + guardrail rejection. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(REPO_ROOT);

const metricsPath = path.join(REPO_ROOT, 'factory-staging/data/tsos-step-metrics.jsonl');
const beforeSize = fs.existsSync(metricsPath) ? fs.statSync(metricsPath).size : 0;

const { dispatchExecuteStep, resolveRepoPath } = await import(
  '../../factory-staging/factory-core/builder/run-step.js'
);
const { recordStepMetrics } = await import(
  '../../factory-staging/factory-core/tsos/record-step-metrics.js'
);
const { summarizeTsosMetrics } = await import(
  '../../factory-staging/factory-core/tsos/tsos-summary.js'
);

// Guardrail: forbidden authority field
const blocked = recordStepMetrics({
  step_id: 'GUARDRAIL-TEST',
  verdict: 'STAGING_READY',
  token_cost: 0,
});
if (blocked.ok !== false || blocked.status !== 'TSOS_GUARDRAIL_VIOLATION') {
  console.error('FAIL guardrail did not block verdict field', blocked);
  process.exit(1);
}

const sourceRel = 'builderos-reboot/MISSIONS/FACTORY-REBOOT-0005/CONTENT/proof-source.txt';
const targetRel = 'factory-staging/test-fixtures/tsos-proof-output.txt';
const sourceBytes = fs.readFileSync(resolveRepoPath(sourceRel));
const expectedSha = crypto.createHash('sha256').update(sourceBytes).digest('hex');

const step = {
  step_id: 'TSOS-INTEGRATION-001',
  action_type: 'write_file_exact',
  target_file: targetRel,
  sandbox_boundary: 'factory-staging/**',
  exact_inputs: { content_source_path: sourceRel },
  exact_output_contract: { type: 'byte_exact_copy', sha256: expectedSha },
};

if (fs.existsSync(resolveRepoPath(targetRel))) fs.unlinkSync(resolveRepoPath(targetRel));

const { httpStatus, body } = dispatchExecuteStep({
  mission_id: 'FACTORY-REBOOT-0029',
  blueprint_id: 'tsos-integration',
  step,
  token_cost: 0,
  model_tier: 'integration-test',
});

if (httpStatus !== 200 || !body.tsos?.ok) {
  console.error('FAIL dispatch tsos', httpStatus, body);
  process.exit(1);
}

const afterSize = fs.statSync(metricsPath).size;
if (afterSize <= beforeSize) {
  console.error('FAIL tsos jsonl not appended');
  process.exit(1);
}

const summary = summarizeTsosMetrics();
if (summary.total_records < 1) {
  console.error('FAIL tsos summary empty');
  process.exit(1);
}

console.log('PASS factory TSOS integration');
console.log(`  tsos records=${summary.total_records} latency_ms=${body.tsos.metrics.latency_ms}`);
