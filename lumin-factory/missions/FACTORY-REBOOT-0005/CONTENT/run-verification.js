import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyStepResult } from './verify-step-result.js';
import { verifyStepContract } from './verify-step-contract.js';

const HISTORIAN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export function runVerification(step, builderResult, context = {}) {
  const report = verifyStepResult(step, builderResult);
  const contract = context.mission_id
    ? verifyStepContract({ mission_id: context.mission_id, step, builderResult })
    : { pass: builderResult.status === 'DONE', tests_run: 0, failures: [] };

  if (builderResult.status === 'DONE' && contract.pass) {
    return {
      ...report,
      implementation_status: 'PASS',
      checks_run: ['result_status', 'exact_output_contract', 'acceptance_tests'],
      acceptance: contract,
    };
  }
  if (builderResult.status === 'FAILED_VERIFICATION') {
    return {
      ...report,
      implementation_status: 'FAIL',
      reason: builderResult.summary,
      acceptance: contract,
    };
  }
  return {
    ...report,
    implementation_status: contract.pass ? 'PASS' : 'FAIL',
    reason: contract.failures?.[0]?.reason || builderResult.summary,
    acceptance: contract,
  };
}

export function appendStepReceipt(entry) {
  const dataDir = path.join(HISTORIAN_DIR, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const line = `${JSON.stringify({ ...entry, recorded_at: new Date().toISOString() })}\n`;
  fs.appendFileSync(path.join(dataDir, 'step-receipts.jsonl'), line, 'utf8');
  return { path: 'factory-staging/data/step-receipts.jsonl' };
}
