#!/usr/bin/env node
/**
 * SYNOPSIS: Prove a branch is actually reachable from `origin` — with a real
 *   commit SHA and file list — before an agent writes "already done, just
 *   verify" in a cross-session/cross-machine handoff.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Why this exists: observed live (2026-07-18, blueprint reconciliation).
 * A handoff doc said "branch already exists and has uncommitted work — do
 * not start over." The work was real, but it only ever existed on the
 * authoring agent's own disk; it had never been pushed to origin. The
 * receiving agent (a different machine/session) spent multiple rounds
 * discovering the branch didn't exist anywhere it could reach, before the
 * authoring agent pushed it. A one-command, fail-loud preflight the
 * authoring agent runs BEFORE writing the handoff — and pastes the exact
 * output into it — would have caught this in seconds instead of costing a
 * full round-trip.
 *
 * Usage:
 *   node scripts/verify-branch-pushed.mjs --branch <name> [--base main]
 *
 * Exits non-zero (and says exactly why) if the branch is not reachable from
 * origin. On success, prints the exact evidence a handoff doc should quote:
 * remote SHA, ahead/behind count vs base, and the file list of the diff.
 */
import { execSync } from 'node:child_process';

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function parseArgs(argv) {
  const out = { base: 'main' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--branch') out.branch = argv[i + 1];
    if (argv[i] === '--base') out.base = argv[i + 1];
  }
  return out;
}

function main() {
  const { branch, base } = parseArgs(process.argv.slice(2));
  if (!branch) {
    console.error('Usage: node scripts/verify-branch-pushed.mjs --branch <name> [--base main]');
    process.exit(1);
  }

  console.log(`Fetching origin/${branch} and origin/${base}...`);
  try {
    sh('git fetch origin');
  } catch (err) {
    console.error(`FAIL: could not fetch origin at all — ${err.message}`);
    process.exit(1);
  }

  let remoteSha;
  try {
    remoteSha = sh(`git rev-parse --verify origin/${branch}`);
  } catch {
    console.error(`FAIL: origin/${branch} does not exist. This branch is not reachable from another clone/session.`);
    console.error('Push it before writing "already done" into a handoff: git push -u origin ' + branch);
    process.exit(1);
  }

  let baseSha;
  try {
    baseSha = sh(`git rev-parse --verify origin/${base}`);
  } catch {
    console.error(`FAIL: origin/${base} does not exist either — cannot compute ahead/behind.`);
    process.exit(1);
  }

  const aheadBehind = sh(`git rev-list --left-right --count origin/${base}...origin/${branch}`);
  const [behind, ahead] = aheadBehind.split(/\s+/);
  const files = sh(`git diff --name-only origin/${base}...origin/${branch}`);
  const fileList = files ? files.split('\n') : [];

  console.log('');
  console.log('✅ PROVEN — paste this into the handoff, not prose claims:');
  console.log(`   branch:        origin/${branch}`);
  console.log(`   tip commit:    ${remoteSha}`);
  console.log(`   base (${base}): ${baseSha}`);
  console.log(`   ahead/behind:  +${ahead} / -${behind} vs origin/${base}`);
  console.log(`   files changed: ${fileList.length}`);
  fileList.slice(0, 30).forEach((f) => console.log(`     - ${f}`));
  if (fileList.length > 30) console.log(`     ...and ${fileList.length - 30} more`);
}

main();
