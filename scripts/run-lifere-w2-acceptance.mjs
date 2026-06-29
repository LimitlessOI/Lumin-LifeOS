#!/usr/bin/env node
/**
 * SYNOPSIS: LifeRE W2 acceptance.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = { wave: 'W2', passed: [], failed: [] };
const step = (id, ok) => { (ok ? report.passed : report.failed).push(id); };
const has = (f, p) => fs.existsSync(f) && p.test(fs.readFileSync(f, 'utf8'));

step('LRE-W2-T01', has(path.join(ROOT, 'db/migrations/20260613_lifere_twin_framework.sql'), /lifere_approval_queue/));
step('LRE-W2-T02', fs.existsSync(path.join(ROOT, 'services/lifere-permission-twin.js')));
step('LRE-W2-T03', has(path.join(ROOT, 'services/lifere-client-comms.js'), /status_update/));
step('LRE-W2-T04', has(path.join(ROOT, 'public/overlay/lifeos-lifere.html'), /lifere-approval-queue/));
step('LRE-W2-T05', has(path.join(ROOT, 'routes/lifere-os-routes.js'), /lifeos\/crosscheck/));

report.ok = report.failed.length === 0;
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
