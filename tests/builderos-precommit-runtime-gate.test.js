/**
 * SYNOPSIS: Regression — BuilderOS pre-commit runtime gate (Gate 4) must resolve
 * repo dependencies and sanitize the execution env.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { runUnifiedVerifierOnContent } from '../services/builderos-precommit-governance.js';

const cli = (body) => [
  "import pg from 'pg';",
  'async function main() {',
  '  const ttl = Number(process.env.PREVIEW_TTL_DAYS || 30);',
  `  ${body}`,
  '  console.log(JSON.stringify({ mode: "dry_run", scanned: 0, ttl }));',
  '}',
  'main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });',
].join('\n');

test('runtime gate resolves repo deps (pg) for a dependency-importing CLI script', () => {
  const r = runUnifiedVerifierOnContent(cli('void pg;'), null, 'scripts/site-builder-preview-expiry-cron.mjs');
  assert.equal(r.body.gates.runtime, true, r.body.runtime_output);
  assert.equal(r.ok, true);
});

test('runtime gate fails a script that throws at runtime (no false green)', () => {
  const throwing = [
    "import pg from 'pg';",
    'function parsePreviewTtlDays() {',
    '  const raw = process.env.PREVIEW_TTL_DAYS;',
    '  const value = Number(raw);',
    '  if (!Number.isFinite(value) || value < 0) {',
    '    throw new Error("PREVIEW_TTL_DAYS must be a non-negative number");',
    '  }',
    '  return value;',
    '}',
    'async function main() {',
    '  void pg;',
    '  const ttl = parsePreviewTtlDays();',
    '  console.log(JSON.stringify({ mode: "dry_run", ttl }));',
    '}',
    'main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });',
  ].join('\n');
  const r = runUnifiedVerifierOnContent(throwing, null, 'scripts/site-builder-preview-expiry-cron.mjs');
  assert.equal(r.body.gates.runtime, false);
  assert.equal(r.body.first_failure, 'runtime');
  assert.match(r.body.runtime_output, /PREVIEW_TTL_DAYS/);
});

test('runtime gate hides credentials from the executed script', () => {
  process.env.DATABASE_URL = 'postgres://should-not-leak';
  try {
    const leak = [
      'const url = process.env.DATABASE_URL || "ABSENT";',
      'console.log(JSON.stringify({ mode: "dry_run", db: url }));',
      'process.exit(0);',
    ].join('\n');
    const r = runUnifiedVerifierOnContent(leak, null, 'scripts/some-cron.mjs');
    assert.equal(r.body.gates.runtime, true);
    assert.match(r.body.runtime_output, /ABSENT/);
    assert.doesNotMatch(r.body.runtime_output, /should-not-leak/);
  } finally {
    delete process.env.DATABASE_URL;
  }
});
