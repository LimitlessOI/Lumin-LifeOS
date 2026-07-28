/**
 * SYNOPSIS: Proves governance gates read committed bytes, not dirty worktree bytes.
 * @ssot docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

import { gitUnstagedPaths, readGitIndexContent, resolveCommittedFile } from '../scripts/lib/git-content.mjs';

let repo;

function git(...args) {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
}

function write(rel, content) {
  fs.writeFileSync(path.join(repo, rel), content, 'utf8');
}

before(() => {
  repo = fs.mkdtempSync(path.join(os.tmpdir(), 'git-content-test-'));
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  write('clean.md', 'committed clean\n');
  write('dirty.md', 'committed dirty original\n');
  write('staged.md', 'committed staged original\n');
  git('add', '-A');
  git('commit', '-qm', 'initial');
});

after(() => {
  if (repo) fs.rmSync(repo, { recursive: true, force: true });
});

test('clean file resolves to its committed bytes', () => {
  const r = resolveCommittedFile(repo, 'clean.md', gitUnstagedPaths(repo));
  assert.equal(r.content, 'committed clean\n');
  assert.equal(r.size, Buffer.byteLength('committed clean\n'));
});

test('UNSTAGED edit resolves to COMMITTED bytes, not the dirty worktree', () => {
  // This is the exact regression that made File Synopsis Law pass locally and fail
  // in CI: the indexer recorded these dirty bytes for a file it never committed.
  const dirty = 'a much longer local edit that was never committed at all\n';
  write('dirty.md', dirty);

  const unstaged = gitUnstagedPaths(repo);
  assert.ok(unstaged.has('dirty.md'), 'unstaged edit must be detected');

  const r = resolveCommittedFile(repo, 'dirty.md', unstaged);
  assert.equal(r.source, 'git-index');
  assert.equal(r.content, 'committed dirty original\n');
  assert.equal(r.size, Buffer.byteLength('committed dirty original\n'));
  assert.notEqual(r.size, Buffer.byteLength(dirty), 'must NOT report dirty worktree size');
});

test('STAGED edit resolves to the staged bytes (what the commit will contain)', () => {
  const staged = 'staged replacement content\n';
  write('staged.md', staged);
  git('add', 'staged.md');

  const r = resolveCommittedFile(repo, 'staged.md', gitUnstagedPaths(repo));
  assert.equal(r.content, staged);
  assert.equal(r.size, Buffer.byteLength(staged));
});

test('untracked file falls back to worktree so new files can be indexed', () => {
  write('brand-new.md', 'new file\n');
  const r = resolveCommittedFile(repo, 'brand-new.md', gitUnstagedPaths(repo));
  assert.equal(r.source, 'worktree');
  assert.equal(r.content, 'new file\n');
});

test('missing path resolves to null rather than throwing', () => {
  assert.equal(resolveCommittedFile(repo, 'does-not-exist.md', new Set()), null);
});

test('oversize committed content reports size but withholds content', () => {
  const big = `${'x'.repeat(5000)}\n`;
  write('big.md', big);
  git('add', 'big.md');
  git('commit', '-qm', 'big');
  write('big.md', `${'y'.repeat(9000)}\n`);

  const r = resolveCommittedFile(repo, 'big.md', gitUnstagedPaths(repo), { maxBytes: 1000 });
  assert.equal(r.content, null, 'oversize content must not be loaded for synopsis extraction');
  assert.equal(r.size, Buffer.byteLength(big), 'size must still come from committed bytes');
});

test('readGitIndexContent returns null for an unknown path instead of throwing', () => {
  assert.equal(readGitIndexContent(repo, 'nope.md'), null);
});

test('worktree deletion still resolves to committed content', () => {
  fs.rmSync(path.join(repo, 'clean.md'));
  const r = resolveCommittedFile(repo, 'clean.md', gitUnstagedPaths(repo));
  assert.equal(r.content, 'committed clean\n', 'a locally deleted tracked file is still committed content');
});
