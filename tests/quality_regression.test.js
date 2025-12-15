import assert from 'assert';
import fs from 'fs/promises';
import { runQualityRegression } from '../audit/quality/regression_runner.js';

async function fileExists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const { jsonPath, mdPath, report } = await runQualityRegression();

  assert.ok(await fileExists(jsonPath), 'JSON report should exist');
  assert.ok(await fileExists(mdPath), 'Markdown report should exist');

  assert.ok(report?.summary);
  assert.strictEqual(typeof report.summary.total, 'number');
  assert.strictEqual(typeof report.summary.passed, 'number');
  assert.strictEqual(typeof report.summary.pass, 'boolean');
  assert.ok(Array.isArray(report.tasks));
  assert.ok(report.tasks.length > 0);

  const first = report.tasks[0];
  assert.strictEqual(typeof first.id, 'string');
  assert.strictEqual(typeof first.score, 'number');
  assert.strictEqual(typeof first.pass, 'boolean');
  assert.ok(Array.isArray(first.expected_keywords));

  console.log('✅ quality_regression.test.js passed');
  console.log('Artifacts:', { jsonPath, mdPath });
}

main().catch((err) => {
  console.error('❌ quality_regression.test.js failed:', err);
  process.exit(1);
});
