#!/usr/bin/env node
/**
 * SYNOPSIS: scripts/run-lifere-acceptance.mjs — runs the LifeRE acceptance test suite.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
let passes = 0;

console.log('Acceptance: unknown blueprint verification');

  try {
    if (!fs.existsSync(path.join(repoRoot, 'db/migrations/20260704_create_lifere_sales_coaching.sql'))) {
      fails.push('Missing: db/migrations/20260704_create_lifere_sales_coaching.sql');
    } else {
      passes++;
    }
  } catch (e) { fails.push('Error checking db/migrations/20260704_create_lifere_sales_coaching.sql: ' + e.message); }
  try {
    if (!fs.existsSync(path.join(repoRoot, 'services/lifere-sales-simulator.js'))) {
      fails.push('Missing: services/lifere-sales-simulator.js');
    } else {
      passes++;
    }
  } catch (e) { fails.push('Error checking services/lifere-sales-simulator.js: ' + e.message); }
  try {
    if (!fs.existsSync(path.join(repoRoot, 'routes/lifere-sales-coaching-routes.js'))) {
      fails.push('Missing: routes/lifere-sales-coaching-routes.js');
    } else {
      passes++;
    }
  } catch (e) { fails.push('Error checking routes/lifere-sales-coaching-routes.js: ' + e.message); }
  try {
    if (!fs.existsSync(path.join(repoRoot, 'public/overlay/lifeos-lifere.html'))) {
      fails.push('Missing: public/overlay/lifeos-lifere.html');
    } else {
      passes++;
    }
  } catch (e) { fails.push('Error checking public/overlay/lifeos-lifere.html: ' + e.message); }

console.log('Passed: ' + passes + '/' + 4);
if (fails.length) {
  console.error('FAIL:', fails.join(', '));
  process.exit(1);
}
console.log('ALL CHECKS PASSED');
process.exit(0);
