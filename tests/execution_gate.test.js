import assert from 'assert';
import { evaluateExecutionGate } from '../audit/gating/execution_gate.js';

const baseReport = {
  id: 'fsar_123',
  timestamp: new Date().toISOString(),
  proposal: 'Test proposal',
  severity: 10,
  risks: ['r1'],
  mitigations: ['m1'],
  block_execution: false,
};

function runAllow() {
  const report = { ...baseReport, severity: 10, block_execution: false };
  const res = evaluateExecutionGate({ ...report, severity: 5 });
  assert.strictEqual(res.allow, true);
  assert.strictEqual(res.requires_human_review, false);
}

function runReview() {
  const report = { ...baseReport, severity: 30, block_execution: false };
  const res = evaluateExecutionGate(report);
  assert.strictEqual(res.allow, true);
  assert.strictEqual(res.requires_human_review, true);
}

function runBlockBySeverity() {
  const report = { ...baseReport, severity: 50, block_execution: false };
  const res = evaluateExecutionGate(report);
  assert.strictEqual(res.allow, false);
  assert.strictEqual(res.requires_human_review, true);
}

function runBlockByFlag() {
  const report = { ...baseReport, severity: 10, block_execution: true };
  const res = evaluateExecutionGate(report);
  assert.strictEqual(res.allow, false);
  assert.strictEqual(res.requires_human_review, true);
}

async function main() {
  runAllow();
  runReview();
  runBlockBySeverity();
  runBlockByFlag();
  console.log('✅ execution_gate.test.js passed');
}

main().catch((err) => {
  console.error('❌ execution_gate.test.js failed:', err);
  process.exit(1);
});
