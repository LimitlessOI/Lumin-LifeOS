#!/usr/bin/env node
/**
 * SYNOPSIS: Pre-commit / CI verifier for file-placement authority.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateFilePlacement, formatFilePlacementFindings } from './lib/file-placement-gate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function normalize(p) {
  return String(p || '').replace(/^\.\//, '').replace(/\\/g, '/').replace(/^\//, '');
}

function getStagedAddedFiles(repoRoot) {
  try {
    const out = execSync('git diff --cached --name-status --diff-filter=A', {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    const files = [];
    for (const line of out.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // status + optional rename + path
      const parts = trimmed.split(/\s+/);
      const file = parts[parts.length - 1];
      if (file) files.push(normalize(file));
    }
    return files;
  } catch {
    return [];
  }
}

function readStagedContent(repoRoot, rel) {
  try {
    return execSync(`git show :${rel}`, { cwd: repoRoot, encoding: 'utf8' });
  } catch {
    return null;
  }
}

function getTrackedSet(repoRoot) {
  try {
    const out = execSync('git ls-tree -r --name-only HEAD', {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    const set = new Set();
    for (const line of out.split('\n')) {
      const t = line.trim();
      if (t) set.add(t);
    }
    return set;
  } catch {
    return new Set();
  }
}

const args = process.argv.slice(2);
const staged = !args.includes('--all');

function run() {
  const added = staged ? getStagedAddedFiles(ROOT) : [];
  if (!added.length && staged) {
    console.log('✅ No new staged files — file-placement gate passes.');
    return 0;
  }

  const trackedSet = getTrackedSet(ROOT);
  const entries = [];

  if (staged) {
    for (const rel of added) {
      const content = readStagedContent(ROOT, rel);
      if (content != null) entries.push({ path: rel, content });
    }
  }

  const result = evaluateFilePlacement(entries, ROOT, { trackedSet });

  if (result.findings.length) {
    console.error('❌ FILE PLACEMENT AUTHORITY GATE');
    console.error(formatFilePlacementFindings(result.findings));
    console.error('');
  }

  if (!result.ok) {
    console.error('New protected files must carry an @ssot tag pointing to a registered product home or approved shared authority.');
    console.error('For GAP-FILL exceptions, use a commit message starting with "GAP-FILL:" and containing "PLACEMENT_APPROVED:".');
    return 1;
  }

  console.log('✅ File-placement authority gate passes.');
  return 0;
}

process.exit(run());
