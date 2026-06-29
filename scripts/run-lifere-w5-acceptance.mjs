#!/usr/bin/env node
/**
 * SYNOPSIS: LifeRE W5 acceptance.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = { wave: 'W5', passed: [], failed: [] };
const step = (id, ok) => { (ok ? report.passed : report.failed).push(id); };
const routes = fs.readFileSync(path.join(ROOT, 'routes/lifere-os-routes.js'), 'utf8');

step('LRE-W5-T01', fs.existsSync(path.join(ROOT, 'services/lifere-transaction-surface.js')));
step('LRE-W5-T02', routes.includes('/recruiting/pipeline'));
step('LRE-W5-T03', routes.includes('/finance/forecast'));
step('LRE-W5-T04', routes.includes('/opportunity/signals'));
step('LRE-W5-T05', fs.existsSync(path.join(ROOT, 'services/lifere-receptionist-bridge.js')));

report.ok = report.failed.length === 0;
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
