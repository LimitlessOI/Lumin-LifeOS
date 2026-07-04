#!/usr/bin/env node
/**
 * SYNOPSIS: Acceptance test for knowledge-base product.
 * @ssot docs/products/knowledge-base/PRODUCT_HOME.md
 *
 * Checks: required files exist + syntax OK.
 * Exit 0 = PASS, exit 1 = FAIL.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const REQUIRED_FILES = [
  'db/migrations/20260704_create_knowledge_base_files.sql',
  'db/migrations/20260704_create_system_source_of_truth.sql',
  'services/knowledge-context.js',
  'services/searchService.js',
  'routes/knowledge-base-routes.js',
  'routes/web-intelligence-routes.js',
  'public/overlay/knowledge-upload.html',
];

const fails = [];
let passes = 0;

function pass(msg) { passes++; console.log(`PASS ${msg}`); }
function fail(msg) { fails.push(msg); console.log(`FAIL ${msg}`); }

for (const f of REQUIRED_FILES) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) { fail(`Missing: ${f}`); continue; }
  if (f.endsWith('.js')) {
    try {
      execSync(`node -c "${abs}"`, { encoding: 'utf8', stdio: 'pipe' });
      pass(`${f} exists + syntax OK`);
    } catch { fail(`${f} syntax error`); }
  } else if (f.endsWith('.sql')) {
    const content = fs.readFileSync(abs, 'utf8');
    if (content.length > 10 && /CREATE\s+TABLE/i.test(content)) {
      pass(`${f} exists + has CREATE TABLE`);
    } else {
      fail(`${f} exists but no CREATE TABLE found`);
    }
  } else if (f.endsWith('.html')) {
    const content = fs.readFileSync(abs, 'utf8');
    if (content.length > 50) {
      pass(`${f} exists (${content.length} bytes)`);
    } else {
      fail(`${f} exists but too small (${content.length} bytes)`);
    }
  } else {
    pass(`${f} exists`);
  }
}

console.log(`\nResults: ${passes} passed, ${fails.length} failed of ${REQUIRED_FILES.length} files`);
if (fails.length) {
  console.error('FAILURES:', fails.join('; '));
  process.exit(1);
}
console.log('ALL CHECKS PASSED');
process.exit(0);
