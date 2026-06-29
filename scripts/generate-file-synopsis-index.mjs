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

  for (const rel of targets) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      byPath.delete(rel);
      continue;
    }

    let stat;
    try {
      stat = fs.statSync(abs);
    } catch {
      continue;
    }

    if (stat.size > MAX_BYTES) {
      byPath.set(rel, {
        path: rel,
        synopsis: 'FILE_TOO_LARGE_FOR_AUTO_SYNOPSIS',
        bytes: stat.size,
        mtime: stat.mtime.toISOString(),
        indexed_at: indexedAt,
      });
      skippedLarge += 1;
      updated += 1;
      continue;
    }

    let content = '';
    try {
      content = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }

    byPath.set(rel, buildIndexEntry(rel, content, stat, indexedAt));
    updated += 1;
  }

  const files = [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));

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
