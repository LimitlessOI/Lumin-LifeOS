#!/usr/bin/env node
/**
 * SYNOPSIS: HARD verify — every tracked file has synopsis + index row; blocks commit/push/CI on drift.
 * @ssot docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  INDEX_REL,
  buildIndexEntry,
  hasSynopsis,
  isIndexable,
  isInFileEnforceable,
  shouldSkipIndex,
} from './lib/file-synopsis.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INDEX_ABS = path.join(ROOT, INDEX_REL);

function gitLines(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function loadIndexMap() {
  if (!fs.existsSync(INDEX_ABS)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(INDEX_ABS, 'utf8'));
    return new Map((data.files || []).map((e) => [e.path, e]));
  } catch {
    return null;
  }
}

function mtimeMatches(entry, stat) {
  if (!entry?.mtime) return false;
  const a = new Date(entry.mtime).getTime();
  const b = stat.mtimeMs;
  return Math.abs(a - b) <= 2500;
}

function skipMtimeCheck(rel) {
  return (
    /^data\/.*-last-run\.json$/.test(rel)
    || rel === 'docs/AGENT_RULES.compact.md'
    || /^builderos-reboot\/MISSIONS\/[^/]+\/(?:receipts\/|CONTENT\/)/.test(rel)
    || /^builderos-reboot\/MISSIONS\/[^/]+\/[A-Z_]+\.json$/.test(rel)
  );
}

function verifyFile(rel, { indexMap, failures, contentOverride, strict = false }) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return;

  let content = contentOverride;
  let stat;
  try {
    stat = fs.statSync(abs);
    if (!content) content = fs.readFileSync(abs, 'utf8');
  } catch {
    failures.push({ id: 'SYNOPSIS_READ_FAIL', detail: rel });
    return;
  }

  const ext = path.extname(rel).toLowerCase();

  if (isInFileEnforceable(rel) && !hasSynopsis(content, ext)) {
    failures.push({ id: 'SYNOPSIS_MISSING', detail: `${rel} — no in-file SYNOPSIS header` });
  }

  const entry = indexMap?.get(rel);
  if (!entry) {
    failures.push({ id: 'INDEX_MISSING', detail: `${rel} — not in ${INDEX_REL}` });
    return;
  }

  if (!entry.synopsis || entry.synopsis === '(file — no header synopsis)') {
    failures.push({ id: 'INDEX_SYNOPSIS_EMPTY', detail: `${rel} — index row has no synopsis` });
  }

  if (stat.size <= 750_000 && !skipMtimeCheck(rel)) {
    // Freshness signal. Local (staged/push) checks use mtime — reliable against a working tree
    // you just edited. Strict/CI integrity uses `bytes` because git checkouts do NOT preserve
    // mtimes (every file gets the checkout timestamp), making mtime equality impossible in CI.
    // File size is content-derived and survives checkout, and the index co-commit gates already
    // force index regeneration whenever an indexable file changes.
    if (strict) {
      if (typeof entry.bytes === 'number' && entry.bytes !== stat.size) {
        failures.push({
          id: 'INDEX_STALE',
          detail: `${rel} — index bytes ${entry.bytes} ≠ disk ${stat.size}. Run: npm run lifeos:file-synopsis:index`,
        });
      }
    } else if (!mtimeMatches(entry, stat)) {
      failures.push({
        id: 'INDEX_STALE',
        detail: `${rel} — index mtime ${entry.mtime} ≠ disk ${stat.mtime.toISOString()}. Run: npm run lifeos:file-synopsis:index`,
      });
    }
  }
}

function verifyStagedCoCommit(staged, failures) {
  const indexableStaged = staged.filter((f) => !shouldSkipIndex(f) && isIndexable(f));
  const nonIndexOnly = indexableStaged.filter((f) => f !== INDEX_REL);
  if (!nonIndexOnly.length) return;

  if (!staged.includes(INDEX_REL)) {
    failures.push({
      id: 'INDEX_NOT_STAGED',
      detail: `Staged indexable files without ${INDEX_REL}. Pre-commit should auto-stage index — retry commit without --no-verify.`,
    });
  }
}

function verifyPushIndexCoCommit(range, failures) {
  const changed = gitLines(`git diff --name-only ${range}`);
  const indexableChanged = changed.filter((f) => !shouldSkipIndex(f) && isIndexable(f) && f !== INDEX_REL);
  if (!indexableChanged.length) return;

  const indexChanged = changed.includes(INDEX_REL);
  if (!indexChanged) {
    failures.push({
      id: 'INDEX_NOT_IN_PUSH',
      detail: `Push modifies ${indexableChanged.length} indexable file(s) but not ${INDEX_REL}. Run npm run lifeos:file-synopsis:index and commit.`,
    });
  }
}

function verifyHooksPath(failures) {
  if (process.env.CI || process.env.RAILWAY_ENVIRONMENT) return;
  try {
    const hooksPath = execSync('git config --local core.hooksPath', { cwd: ROOT, encoding: 'utf8' }).trim();
    if (hooksPath !== 'githooks') {
      failures.push({
        id: 'HOOKS_PATH_WRONG',
        detail: `core.hooksPath is "${hooksPath || '(unset)'}" — run: npm run hooks:install`,
      });
    }
  } catch {
    failures.push({
      id: 'HOOKS_PATH_UNSET',
      detail: 'core.hooksPath not set — run: npm run hooks:install',
    });
  }
}

function verifyIndexIntegrity(indexMap, failures) {
  if (!indexMap) {
    failures.push({ id: 'INDEX_FILE_MISSING', detail: `${INDEX_REL} does not exist` });
    return;
  }

  const tracked = gitLines('git ls-files').filter((f) => !shouldSkipIndex(f) && isIndexable(f));
  for (const rel of tracked) {
    verifyFile(rel, { indexMap, failures, strict: true });
  }
}

function verifyScopeFiles(files, failures) {
  const indexMap = loadIndexMap();
  if (!indexMap) {
    failures.push({ id: 'INDEX_FILE_MISSING', detail: `${INDEX_REL} does not exist` });
    return;
  }
  for (const rel of files) {
    if (shouldSkipIndex(rel) || !isIndexable(rel)) continue;
    verifyFile(rel, { indexMap, failures });
  }
}

function main() {
  const args = process.argv.slice(2);
  const staged = args.includes('--staged');
  const strict = args.includes('--strict') || args.includes('--all');
  const rangeIdx = args.indexOf('--push-range');
  const pushRange = rangeIdx >= 0 ? args[rangeIdx + 1] : null;
  const checkHooks = args.includes('--check-hooks');

  const failures = [];

  if (checkHooks || (!staged && !pushRange && !strict)) {
    verifyHooksPath(failures);
  }

  if (staged) {
    const stagedFiles = gitLines('git diff --cached --name-only --diff-filter=ACM');
    verifyStagedCoCommit(stagedFiles, failures);
    verifyScopeFiles(stagedFiles, failures);
  } else if (pushRange) {
    const changed = gitLines(`git diff --name-only ${pushRange}`);
    verifyPushIndexCoCommit(pushRange, failures);
    verifyScopeFiles(changed, failures);
  } else if (strict) {
    verifyIndexIntegrity(loadIndexMap(), failures);
  } else {
    console.error('Usage: verify-file-synopsis.mjs [--staged | --strict | --push-range A..B] [--check-hooks]');
    process.exit(2);
  }

  if (failures.length) {
    console.error(`\n❌ FILE SYNOPSIS LAW: FAIL (${failures.length} violation(s))\n`);
    for (const f of failures.slice(0, 40)) {
      console.error(`  [${f.id}] ${f.detail}`);
    }
    if (failures.length > 40) console.error(`  … and ${failures.length - 40} more`);
    console.error(`\nLaw: builderos-reboot/governance/FILE_SYNOPSIS_LAW.json`);
    console.error(`Fix: npm run lifeos:file-synopsis:enforce && npm run lifeos:file-synopsis:index\n`);
    process.exit(1);
  }

  console.log('✅ FILE SYNOPSIS LAW: PASS');
}

main();
