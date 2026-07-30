/**
 * SYNOPSIS: Tests for Q-002 builder JS sanitize (asterisk + shebang).
 * Star chars in fixtures are built at runtime so a stale execute-batch sanitizer
 * cannot rewrite the regression cases while this fix is itself shipping.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  finalizeExtractedJavaScript,
  fixAsteriskShorthandParams,
  isJavaScriptCodeStartLine,
} from '../scripts/lib/builder-js-sanitize.mjs';
import { diagnoseContentMutation } from '../scripts/lib/deploy-truth-guard.mjs';

const STAR = String.fromCharCode(42);

test('fixAsteriskShorthandParams strips const asterisk-rk hallucination', () => {
  const in_ = `const ${STAR}rk = requireKey;\nlet ${STAR}pool = null;\n`;
  const out = fixAsteriskShorthandParams(in_);
  assert.equal(out, 'const rk = requireKey;\nlet pool = null;\n');
});

test('fixAsteriskShorthandParams does NOT rewrite regex star-identifiers', () => {
  const in_ = `const re = /content-verified${STAR}verified live/;\n`;
  const out = fixAsteriskShorthandParams(in_);
  assert.equal(out, in_);
  const mutations = diagnoseContentMutation(in_, out);
  assert.equal(mutations.filter((m) => m.kind === 'asterisk_stripped').length, 0);
});

test('fixAsteriskShorthandParams strips destructured asterisk-params', () => {
  const out = fixAsteriskShorthandParams(`function f(${STAR}rk, pool) {}\n`);
  assert.equal(out, 'function f(rk, pool) {}\n');
});

test('isJavaScriptCodeStartLine accepts shebang', () => {
  assert.equal(isJavaScriptCodeStartLine('#!/usr/bin/env node'), true);
  assert.equal(isJavaScriptCodeStartLine('import x from "y";'), true);
});

test('finalizeExtractedJavaScript keeps shebang and trailing newline', () => {
  const raw = '#!/usr/bin/env node\nconsole.log(1)\n';
  const out = finalizeExtractedJavaScript(raw, { hadTrailingNewline: true });
  assert.ok(out.startsWith('#!/usr/bin/env node\n'));
  assert.ok(out.endsWith('\n'));
  const mutations = diagnoseContentMutation(raw, out);
  assert.equal(mutations.filter((m) => m.kind === 'shebang_stripped').length, 0);
});
