/**
 * SYNOPSIS: Unit tests for the Zone 3 surgical edit-patch primitives that let
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 * BuilderOS MODIFY existing in-file logic in a large file (not just add to it):
 * classifyPatchIntent (services/builderos-patch-mode-policy.js) plus
 * parseTargetedEditsJson + applyTargetedEdits (routes/lifeos-council-builder-routes.js).
 * An edit is applied only when its old_string matches EXACTLY ONCE — a missing
 * or ambiguous anchor is rejected (fail-closed) so the rest of the file is
 * preserved byte-for-byte. No network / credentials required.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { classifyPatchIntent } from '../services/builderos-patch-mode-policy.js';
import {
  parseTargetedEditsJson,
  applyTargetedEdits,
} from '../routes/lifeos-council-builder-routes.js';

function tmpFile(contents) {
  const dir = mkdtempSync(join(tmpdir(), 'editpatch-'));
  const p = join(dir, 'target.js');
  writeFileSync(p, contents, 'utf8');
  return p;
}

test('classifyPatchIntent — modify verbs route to edit', () => {
  assert.equal(classifyPatchIntent('change the ACCESS_COOKIE_MAX_AGE_MS to 7 days'), 'edit');
  assert.equal(classifyPatchIntent('update the timeout so it lasts longer'), 'edit');
  assert.equal(classifyPatchIntent('rename the helper foo to bar'), 'edit');
  assert.equal(classifyPatchIntent('remove the deprecated fallback branch'), 'edit');
  assert.equal(classifyPatchIntent('replace the regex with a stricter one'), 'edit');
  assert.equal(classifyPatchIntent('fix the off-by-one in the loop'), 'edit');
});

test('classifyPatchIntent — pure additions stay on additive', () => {
  assert.equal(classifyPatchIntent('add a new helper that formats dates'), 'additive');
  assert.equal(classifyPatchIntent('create an exported function for X'), 'additive');
  assert.equal(classifyPatchIntent('introduce a route handler for /status'), 'additive');
  assert.equal(classifyPatchIntent(''), 'additive');
});

test('parseTargetedEditsJson — accepts a bare JSON array', () => {
  const r = parseTargetedEditsJson('[{"old_string":"a","new_string":"b"}]');
  assert.equal(r.ok, true);
  assert.equal(r.edits.length, 1);
});

test('parseTargetedEditsJson — tolerates fences and a trailing METADATA block', () => {
  const raw = '```json\n[{"old_string":"a","new_string":"b"}]\n```\n---METADATA---\n{"confidence":0.9}';
  const r = parseTargetedEditsJson(raw);
  assert.equal(r.ok, true);
  assert.equal(r.edits[0].new_string, 'b');
});

test('parseTargetedEditsJson — rejects non-array / malformed / truncated', () => {
  assert.equal(parseTargetedEditsJson('not json at all').ok, false);
  assert.equal(parseTargetedEditsJson('{"old_string":"a","new_string":"b"}').ok, false);
  assert.equal(parseTargetedEditsJson('[{"old_string":"a"}]').ok, false);
  assert.equal(parseTargetedEditsJson('[{"old_string":"a","new_string":"b"').ok, false);
});

test('applyTargetedEdits — applies a unique single-line modification', () => {
  const p = tmpFile('const A = 1;\nconst B = 2;\nexport default {A, B};\n');
  const r = applyTargetedEdits(p, '[{"old_string":"const A = 1;","new_string":"const A = 42;"}]');
  assert.equal(r.ok, true);
  assert.equal(r.editsApplied, 1);
  assert.match(r.content, /const A = 42;/);
  assert.match(r.content, /const B = 2;/); // rest preserved
});

test('applyTargetedEdits — applies multiple edits sequentially', () => {
  const p = tmpFile('const A = 1;\nconst B = 2;\n');
  const r = applyTargetedEdits(p, JSON.stringify([
    { old_string: 'const A = 1;', new_string: 'const A = 10;' },
    { old_string: 'const B = 2;', new_string: 'const B = 20;' },
  ]));
  assert.equal(r.ok, true);
  assert.equal(r.editsApplied, 2);
  assert.match(r.content, /const A = 10;[\s\S]*const B = 20;/);
});

test('applyTargetedEdits — deletion via empty new_string', () => {
  const p = tmpFile('keep me\nDELETE THIS LINE\nkeep me too\n');
  const r = applyTargetedEdits(p, '[{"old_string":"DELETE THIS LINE\\n","new_string":""}]');
  assert.equal(r.ok, true);
  assert.doesNotMatch(r.content, /DELETE THIS LINE/);
  assert.match(r.content, /keep me\nkeep me too/);
});

test('applyTargetedEdits — rejects an anchor that is not found', () => {
  const p = tmpFile('const A = 1;\n');
  const r = applyTargetedEdits(p, '[{"old_string":"const Z = 9;","new_string":"const Z = 8;"}]');
  assert.equal(r.ok, false);
  assert.match(r.reason, /not found/i);
});

test('applyTargetedEdits — rejects an ambiguous anchor (matches >1)', () => {
  const p = tmpFile('x = 1;\nx = 1;\n');
  const r = applyTargetedEdits(p, '[{"old_string":"x = 1;","new_string":"x = 2;"}]');
  assert.equal(r.ok, false);
  assert.match(r.reason, /ambiguous/i);
});

test('applyTargetedEdits — rejects an empty old_string (cannot anchor)', () => {
  const p = tmpFile('const A = 1;\n');
  const r = applyTargetedEdits(p, '[{"old_string":"","new_string":"const B = 2;"}]');
  assert.equal(r.ok, false);
  assert.match(r.reason, /empty old_string/i);
});

test('applyTargetedEdits — a no-op edit set is rejected', () => {
  const p = tmpFile('const A = 1;\n');
  const r = applyTargetedEdits(p, '[{"old_string":"const A = 1;","new_string":"const A = 1;"}]');
  assert.equal(r.ok, false);
  assert.match(r.reason, /no edits applied/i);
});

test('applyTargetedEdits — does not corrupt the untouched remainder', () => {
  const original = 'line1\nline2\nTARGET\nline4\nline5\n';
  const p = tmpFile(original);
  const r = applyTargetedEdits(p, '[{"old_string":"TARGET","new_string":"CHANGED"}]');
  assert.equal(r.ok, true);
  assert.equal(r.content, 'line1\nline2\nCHANGED\nline4\nline5\n');
  // sanity: on-disk file is unchanged (apply is pure; caller commits result)
  assert.equal(readFileSync(p, 'utf8'), original);
});
