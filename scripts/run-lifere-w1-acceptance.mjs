#!/usr/bin/env node
/**
 * SYNOPSIS: LifeRE W1 acceptance.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = { wave: 'W1', passed: [], failed: [] };

function step(id, ok, detail = '') {
  (ok ? report.passed : report.failed).push(id);
  if (!ok) report[`fail_${id}`] = detail;
}

function has(file, pattern) {
  if (!fs.existsSync(file)) return false;
  return pattern.test(fs.readFileSync(file, 'utf8'));
}

step('LRE-W1-T01', fs.existsSync(path.join(ROOT, 'db/migrations/20260613_lifere_twin_framework.sql')));
step('LRE-W1-T02', has(path.join(ROOT, 'services/lifere-performance-twin.js'), /findBottleneck/));
step('LRE-W1-T03', has(path.join(ROOT, 'routes/lifere-os-routes.js'), /\/performance\/bottleneck/));
step('LRE-W1-T04', has(path.join(ROOT, 'public/overlay/lifeos-lifere.html'), /data-lifere-perf="bottleneck"/));
step('LRE-W1-T05', fs.existsSync(path.join(ROOT, 'tests/lifere-performance-twin.test.js')));
step('LRE-W1-T06', has(path.join(ROOT, 'routes/lifere-os-routes.js'), /AMENDMENT_LIFERE/));

report.ok = report.failed.length === 0;
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
