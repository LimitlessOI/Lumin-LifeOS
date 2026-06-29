#!/usr/bin/env node
/**
 * SYNOPSIS: LifeRE W3 acceptance.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = { wave: 'W3', passed: [], failed: [] };
const step = (id, ok) => { (ok ? report.passed : report.failed).push(id); };

const mods = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/lifere-coaching-modules.json'), 'utf8'));
step('LRE-W3-T01', mods.count === 24);
step('LRE-W3-T02', fs.existsSync(path.join(ROOT, 'services/lifere-personality-calibration.js')));
step('LRE-W3-T03', fs.existsSync(path.join(ROOT, 'services/lifere-skill-coaching.js')));
step('LRE-W3-T04', fs.readFileSync(path.join(ROOT, 'routes/lifere-os-routes.js'), 'utf8').includes('/coaching/skill-impact'));

report.ok = report.failed.length === 0;
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
