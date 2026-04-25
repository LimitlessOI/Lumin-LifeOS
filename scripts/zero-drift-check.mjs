#!/usr/bin/env node
/**
 * Warns (or fails in strict mode) when routes/services changed without
 * continuity / cold-start docs updated in the same change set.
 *
 * @ssot docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const strict = process.env.ZERO_DRIFT_STRICT === '1';

function changedFiles() {
  try {
    const staged = execSync('git diff --cached --name-only', { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);
    const unstaged = execSync('git diff --name-only', { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);
    return [...new Set([...staged, ...unstaged])];
  } catch {
    return [];
  }
}

const continuityPaths = [
  'docs/CONTINUITY_LOG.md',
  'docs/CONTINUITY_INDEX.md',
  'docs/CONTINUITY_LOG_LIFEOS.md',
  'docs/CONTINUITY_LOG_COUNCIL.md',
  'docs/AI_COLD_START.md',
  'docs/projects/AMENDMENT_21_LIFEOS_CORE.md',
  'docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md',
];

function main() {
  const changed = changedFiles();
  if (!changed.length) {
    console.log('zero-drift: no changed files');
    return 0;
  }

  const codeTouched = changed.some((f) => /^(routes|services|startup)\/.+\.js$/.test(f));
  if (!codeTouched) return 0;

  const docTouched = changed.some((f) => continuityPaths.some((p) => f === p || f.endsWith(p)));

  if (!docTouched) {
    const msg =
      '[ZERO-DRIFT] routes/services/startup changed but no continuity lane / AI_COLD_START / Amendment 21/36 doc in the same diff.\n' +
      '  Fix: update the appropriate lane log + run `npm run cold-start:gen` + commit `docs/AI_COLD_START.md`.\n' +
      '  Override: set ZERO_DRIFT_STRICT=0 (default) — this check is warn-only unless ZERO_DRIFT_STRICT=1.';
    if (strict) {
      console.error(msg);
      return 1;
    }
    console.warn(msg);
  }
  return 0;
}

process.exit(main());
