#!/usr/bin/env node
/**
 * SYNOPSIS: Acceptance test for memory-system product.
 * @ssot docs/products/memory-system/PRODUCT_HOME.md
 *
 * Checks: file existence, syntax, and route probes on production.
 * Exit 0 = PASS, exit 1 = FAIL.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const REQUIRED_FILES = [
  'services/memory-capsule.js',
  'routes/memory-capsule-routes.js',
  'routes/memory-routes.js',
  'services/memory-signal-intake.js',
  'services/memory-provenance.js',
  'services/memory-retrieval.js',
];

const BASE_URL = (
  process.env.PUBLIC_BASE_URL ||
  process.env.BUILDER_BASE_URL ||
  ''
).replace(/\/$/, '');

const CMD_KEY = process.env.COMMAND_CENTER_KEY || '';

const fails = [];
let passes = 0;

function pass(msg) { passes++; console.log(`PASS ${msg}`); }
function fail(msg) { fails.push(msg); console.log(`FAIL ${msg}`); }

for (const f of REQUIRED_FILES) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) { fail(`Missing: ${f}`); continue; }
  if (f.endsWith('.js')) {
    const { execSync } = await import('node:child_process');
    try {
      execSync(`node -c ${abs}`, { encoding: 'utf8', stdio: 'pipe' });
      pass(`${f} exists + syntax OK`);
    } catch { fail(`${f} syntax error`); }
  } else {
    pass(`${f} exists`);
  }
}

if (BASE_URL && CMD_KEY) {
  const routes = [
    { method: 'GET', path: '/api/v1/memory/capsules/health' },
  ];
  for (const r of routes) {
    try {
      const res = await fetch(`${BASE_URL}${r.path}`, {
        method: r.method,
        headers: { 'x-command-key': CMD_KEY },
        signal: AbortSignal.timeout(10000),
      });
      if (res.status < 500) {
        pass(`${r.method} ${r.path} → ${res.status}`);
      } else {
        fail(`${r.method} ${r.path} → ${res.status}`);
      }
    } catch (e) {
      fail(`${r.method} ${r.path} → ${e.message}`);
    }
  }
} else {
  console.log('SKIP route probes (no BASE_URL or CMD_KEY)');
}

console.log(`\nResults: ${passes} passed, ${fails.length} failed`);
if (fails.length) {
  console.error('FAILURES:', fails.join('; '));
  process.exit(1);
}
console.log('ALL CHECKS PASSED');
process.exit(0);
