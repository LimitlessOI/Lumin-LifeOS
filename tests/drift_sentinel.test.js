import assert from 'assert';
import fs from 'fs/promises';
import { runDriftCheck } from '../audit/drift/drift_sentinel.js';

async function fileExists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const payload = {
    messages: ['hello world', 'hello world', 'hello world'],
    votes: [{ spread: 0.1 }, { spread: 0.05 }],
    responses: [{ certainty: 0.8 }, { certainty: 0.75 }],
  };

  const { jsonPath, mdPath, report } = await runDriftCheck(payload);

  assert.ok(await fileExists(jsonPath), 'JSON report should exist');
  assert.ok(await fileExists(mdPath), 'Markdown report should exist');

  assert.strictEqual(typeof report.id, 'string');
  assert.strictEqual(typeof report.severity, 'number');
  assert.ok(report.severity >= 0 && report.severity <= 100);
  assert.ok(report.signals);
  assert.strictEqual(typeof report.signals.repeated_phrasing, 'number');
  assert.strictEqual(typeof report.signals.declining_disagreement, 'number');
  assert.strictEqual(typeof report.signals.rising_certainty, 'number');
  assert.ok(Array.isArray(report.recommendations));

  console.log('✅ drift_sentinel.test.js passed');
  console.log('Artifacts:', { jsonPath, mdPath });
}

main().catch((err) => {
  console.error('❌ drift_sentinel.test.js failed:', err);
  process.exit(1);
});
