#!/usr/bin/env node
/**
 * SYNOPSIS: Install tracked git hooks — sets core.hooksPath=githooks so hooks cannot drift or be skipped by stale copies.
 * @ssot docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const HOOKS = path.join(ROOT, 'githooks');

function shouldSkipHookInstall() {
  if (['1', 'true', 'yes'].includes(String(process.env.SKIP_GIT_HOOKS || '').toLowerCase())) return true;
  if (process.env.CI === 'true') return true;
  if (process.env.RAILWAY === 'true' || process.env.RAILWAY_ENVIRONMENT) return true;
  if (fs.existsSync('/.dockerenv')) return true;
  if (!fs.existsSync(path.join(ROOT, '.git'))) return true;
  return false;
}

if (shouldSkipHookInstall()) {
  console.log('skip git hooks install (CI/Docker/non-git checkout)');
  process.exit(0);
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
