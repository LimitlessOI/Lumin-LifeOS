#!/usr/bin/env node
/**
 * SYNOPSIS: Blocks a GAP-FILL commit that claims "no blueprint/mission pack exists"
 * as its justification for hand-authoring server code, when a real
 * docs/products/<product>/BUILD_QUEUE.json already exists and already tracks one of
 * the exact files being staged.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Root cause this closes: commit ac50782319 ("GAP-FILL: Site Builder richer data
 * ingestion pipeline (no BuilderOS mission pack exists for Site Builder;
 * docs/products/site-builder/AGENTS.md states none, so the live product lane was
 * hand-authored...)") hand-authored routes/services directly, citing "no mission
 * pack exists" as the reason the governed factory (SO-001) didn't apply. That claim
 * was false — docs/products/site-builder/BUILD_QUEUE.json existed at that exact
 * commit with 33 steps (21 done, 11 founder_gated, 1 blocked). The prior §2.11 hook
 * only checked that a GAP-FILL commit message existed and was non-vague (>=40
 * chars) — it never checked whether the *justification* was true. This script adds
 * that missing factual check: unfakeable because it reads the real file, not the
 * agent's self-report.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const FALSE_JUSTIFICATION_PATTERNS = [
  /no\s+(builderos\s+)?mission\s+pack\s+exists?/i,
  /no\s+build[_\s]?queue\s+exists?/i,
  /not\s+(tracked|covered)\s+(by|in)\s+(a|the)?\s*blueprint/i,
  /AGENTS\.md\s+states?\s+none/i,
  /no\s+blueprint\s+exists?/i,
];

function readCommitMessage() {
  const file = process.argv[2];
  if (file && fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  return fs.readFileSync(0, 'utf8'); // stdin fallback
}

function listBuildQueues() {
  const productsDir = path.join(ROOT, 'docs/products');
  if (!fs.existsSync(productsDir)) return [];
  const results = [];
  for (const productId of fs.readdirSync(productsDir)) {
    const queuePath = path.join(productsDir, productId, 'BUILD_QUEUE.json');
    if (fs.existsSync(queuePath)) {
      try {
        const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
        results.push({ productId, queuePath: path.relative(ROOT, queuePath), queue });
      } catch { /* malformed queue — not this script's concern */ }
    }
  }
  return results;
}

// Files the pre-commit hook itself auto-generates/touches on every commit —
// never evidence of a real functional change, so they're excluded when
// deciding whether a "[system-build]"/fix claim has any real diff behind it.
export const GENERATED_FILE_PATTERNS = [
  /^builderos-reboot\/governance\/REPO_FILE_SYNOPSIS_INDEX\.json$/,
];

/** Pure — sums real (non-generated) line changes from `git diff --numstat` output. */
export function sumRealChanges(numstatOutput) {
  const statLines = String(numstatOutput || '').split('\n').map((l) => l.trim()).filter(Boolean);
  let realChanges = 0;
  const realFiles = [];
  for (const line of statLines) {
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const [add, del, file] = parts;
    if (GENERATED_FILE_PATTERNS.some((re) => re.test(file))) continue;
    const a = Number(add) || 0;
    const d = Number(del) || 0;
    realChanges += a + d;
    if (a + d > 0) realFiles.push(file);
  }
  return { realChanges, realFiles };
}

/**
 * The precise, real gap the earlier §2.11 checks never covered: a commit
 * can claim "[system-build]" (the builder ran and verified this) or a
 * specific fix ("regex X -> Y", "N/N tests pass") while its actual staged
 * diff touches zero real files — a claim with nothing behind it. Confirmed
 * live 2026-07-19: commit 3fa6594f0b claimed a specific regex fix with a
 * specific test-pass count; its only changed file was the generated
 * synopsis index. Unfakeable because it reads the real staged diff, not
 * the agent's self-report of what it did.
 */
export function checkEmptyDiffClaim(message, { execFn = execSync, cwd = ROOT } = {}) {
  const claimsSystemBuild = /\[system-build\]/.test(message);
  if (!claimsSystemBuild) return true; // only [system-build] asserts "verified" — GAP-FILL alone doesn't

  let numstatOutput;
  try {
    numstatOutput = execFn('git diff --cached --numstat', { cwd, encoding: 'utf8' });
  } catch {
    return true; // can't verify — fail open rather than block on tooling error
  }

  const { realChanges } = sumRealChanges(numstatOutput);

  if (realChanges === 0) {
    process.stderr.write('\n');
    process.stderr.write('❌ EMPTY-DIFF [system-build] CLAIM — COMMIT BLOCKED\n\n');
    process.stderr.write('   This commit is tagged [system-build] (a claim the builder ran and\n');
    process.stderr.write('   verified a real change) but the staged diff touches zero real files —\n');
    process.stderr.write('   only the auto-generated synopsis index changed, if anything.\n\n');
    process.stderr.write('   If nothing real changed, this should not be tagged [system-build] at\n');
    process.stderr.write('   all. If something real DID change, stage it.\n\n');
    process.exit(1);
  }
  return true;
}

function main() {
  const message = readCommitMessage();
  checkEmptyDiffClaim(message);

  const claimsNoBlueprint = FALSE_JUSTIFICATION_PATTERNS.some((re) => re.test(message));
  if (!claimsNoBlueprint) {
    process.exit(0); // no such claim made — nothing to verify
  }

  let stagedFiles;
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACM', { cwd: ROOT, encoding: 'utf8' });
    stagedFiles = out.split('\n').map((l) => l.trim()).filter(Boolean);
  } catch {
    process.exit(0); // can't verify — fail open rather than block on tooling error
  }

  const queues = listBuildQueues();
  for (const { productId, queuePath, queue } of queues) {
    const steps = Array.isArray(queue.steps) ? queue.steps : [];
    if (steps.length === 0) continue;
    for (const step of steps) {
      const target = step.target_file;
      if (target && stagedFiles.includes(target)) {
        process.stderr.write('\n');
        process.stderr.write('❌ GAP-FILL HONESTY VIOLATION — COMMIT BLOCKED\n\n');
        process.stderr.write(`   This commit message claims no blueprint/mission pack exists,\n`);
        process.stderr.write(`   but ${queuePath} already tracks the exact file being staged:\n\n`);
        process.stderr.write(`     product:     ${productId}\n`);
        process.stderr.write(`     step:        ${step.id} (status: ${step.status})\n`);
        process.stderr.write(`     target_file: ${target}\n\n`);
        process.stderr.write('   Use the governed factory (/factory/ship-queue) against this existing\n');
        process.stderr.write('   blueprint, or if the blueprint step is genuinely wrong/stale, say so\n');
        process.stderr.write('   explicitly in the commit message instead of claiming it doesn\'t exist.\n\n');
        process.exit(1);
      }
    }
  }
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
