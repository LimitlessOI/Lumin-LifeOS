#!/usr/bin/env node
/**
 * Install tracked git hooks from ./githooks into .git/hooks.
 *
 * @ssot docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'githooks');
const DEST = path.join(ROOT, '.git', 'hooks');

if (!fs.existsSync(path.join(ROOT, '.git'))) {
  console.error('Not a git repository root.');
  process.exit(1);
}

if (!fs.existsSync(SRC)) {
  console.error('Missing tracked githooks directory.');
  process.exit(1);
}

fs.mkdirSync(DEST, { recursive: true });

const hooks = fs.readdirSync(SRC).filter((name) => !name.startsWith('.'));
if (!hooks.length) {
  console.error('No tracked hooks found in githooks/.');
  process.exit(1);
}

for (const hook of hooks) {
  const from = path.join(SRC, hook);
  const to = path.join(DEST, hook);
  fs.copyFileSync(from, to);
  fs.chmodSync(to, 0o755);
  console.log(`Installed ${hook}`);
}

console.log('Git hooks installed from tracked repo files.');
