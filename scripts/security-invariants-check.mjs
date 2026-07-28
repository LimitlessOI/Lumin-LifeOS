#!/usr/bin/env node
/**
 * SYNOPSIS: scripts/security-invariants-check.mjs
 * Hard pre-commit gate: a small, explicit list of files that must retain a
 * minimum count of a security-critical substring. Exists because a governed
 * factory dispatch can regenerate large chunks of a file from a stale
 * context and silently drop an auth gate that isn't part of the step's own
 * spec -- confirmed live twice on 2026-07-27 (routes/tc-routes.js lost
 * `requireLifeOSAdmin` on all 121 routes, twice, ~11 minutes apart, each
 * time already deployed live before being caught by hand). This is not a
 * general code-quality check -- it is a small, named, growable list of
 * known-sensitive invariants, checked by exact substring count so it is
 * fast, deterministic, and impossible to game with a differently-worded fix.
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// file (repo-relative) -> { substring, minCount, reason }
const INVARIANTS = [
  {
    file: 'routes/tc-routes.js',
    substring: 'requireLifeOSAdmin',
    minCount: 100,
    reason:
      'TC Service holds real client transaction data with no other tenant-isolation column -- ' +
      'requireLifeOSAdmin is the only thing preventing any authenticated LifeOS user from reading ' +
      'or writing any other client\'s data. Regressed live twice on 2026-07-27.',
  },
];

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let idx = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) {
    count += 1;
    idx += needle.length;
  }
  return count;
}

function getStagedFiles() {
  try {
    const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    return out.split('\n').map((l) => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function main() {
  const staged = new Set(getStagedFiles());
  const failures = [];

  for (const rule of INVARIANTS) {
    if (!staged.has(rule.file)) continue; // only check files actually being committed
    const abs = path.join(ROOT, rule.file);
    if (!existsSync(abs)) continue;
    const content = readFileSync(abs, 'utf8');
    const count = countOccurrences(content, rule.substring);
    if (count < rule.minCount) {
      failures.push({ ...rule, observed: count });
    }
  }

  if (failures.length === 0) {
    console.log('✅ Security invariants (staged files)');
    process.exit(0);
  }

  console.log('');
  console.log('❌ SECURITY INVARIANT VIOLATION — commit blocked.');
  for (const f of failures) {
    console.log(`   ${f.file}: expected >= ${f.minCount} occurrences of "${f.substring}", found ${f.observed}.`);
    console.log(`     Reason this invariant exists: ${f.reason}`);
  }
  console.log('   If this file genuinely needs fewer occurrences (routes removed on purpose),');
  console.log('   update the minCount in scripts/security-invariants-check.mjs deliberately --');
  console.log('   do not bypass this check without lowering the number with a real reason.');
  console.log('');
  process.exit(1);
}

main();
