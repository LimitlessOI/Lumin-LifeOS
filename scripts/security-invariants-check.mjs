/**
 * SYNOPSIS: scripts/security-invariants-check.mjs
 * Pre-commit CLI for the security-invariant gate. All judgement lives in
 * scripts/lib/security-invariants.mjs so the machine ship path (execute-batch)
 * runs the identical checker instead of a copy that could drift.
 *
 * Reads the STAGED blob rather than the worktree file: a pre-commit gate must
 * judge what is about to be committed, not whatever happens to be on disk.
 *
 * No shebang on purpose — callers invoke it as `node scripts/...` and the
 * execute-batch pipeline strips shebang lines from .mjs payloads, which would
 * otherwise make the committed bytes differ from the local file.
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INVARIANTS, evaluateInvariants, formatFindings } from './lib/security-invariants.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
}

function getStagedFiles() {
  try {
    return git(['diff', '--cached', '--name-only', '--diff-filter=ACM'])
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function stagedContent(file) {
  try {
    return git(['show', `:${file}`]);
  } catch {
    const abs = path.join(ROOT, file);
    return existsSync(abs) ? readFileSync(abs, 'utf8') : null;
  }
}

function main() {
  const staged = new Set(getStagedFiles());
  const proposed = [];

  for (const rule of INVARIANTS) {
    if (!staged.has(rule.file)) continue;
    const content = stagedContent(rule.file);
    if (typeof content === 'string') proposed.push({ path: rule.file, content });
  }

  const result = evaluateInvariants(proposed);

  if (result.routed.length) {
    console.log('');
    console.log('⚠️  Security invariant (detect-and-route) — recorded, not blocking:');
    console.log(formatFindings(result.routed));
  }

  if (result.ok) {
    console.log(`✅ Security invariants (${result.checked.length} protected file(s) in this commit)`);
    process.exit(0);
  }

  console.log('');
  console.log('❌ SECURITY INVARIANT VIOLATION — commit blocked.');
  console.log(formatFindings(result.blocking));
  console.log('');
  process.exit(1);
}

main();
