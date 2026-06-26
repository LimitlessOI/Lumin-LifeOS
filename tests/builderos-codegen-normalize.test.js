/**
 * SYNOPSIS: Exports and — tests/builderos-codegen-normalize.test.js.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  expandCodebookSymbols,
  normalizeBuilderCodegenOutput,
} from '../services/builderos-codegen-normalize.js';

test('expandCodebookSymbols restores export function and requireKey', () => {
  const raw = '*exp createFoo({ pool, *rk, logger }) {\n  *jok({ ok: true });\n}';
  const out = expandCodebookSymbols(raw);
  assert.match(out, /export function createFoo/);
  assert.match(out, /requireKey/);
  assert.match(out, /res\.json\(\{ ok: true,/);
  assert.ok(!out.includes('*exp'));
  assert.ok(!out.includes('*rk'));
});

test('normalizeBuilderCodegenOutput expands then strips stray asterisk params', () => {
  const raw = '*exp foo(*body) { const x = *rk; }';
  const out = normalizeBuilderCodegenOutput(raw);
  assert.match(out, /export function foo/);
  assert.match(out, /req\.body/);
  assert.match(out, /requireKey/);
});
