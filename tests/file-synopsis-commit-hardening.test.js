/**
 * SYNOPSIS: Unit tests for builder commit-path hardening helpers in
 * @ssot docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md
 * scripts/lib/file-synopsis.mjs — stripWrappingCodeFence + computeUpdatedIndex.
 *
 * These make autonomous builder output governance-compliant by construction:
 * markdown fences are stripped before parse, and every committed file carries a
 * fresh, byte-accurate index row so it cannot fail the File Synopsis Law gate.
 * No network / credentials required.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stripWrappingCodeFence,
  computeUpdatedIndex,
  INDEX_REL,
} from '../scripts/lib/file-synopsis.mjs';
import { resolveSynopsisIndexFromRaw } from '../services/deployment-service.js';

test('stripWrappingCodeFence — removes a whole-file ```json fence', () => {
  const fenced = '```json\n{\n  "a": 1\n}\n```';
  const out = stripWrappingCodeFence(fenced, 'services/x/package.json');
  assert.equal(out, '{\n  "a": 1\n}\n');
  assert.doesNotThrow(() => JSON.parse(out));
});

test('stripWrappingCodeFence — removes a bare ``` fence with no language', () => {
  const fenced = '```\nhello\nworld\n```';
  assert.equal(stripWrappingCodeFence(fenced, 'x/notes.txt'), 'hello\nworld\n');
});

test('stripWrappingCodeFence — leaves non-fenced content untouched', () => {
  const raw = '{\n  "a": 1\n}\n';
  assert.equal(stripWrappingCodeFence(raw, 'x/package.json'), raw);
});

test('stripWrappingCodeFence — does NOT strip a fence that is only mid-file', () => {
  const doc = 'intro text\n```js\ncode()\n```\nmore text';
  assert.equal(stripWrappingCodeFence(doc, 'x/thing.txt'), doc);
});

test('stripWrappingCodeFence — never strips .md (markdown legitimately uses fences)', () => {
  const md = '```md\n# Title\n```';
  assert.equal(stripWrappingCodeFence(md, 'docs/x.md'), md);
});

test('computeUpdatedIndex — upserts a byte-accurate row for a committed file', () => {
  const content = 'export const x = 1;\n';
  const idx = computeUpdatedIndex({ files: [] }, [{ path: 'services/x.js', content }]);
  const row = idx.files.find((e) => e.path === 'services/x.js');
  assert.ok(row, 'expected an index row for the committed file');
  assert.equal(row.bytes, Buffer.byteLength(content, 'utf8'));
  assert.equal(idx.schema, 'repo_file_synopsis_index_v1');
  assert.equal(idx.file_count, idx.files.length);
});

test('computeUpdatedIndex — replaces a stale prior row, keeps others', () => {
  const prior = {
    files: [
      { path: 'services/x.js', synopsis: 'old', bytes: 5, mtime: '2020-01-01T00:00:00.000Z', indexed_at: '2020-01-01T00:00:00.000Z' },
      { path: 'services/y.js', synopsis: 'keep', bytes: 9, mtime: '2020-01-01T00:00:00.000Z', indexed_at: '2020-01-01T00:00:00.000Z' },
    ],
  };
  const content = 'export const x = 42;\n';
  const idx = computeUpdatedIndex(prior, [{ path: 'services/x.js', content }]);
  const x = idx.files.find((e) => e.path === 'services/x.js');
  const y = idx.files.find((e) => e.path === 'services/y.js');
  assert.equal(x.bytes, Buffer.byteLength(content, 'utf8'));
  assert.equal(y.bytes, 9, 'untouched rows must be preserved verbatim');
});

test('computeUpdatedIndex — ignores the index file itself and non-indexable paths', () => {
  const idx = computeUpdatedIndex({ files: [] }, [
    { path: INDEX_REL, content: '{}' },
    { path: 'node_modules/foo/index.js', content: 'x' },
    { path: 'x.png', content: 'binary' },
  ]);
  assert.equal(idx.files.length, 0);
});

test('computeUpdatedIndex — output rows are sorted by path', () => {
  const idx = computeUpdatedIndex({ files: [] }, [
    { path: 'services/z.js', content: 'z\n' },
    { path: 'services/a.js', content: 'a\n' },
  ]);
  const paths = idx.files.map((e) => e.path);
  assert.deepEqual(paths, [...paths].sort((a, b) => a.localeCompare(b)));
});

// ── resolveSynopsisIndexFromRaw: the anti-wipe contract ──────────────────────
// Regression guard for the index-wipe bug: the GitHub Contents API returns 200
// with an EMPTY body for files > 1 MB unless the raw media type is used. The old
// code decoded that empty content to "" and returned { files: [] }, so the next
// computeUpdatedIndex rebuilt the ~3.4 MB / 11k-entry index from just the one
// committed file — a full wipe. This must now throw so callers skip the index
// co-commit and leave the existing index intact.

test('resolveSynopsisIndexFromRaw — 404 means the index is legitimately absent', () => {
  assert.deepEqual(resolveSynopsisIndexFromRaw(404, ''), { files: [] });
});

test('resolveSynopsisIndexFromRaw — parses a valid full index verbatim', () => {
  const full = JSON.stringify({ schema: 'repo_file_synopsis_index_v1', files: [{ path: 'services/a.js' }, { path: 'services/b.js' }] });
  const out = resolveSynopsisIndexFromRaw(200, full);
  assert.equal(out.files.length, 2);
});

test('resolveSynopsisIndexFromRaw — THROWS on empty 200 body (the >1MB trap) — never wipes', () => {
  assert.throws(() => resolveSynopsisIndexFromRaw(200, ''), /empty body/);
  assert.throws(() => resolveSynopsisIndexFromRaw(200, '   \n'), /empty body/);
});

test('resolveSynopsisIndexFromRaw — THROWS on unparseable body — never wipes', () => {
  assert.throws(() => resolveSynopsisIndexFromRaw(200, 'not json'), /not valid JSON/);
});

test('resolveSynopsisIndexFromRaw — THROWS on transient non-2xx read failure', () => {
  assert.throws(() => resolveSynopsisIndexFromRaw(502, ''), /HTTP 502/);
});
