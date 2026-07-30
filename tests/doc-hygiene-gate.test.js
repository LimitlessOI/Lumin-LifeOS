/**
 * SYNOPSIS: Tests for Q-003 doc-hygiene detect-and-route gate.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDocHygiene } from '../scripts/lib/doc-hygiene-gate.mjs';

test('evaluateDocHygiene routes missing synopsis and ssot', () => {
  const v = evaluateDocHygiene([
    {
      path: 'services/example-thing.js',
      content: 'export function foo() { return 1; }\n',
    },
  ]);
  assert.equal(v.ok, true);
  assert.ok(v.routed.some((f) => f.kind === 'missing_synopsis'));
  assert.ok(v.routed.some((f) => f.kind === 'missing_ssot_tag'));
});

test('evaluateDocHygiene routes ssot not co-committed', () => {
  const v = evaluateDocHygiene([
    {
      path: 'services/example-thing.js',
      content: `/**
 * SYNOPSIS: example
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
export function foo() { return 1; }
`,
    },
  ]);
  assert.equal(v.ok, true);
  assert.ok(v.routed.some((f) => f.kind === 'ssot_not_co_committed'));
  assert.equal(v.routed.filter((f) => f.kind === 'missing_synopsis').length, 0);
});

test('evaluateDocHygiene clean when ssot co-committed', () => {
  const v = evaluateDocHygiene([
    {
      path: 'services/example-thing.js',
      content: `/**
 * SYNOPSIS: example
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
export function foo() { return 1; }
`,
    },
    {
      path: 'docs/products/builderos/PRODUCT_HOME.md',
      content: '# home\n',
    },
  ]);
  assert.equal(v.ok, true);
  assert.equal(v.routed.length, 0);
});

test('evaluateDocHygiene never blocks', () => {
  const v = evaluateDocHygiene([{ path: 'routes/x.js', content: 'x' }]);
  assert.equal(v.ok, true);
});
