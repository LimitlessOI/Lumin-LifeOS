#!/usr/bin/env node
/**
 * SYNOPSIS: Verify typed blocker SSOT + parking policy are present and consistent.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BLOCKERS = path.join(ROOT, 'builderos-reboot/governance/TYPED_BLOCKER_SSOT.json');
const PARKING = path.join(ROOT, 'builderos-reboot/governance/BLOCKER_PARKING_POLICY.json');

const failures = [];
const required = [
  'BLOCKED_EXTERNAL',
  'BLOCKED_SECRET',
  'BLOCKED_TOOLING',
  'BLOCKED_STRATEGIC',
  'BLOCKED_FOUNDER_INPUT',
];

const blockers = JSON.parse(fs.readFileSync(BLOCKERS, 'utf8'));
const parking = JSON.parse(fs.readFileSync(PARKING, 'utf8'));

if (blockers.status !== 'LOCKED') failures.push('TYPED_BLOCKER_SSOT not LOCKED');
if (parking.status !== 'LOCKED') failures.push('BLOCKER_PARKING_POLICY not LOCKED');

const ids = new Set((blockers.classes || []).map((c) => c.id));
for (const id of required) {
  if (!ids.has(id)) failures.push(`missing blocker class ${id}`);
  if (!parking.per_class?.[id]) failures.push(`parking policy missing ${id}`);
}

if (failures.length) {
  console.error('TYPED BLOCKER / PARKING: FAIL');
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log(`TYPED BLOCKER / PARKING: PASS (${required.length} classes)`);
process.exit(0);
