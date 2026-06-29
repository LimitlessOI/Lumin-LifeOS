/**
 * SYNOPSIS: Regression tests for groq import-merge antipattern detection (PATTERN 9).
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 * Regression tests for groq import-merge antipattern detection (PATTERN 9).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const SCANNER = join(ROOT, 'scripts', 'builderos-groq-antipattern-scan.mjs');

function scan(content) {
  const path = join(tmpdir(), `import-merge-test-${Date.now()}.mjs`);
  writeFileSync(path, content, 'utf8');
  try {
    const run = spawnSync('node', [SCANNER, path], { encoding: 'utf8' });
    return JSON.parse(run.stdout || '{}');
  } finally {
    unlinkSync(path);
  }
}

test('PATTERN 9 catches pathimport merge', () => {
  const result = scan("pathimport 'path';\nexport const x = 1;\n".padEnd(400, '\n'));
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((f) => f.pattern === 'IMPORT_MERGE_BUG'));
});

test('PATTERN 9 catches urlimport merge', () => {
  const result = scan("urlimport 'url';\nexport const x = 1;\n".padEnd(400, '\n'));
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((f) => f.pattern === 'IMPORT_MERGE_BUG'));
});

test('PATTERN 8 catches json fence in JS', () => {
  const result = scan("const x = 1;\n```json\n{}\n```\nexport default x;\n".padEnd(400, '\n'));
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((f) => f.pattern === 'MARKDOWN_FENCE_IN_JS'));
});

test('valid separate imports pass PATTERN 9', () => {
  const result = scan([
    "import { join } from 'path';",
    "import { fileURLToPath } from 'url';",
    'export function ok() { return join("a", "b"); }',
    '',
  ].join('\n').padEnd(400, '\n'));
  assert.ok(!result.findings.some((f) => f.pattern === 'IMPORT_MERGE_BUG'));
});
