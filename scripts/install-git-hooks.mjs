#!/usr/bin/env node
/**
 * SYNOPSIS: Install tracked git hooks — sets core.hooksPath=githooks so hooks cannot drift or be skipped by stale copies.
 * @ssot docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const HOOKS = path.join(ROOT, 'githooks');

if (!fs.existsSync(path.join(ROOT, '.git'))) {
  console.error('Not a git repository root.');
  process.exit(1);
}

if (!fs.existsSync(HOOKS)) {
  console.error('Missing tracked githooks directory.');
  process.exit(1);
}

const hookFiles = fs.readdirSync(HOOKS).filter((name) => !name.startsWith('.'));
if (!hookFiles.length) {
  console.error('No tracked hooks found in githooks/.');
  process.exit(1);
}

for (const hook of hookFiles) {
  fs.chmodSync(path.join(HOOKS, hook), 0o755);
}

execSync('git config core.hooksPath githooks', { cwd: ROOT, stdio: 'inherit' });

console.log('✅ Git hooksPath → githooks/ (tracked hooks are authoritative)');
for (const hook of hookFiles) {
  console.log(`   ${hook}`);
}
