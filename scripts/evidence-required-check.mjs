#!/usr/bin/env node
/**
 * When high-risk paths are staged, require evidence in commit message body
 * (e.g. "evidence:" or "tested:") so deploy/railway changes are not blind.
 *
 * @ssot docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const RISK_RE = /(deployment-service|railway-managed-env|GITHUB_TOKEN|COMMAND_CENTER_KEY)/i;
const EVIDENCE_RE = /\b(evidence|tested|screenshot|log):/i;

function stagedFiles() {
  try {
    return execSync('git diff --cached --name-only', { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

async function commitMsg() {
  const p = path.join(ROOT, '.git', 'COMMIT_EDITMSG');
  try {
    return await fs.readFile(p, 'utf8');
  } catch {
    return '';
  }
}

async function main() {
  const staged = stagedFiles();
  const risky = staged.filter((f) => RISK_RE.test(f));
  if (!risky.length) {
    console.log('evidence:check — no high-risk paths staged');
    return;
  }
  const msg = await commitMsg();
  if (!EVIDENCE_RE.test(msg)) {
    console.warn(
      '[EVIDENCE] High-risk files staged but commit message lacks "evidence:" / "tested:" / "screenshot:" / "log:".\n' +
      `  Files: ${risky.join(', ')}\n` +
      '  This check is warn-only (does not block commit).'
    );
  }
}

main().catch(console.error);
