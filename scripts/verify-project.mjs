#!/usr/bin/env node
/**
 * SYNOPSIS: scripts/verify-project.mjs — verifies a project's structure/acceptance gates.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
let passes = 0;

console.log('Acceptance: unknown blueprint verification');

  try {
    if (!fs.existsSync(path.join(repoRoot, 'db/migrations/20260704_create_transactions_table.sql'))) {
      fails.push('Missing: db/migrations/20260704_create_transactions_table.sql');
    } else {
      passes++;
    }
  } catch (e) { fails.push('Error checking db/migrations/20260704_create_transactions_table.sql: ' + e.message); }
  try {
    if (!fs.existsSync(path.join(repoRoot, 'services/tc-doc-intake.js'))) {
      fails.push('Missing: services/tc-doc-intake.js');
    } else {
      passes++;
    }
  } catch (e) { fails.push('Error checking services/tc-doc-intake.js: ' + e.message); }
  try {
    if (!fs.existsSync(path.join(repoRoot, 'services/mls-deal-scanner.js'))) {
      fails.push('Missing: services/mls-deal-scanner.js');
    } else {
      passes++;
    }
  } catch (e) { fails.push('Error checking services/mls-deal-scanner.js: ' + e.message); }
  try {
    if (!fs.existsSync(path.join(repoRoot, 'services/tc-coordinator.js'))) {
      fails.push('Missing: services/tc-coordinator.js');
    } else {
      passes++;
    }
  } catch (e) { fails.push('Error checking services/tc-coordinator.js: ' + e.message); }
  try {
    if (!fs.existsSync(path.join(repoRoot, 'routes/tc-routes.js'))) {
      fails.push('Missing: routes/tc-routes.js');
    } else {
      passes++;
    }
  } catch (e) { fails.push('Error checking routes/tc-routes.js: ' + e.message); }
  try {
    if (!fs.existsSync(path.join(repoRoot, 'public/tc/agent-portal.html'))) {
      fails.push('Missing: public/tc/agent-portal.html');
    } else {
      passes++;
    }
  } catch (e) { fails.push('Error checking public/tc/agent-portal.html: ' + e.message); }
  try {
    if (!fs.existsSync(path.join(repoRoot, 'public/tc/client-portal.html'))) {
      fails.push('Missing: public/tc/client-portal.html');
    } else {
      passes++;
    }
  } catch (e) { fails.push('Error checking public/tc/client-portal.html: ' + e.message); }

console.log('Passed: ' + passes + '/' + 7);
if (fails.length) {
  console.error('FAIL:', fails.join(', '));
  process.exit(1);
}
console.log('ALL CHECKS PASSED');
process.exit(0);
