#!/usr/bin/env node
/**
 * SYNOPSIS: Verify BuilderOS Mission 2.0 handoff integrity.
 * Reads docs/audits/builderos-mission-2/MISSION_2_0_HANDOFF.md, extracts the
 * base commit hash, and checks it against origin/main. Also validates that
 * required handoff sections exist.
 * @ssot docs/audits/builderos-mission-2/MISSION_2_0_HANDOFF.md
 */
import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');

const HANDOFF_PATH = path.join(
  repoRoot,
  'docs',
  'audits',
  'builderos-mission-2',
  'MISSION_2_0_HANDOFF.md',
);

const REQUIRED_SECTIONS = [
  '## Package Status',
  '## What was true at base commit',
  '## Decisions made',
  '## Unresolved questions',
  '## Authority state',
  '## How the next agent should continue',
  '## Verification commands',
];

async function main() {
  let handoff;
  try {
    handoff = await readFile(HANDOFF_PATH, 'utf8');
  } catch (err) {
    console.error(`FAIL: could not read handoff: ${err.message}`);
    process.exit(1);
  }

  const hashMatch = handoff.match(/\*\*Base commit.*?`([0-9a-f]{40})`/);
  if (!hashMatch) {
    console.error('FAIL: handoff is missing a base commit hash');
    process.exit(1);
  }
  const handoffCommit = hashMatch[1];

  let originMain;
  try {
    originMain = execSync('git rev-parse origin/main', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (err) {
    console.error(`FAIL: could not resolve origin/main: ${err.message}`);
    process.exit(1);
  }

  const missingSections = REQUIRED_SECTIONS.filter((section) => !handoff.includes(section));
  if (missingSections.length) {
    console.error(`FAIL: handoff missing sections: ${missingSections.join(', ')}`);
    process.exit(1);
  }

  const ok = handoffCommit === originMain;
  const result = {
    ok,
    handoff_commit: handoffCommit,
    origin_main: originMain,
    sections_present: REQUIRED_SECTIONS.length,
    message: ok
      ? 'Handoff base commit matches origin/main.'
      : 'Handoff base commit does NOT match origin/main. Rebase/recheck before editing.',
  };
  console.log(JSON.stringify(result, null, 2));
  process.exit(ok ? 0 : 2);
}

main().catch((err) => {
  console.error(`FAIL: ${err.message}`);
  process.exit(1);
});
