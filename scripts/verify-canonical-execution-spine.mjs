#!/usr/bin/env node
/**
 * SYNOPSIS: Verify locked canonical execution spine governance artifact.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPINE = path.join(ROOT, 'builderos-reboot/governance/CANONICAL_EXECUTION_SPINE.json');
const BP = path.join(ROOT, 'builderos-reboot/BP_PRIORITY.json');

const failures = [];

if (!fs.existsSync(SPINE)) {
  failures.push('CANONICAL_EXECUTION_SPINE.json missing');
} else {
  const data = JSON.parse(fs.readFileSync(SPINE, 'utf8'));
  if (data.status !== 'LOCKED') failures.push('spine status must be LOCKED');
  if (data.spine_id !== 'builderos_canonical_v1') failures.push('spine_id mismatch');
  if (data.primary_work_queue !== 'builderos-reboot/BP_PRIORITY.json') {
    failures.push('primary_work_queue must be BP_PRIORITY.json');
  }
  if (!Array.isArray(data.primary_entrypoints) || data.primary_entrypoints.length < 1) {
    failures.push('primary_entrypoints required');
  }
  if (!Array.isArray(data.deprecated_paths) || data.deprecated_paths.length < 1) {
    failures.push('deprecated_paths required');
  }
}

if (!fs.existsSync(BP)) failures.push('BP_PRIORITY.json missing');

if (failures.length) {
  console.error('CANONICAL EXECUTION SPINE: FAIL');
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log('CANONICAL EXECUTION SPINE: PASS');
process.exit(0);
