#!/usr/bin/env node
/**
 * SYNOPSIS: Factory import-smoke — dynamic import of factory-core entrypoints + boot spine tracked-import guard.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const FACTORY_ENTRIES = [
  'factory-staging/factory-core/builder/run-step.js',
  'factory-staging/factory-core/builder/authoring.js',
  'factory-staging/factory-core/builder/blocked-return.js',
  'factory-staging/factory-core/builder/run-mission.js',
  'startup/register-founder-runtime-routes.js',
];

const failures = [];

for (const rel of FACTORY_ENTRIES) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    failures.push({ rel, error: 'missing_on_disk' });
    continue;
  }
  const check = spawnSync(process.execPath, ['--check', abs], { cwd: ROOT, encoding: 'utf8' });
  if (check.status !== 0) {
    failures.push({ rel, error: 'syntax_fail', detail: (check.stderr || check.stdout || '').slice(0, 240) });
    continue;
  }
  try {
    await import(pathToFileURL(abs).href);
  } catch (err) {
    failures.push({ rel, error: 'import_fail', detail: String(err?.message || err).slice(0, 400) });
  }
}

const spine = spawnSync(process.execPath, [path.join(ROOT, 'scripts/verify-spine-imports.mjs')], {
  cwd: ROOT,
  encoding: 'utf8',
});
if (spine.status !== 0) {
  failures.push({
    rel: 'scripts/verify-spine-imports.mjs',
    error: 'spine_import_verify_fail',
    detail: (spine.stderr || spine.stdout || '').slice(0, 400),
  });
}

if (failures.length) {
  console.error('FACTORY IMPORT-SMOKE: FAIL');
  for (const f of failures) console.error(JSON.stringify(f));
  process.exit(1);
}

console.log(`FACTORY IMPORT-SMOKE: PASS (${FACTORY_ENTRIES.length} entries + spine import verify)`);
process.exit(0);
