import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import { runFSAR } from '../audit/fsar/fsar_runner.js';

async function fileExists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function runTest() {
  const sampleProposal = 'Test proposal: migrate execution queue to new safety gate.';
  const { jsonPath, mdPath, report } = await runFSAR(sampleProposal);

  // Files exist
  assert.ok(await fileExists(jsonPath), 'JSON report should exist');
  assert.ok(await fileExists(mdPath), 'Markdown report should exist');

  // JSON shape
  assert.strictEqual(typeof report.id, 'string');
  assert.strictEqual(typeof report.timestamp, 'string');
  assert.strictEqual(typeof report.proposal, 'string');
  assert.strictEqual(report.proposal, sampleProposal);
  assert.strictEqual(typeof report.severity, 'number');
  assert.ok(report.severity >= 0 && report.severity <= 10, 'severity within 0-10');
  assert.ok(Array.isArray(report.risks), 'risks is array');
  assert.ok(Array.isArray(report.mitigations), 'mitigations is array');
  assert.strictEqual(typeof report.block_execution, 'boolean');

  console.log('✅ fsar_artifact.test.js passed');
  console.log('Artifacts:', { jsonPath, mdPath });
}

runTest().catch((err) => {
  console.error('❌ fsar_artifact.test.js failed:', err);
  process.exit(1);
});
