#!/usr/bin/env node
/**
 * SYNOPSIS: Fail if routes/spine import .js files not tracked in git (Railway boot crash guard).
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TRACKED_RAW = (() => {
  try {
    return execSync('git ls-files services routes startup', { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
})();
const TRACKED = TRACKED_RAW
  ? new Set(TRACKED_RAW.split('\n').filter(Boolean))
  : null;

const SPINE_ENTRIES = [
  'routes/lifeos-builderos-command-control-routes.js',
  'services/lumin-chair-orchestrator.js',
  'services/founder-build-self-repair.js',
  'services/point-b-navigator.js',
  'startup/register-runtime-routes.js',
];

const REQUIRED_FILES = [
  'services/founder-build-quorum-escalation.js',
  'services/obstacle-web-research.js',
  'services/founder-intake-gate.js',
  'factory-staging/factory-core/builder/run-step.js',
];

function rel(abs) {
  return path.relative(REPO_ROOT, abs).replace(/\\/g, '/');
}

function collectUntracked(entry, seen = new Set()) {
  const file = path.resolve(REPO_ROOT, entry);
  if (seen.has(file) || !fs.existsSync(file)) return [];
  seen.add(file);
  const misses = [];
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/from ['"](\.\.?\/[^'"]+)['"]/g)) {
    let imp = m[1];
    if (!imp.endsWith('.js')) imp += '.js';
    const resolved = path.normalize(path.join(path.dirname(file), imp));
    const r = rel(resolved);
    if (!(r.startsWith('services/') || r.startsWith('routes/') || r.startsWith('startup/'))) continue;
    if (fs.existsSync(resolved) && !TRACKED.has(r)) misses.push({ from: rel(file), import: r });
    misses.push(...collectUntracked(r, seen));
  }
  return misses;
}

const untracked = [];
if (TRACKED) {
  for (const entry of SPINE_ENTRIES) {
    untracked.push(...collectUntracked(entry));
  }
}
const unique = [...new Map(untracked.map((u) => [u.import, u])).values()];

const missingRequired = REQUIRED_FILES.filter((f) => !fs.existsSync(path.join(REPO_ROOT, f)));

if (unique.length || missingRequired.length) {
  console.error('SPINE IMPORT VERIFY: FAIL');
  for (const u of unique) console.error(`  untracked import: ${u.import} (from ${u.from})`);
  for (const f of missingRequired) console.error(`  missing required: ${f}`);
  process.exit(1);
}

console.log(
  'SPINE IMPORT VERIFY: PASS',
  TRACKED ? `(${unique.length} untracked=0, ${REQUIRED_FILES.length} required)` : `(docker mode — required files only, ${REQUIRED_FILES.length} checked)`,
);
