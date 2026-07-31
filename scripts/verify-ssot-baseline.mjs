/**
 * SYNOPSIS: Verify @ssot missing-tag count stays within the approved baseline.
 *
 * Usage:
 *   node scripts/verify-ssot-baseline.mjs
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join(ROOT, 'data', 'ssot-soft-debt-baseline.json');

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));

const out = execFileSync('node', [path.join(ROOT, 'scripts', 'ssot-check.js'), '--all'], {
  cwd: ROOT,
  encoding: 'utf8',
});

const missingMatch = out.match(/Missing tag:\s*(\d+)/);
const taggedMatch = out.match(/Tagged:\s*(\d+)/);
const missing = missingMatch ? Number(missingMatch[1]) : null;
const tagged = taggedMatch ? Number(taggedMatch[1]) : null;

if (missing === null || tagged === null) {
  console.error('❌ Could not parse ssot-check --all output');
  process.exit(1);
}

const errors = [];
if (missing > baseline.missing_tag_count) {
  errors.push(`Missing tag count ${missing} exceeds baseline ${baseline.missing_tag_count}`);
}

if (errors.length) {
  for (const e of errors) console.error('❌', e);
  process.exit(1);
}

console.log(`✅ SSOT baseline OK: tagged=${tagged} missing=${missing} (baseline missing=${baseline.missing_tag_count})`);
