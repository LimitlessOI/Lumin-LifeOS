#!/usr/bin/env node
/**
 * SYNOPSIS: Pre-commit gate — auto-inject SYNOPSIS headers on staged/new files (no opt-out).
 * @ssot docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  hasSynopsis,
  inferSynopsis,
  injectSynopsis,
  isInFileEnforceable,
} from './lib/file-synopsis.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  return {
    staged: argv.includes('--staged'),
    all: argv.includes('--all'),
    check: argv.includes('--check'),
    autoFix: argv.includes('--auto-fix') || argv.includes('--staged'),
  };
}

function gitLines(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
}

function listTargetFiles({ staged, all }) {
  if (all) return gitLines('git ls-files');
  if (staged) {
    return gitLines('git diff --cached --name-only --diff-filter=ACM');
  }
  return gitLines('git diff --cached --name-only --diff-filter=ACM');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const files = listTargetFiles(args).filter(isInFileEnforceable);

  if (!files.length) {
    console.log('✅ file-synopsis: no enforceable files in scope');
    return;
  }

  const missing = [];
  const fixed = [];

  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;

    let content;
    try {
      content = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }

    const ext = path.extname(rel);
    if (hasSynopsis(content, ext)) continue;

    missing.push(rel);
    if (!args.autoFix) continue;

    const synopsis = inferSynopsis(rel, content);
    const next = injectSynopsis(content, synopsis, ext);
    if (next === content) continue;

    fs.writeFileSync(abs, next, 'utf8');
    fixed.push(rel);

    try {
      execSync(`git add -- ${JSON.stringify(rel)}`, { cwd: ROOT, stdio: 'pipe' });
    } catch {
      /* best effort re-stage */
    }
  }

  if (fixed.length) {
    console.log(`✅ file-synopsis: auto-injected SYNOPSIS on ${fixed.length} file(s)`);
    for (const f of fixed.slice(0, 20)) console.log(`   + ${f}`);
    if (fixed.length > 20) console.log(`   … and ${fixed.length - 20} more`);
  }

  if (missing.length && !args.autoFix) {
    console.error('');
    console.error(`❌ FILE SYNOPSIS LAW: ${missing.length} staged file(s) lack SYNOPSIS header.`);
    for (const f of missing.slice(0, 15)) console.error(`   - ${f}`);
    if (missing.length > 15) console.error(`   … and ${missing.length - 15} more`);
    console.error('');
    console.error('   Fix: node scripts/file-synopsis-enforce.mjs --staged --auto-fix');
    console.error('   Index: npm run lifeos:file-synopsis:index');
    console.error('');
    process.exit(1);
  }

  if (args.check && missing.length) {
    console.error(`❌ file-synopsis: ${missing.length} file(s) missing SYNOPSIS`);
    process.exit(1);
  }

  console.log('✅ file-synopsis enforce complete');
}

main();
