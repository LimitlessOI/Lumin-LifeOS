#!/usr/bin/env node
/**
 * Prints a short summary of the current git diff for CI / PR descriptions.
 *
 * @ssot docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function main() {
  let stat;
  try {
    execSync('git fetch origin main --depth=64 2>/dev/null', { cwd: ROOT, stdio: 'ignore' });
    stat = execSync('git diff --stat origin/main...HEAD', { cwd: ROOT, encoding: 'utf8' });
  } catch {
    try {
      stat = execSync('git diff --stat HEAD~1..HEAD', { cwd: ROOT, encoding: 'utf8' });
    } catch {
      stat = execSync('git diff --stat', { cwd: ROOT, encoding: 'utf8' });
    }
  }
  const lines = stat.trim().split('\n');
  const tail = lines.slice(-15).join('\n');
  console.log('## Diff summary (last ~15 lines of --stat)\n');
  console.log(tail || '(empty)');
}

main();
