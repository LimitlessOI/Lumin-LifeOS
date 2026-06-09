import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyStepResult } from './verify-step-result.js';

const HISTORIAN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export function runVerification(step, builderResult) {
  const report = verifyStepResult(step, builderResult);
  if (builderResult.status === 'DONE') {
    return {
      ...report,
      implementation_status: 'PASS',
      checks_run: ['result_status', 'exact_output_contract'],
    };
  }
  if (builderResult.status === 'FAILED_VERIFICATION') {
    return {
      ...report,
      implementation_status: 'FAIL',
      reason: builderResult.summary,
    };
  }
  return {
    ...report,
    implementation_status: 'BLOCKED',
    reason: builderResult.summary || builderResult.gap_type,
  };
}

export function appendStepReceipt(entry) {
  const dataDir = path.join(HISTORIAN_DIR, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const line = `${JSON.stringify({ ...entry, recorded_at: new Date().toISOString() })}\n`;
  fs.appendFileSync(path.join(dataDir, 'step-receipts.jsonl'), line, 'utf8');
  return { path: 'factory-staging/data/step-receipts.jsonl' };
}
