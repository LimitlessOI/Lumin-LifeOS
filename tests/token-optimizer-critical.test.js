/**
 * SYNOPSIS: tests/token-optimizer-critical.test.js
 * Regression: token-optimizer `compress()` must preserve source byte-exact for
 * critical (code) prompts. The lossy whitespace/markdown layers corrupted injected
 * source — blank lines collapsed and `*` stripped as markdown emphasis — which
 * broke BuilderOS surgical edit-patch `old_string` anchors (kinks #17/#18).
 * @ssot docs/products/ai-council/PRODUCT_HOME.md
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compress } from '../services/token-optimizer.js';

const SOURCE = [
  "import { createHouseholdSync } from '../services/household-sync.js';",
  '',
  "const ACCESS_COOKIE_NAME = 'lifeos_access_token';",
  'const ACCESS_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;',
  '',
  'function publicWebOrigin(req) {',
  '  return req.headers.host;',
  '}',
].join('\n');

test('compress(critical:true) preserves blank lines byte-exact', () => {
  const { text } = compress(SOURCE, { critical: true });
  assert.ok(text.includes("household-sync.js';\n\nconst ACCESS_COOKIE_NAME"),
    'blank line between import and const must survive');
});

test('compress(critical:true) preserves arithmetic asterisks', () => {
  const { text } = compress(SOURCE, { critical: true });
  assert.ok(text.includes('24 * 60 * 60 * 1000'),
    'asterisks must not be stripped as markdown emphasis');
});

test('compress(critical:true) preserves leading indentation', () => {
  const { text } = compress(SOURCE, { critical: true });
  assert.ok(text.includes('\n  return req.headers.host;'),
    'two-space indentation must survive');
});

test('compress(critical:true) is byte-exact except CRLF normalization', () => {
  const { text } = compress(SOURCE, { critical: true });
  assert.equal(text, SOURCE, 'LF source must pass through unchanged');
  // CRLF should normalize to LF but change nothing else.
  const crlf = SOURCE.replace(/\n/g, '\r\n');
  assert.equal(compress(crlf, { critical: true }).text, SOURCE);
});

test('compress(non-critical) still collapses blank lines (compression active)', () => {
  const { text } = compress(SOURCE, { critical: false, stripMd: true, phraseSub: true });
  assert.ok(!text.includes('\n\n'), 'non-critical path should still collapse blank lines');
});
