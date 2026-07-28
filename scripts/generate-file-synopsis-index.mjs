#!/usr/bin/env node
/**
 * SYNOPSIS: Build/update REPO_FILE_SYNOPSIS_INDEX.json for all git-tracked indexable files.
 * @ssot docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  buildIndexEntry,
  INDEX_REL,
  isIndexable,
  shouldSkipIndex,
} from './lib/file-synopsis.mjs';
import { gitUnstagedPaths, resolveCommittedFile } from './lib/git-content.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, INDEX_REL);
const MAX_BYTES = 750_000;

function gitLsFiles() {
  return execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
}

function loadExisting() {
  if (!fs.existsSync(OUT)) return { files: [] };
  try {
    return JSON.parse(fs.readFileSync(OUT, 'utf8'));
  } catch {
    return { files: [] };
  }
}

/**
 * Keep the prior row when nothing content-derived changed, so a 2-file edit produces
 * a 2-row diff instead of rewriting `indexed_at` on all ~12k rows. The churn version
 * made every concurrent branch conflict on this file and the diff unreviewable.
 * `mtime` is excluded from the comparison because git rewrites it on every checkout.
 */
function stableEntry(prev, next) {
  if (!prev) return next;
  const meaningful = (e) => JSON.stringify({
    synopsis: e.synopsis,
    bytes: e.bytes,
    ssot: e.ssot || null,
    synopsis_index_only: e.synopsis_index_only || false,
  });
  return meaningful(prev) === meaningful(next) ? prev : next;
}

function main() {
  const incremental = process.argv.includes('--incremental');
  const stagedOnly = process.argv.includes('--staged');
  const indexedAt = new Date().toISOString();

  let targets;
  if (stagedOnly) {
    targets = execSync('git diff --cached --name-only --diff-filter=ACM', {
      cwd: ROOT,
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .filter(Boolean);
  } else if (incremental) {
    targets = gitLsFiles();
  } else {
    targets = gitLsFiles();
  }

  targets = targets.filter((rel) => !shouldSkipIndex(rel) && isIndexable(rel));

  const prior = loadExisting();
  const byPath = new Map((prior.files || []).map((e) => [e.path, e]));

  let updated = 0;
  let skippedLarge = 0;

  // Record the bytes a commit would contain, not dirty-worktree bytes. Indexing an
  // uncommitted local edit writes a number CI can never reproduce, which turns the
  // File Synopsis Law red on push for a file this commit does not even touch.
  const unstaged = gitUnstagedPaths(ROOT);

  for (const rel of targets) {
    const resolved = resolveCommittedFile(ROOT, rel, unstaged, { maxBytes: MAX_BYTES });
    if (!resolved) {
      if (!fs.existsSync(path.join(ROOT, rel))) byPath.delete(rel);
      continue;
    }

    const stat = { size: resolved.size, mtime: resolved.mtime };

    const prior = byPath.get(rel);

    if (resolved.content === null) {
      byPath.set(rel, stableEntry(prior, {
        path: rel,
        synopsis: 'FILE_TOO_LARGE_FOR_AUTO_SYNOPSIS',
        bytes: stat.size,
        mtime: stat.mtime.toISOString(),
        indexed_at: indexedAt,
      }));
      skippedLarge += 1;
      continue;
    }

    const next = stableEntry(prior, buildIndexEntry(rel, resolved.content, stat, indexedAt));
    if (next !== prior) updated += 1;
    byPath.set(rel, next);
  }

  const files = [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));

  // Catastrophic-shrink guard: a partial checkout (e.g. the prod builder's
  // container, where `git ls-files` lists tracked paths but the files aren't on
  // disk) would delete most entries and silently wipe the index. Refuse to
  // write a drastically smaller index unless explicitly allowed.
  const priorCount = (prior.files || []).length;
  if (
    !stagedOnly
    && priorCount >= 100
    && files.length < priorCount * 0.5
    && process.env.ALLOW_INDEX_SHRINK !== '1'
  ) {
    console.error(
      `❌ Synopsis index refused: would shrink from ${priorCount} to ${files.length} entries `
      + `(likely a partial checkout). Set ALLOW_INDEX_SHRINK=1 to override.`,
    );
    process.exit(1);
  }

  const payload = {
    schema: 'repo_file_synopsis_index_v1',
    generated_at: indexedAt,
    law: 'Every git-tracked file indexed here. In-file SYNOPSIS enforced on commit for .js/.mjs/.html/.sql/.md/.css/.sh — JSON index-only.',
    file_count: files.length,
    files,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(`✅ REPO_FILE_SYNOPSIS_INDEX.json — ${files.length} entries (${updated} updated this run)`);
  if (skippedLarge) console.log(`   ${skippedLarge} large file(s) marked FILE_TOO_LARGE_FOR_AUTO_SYNOPSIS`);
}

main();
