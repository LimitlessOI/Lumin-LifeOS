#!/usr/bin/env node
/**
 * SYNOPSIS: LifeRE W4 acceptance.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = { wave: 'W4', passed: [], failed: [] };
const step = (id, ok) => { (ok ? report.passed : report.failed).push(id); };

const vt = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/lifere-video-types.json'), 'utf8'));
const routes = fs.readFileSync(path.join(ROOT, 'routes/lifere-os-routes.js'), 'utf8');
const marketing = fs.readFileSync(path.join(ROOT, 'services/lifere-marketing-module.js'), 'utf8');

step('LRE-W4-T01', vt.count === 30);
step('LRE-W4-T02', routes.includes('/marketing/research/hooks'));
step('LRE-W4-T03', routes.includes('/marketing/calendar'));
step('LRE-W4-T04', routes.includes('/marketing/funnel/webhook'));
step('LRE-W4-T05', marketing.includes('b_roll_beats'));

report.ok = report.failed.length === 0;
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
