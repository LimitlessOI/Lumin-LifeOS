#!/usr/bin/env node
/**
 * SYNOPSIS: Golden intake blueprint regression — acceptance-only (default), dry-run, or full rebuild.
 * Usage:
 *   npm run builderos:intake:regression:acceptance
 *   node scripts/builderos-intake-regression-harness.mjs --dry-run
 *   node scripts/builderos-intake-regression-harness.mjs --full
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import 'dotenv/config';
import {
  runIntakeRegressionHarness,
  writeIntakeRegressionReceipt,
} from '../services/builderos-intake-regression-harness.js';

const BASE_URL = (process.env.PUBLIC_BASE_URL || process.env.API_BASE_URL || '').replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || '';

function resolveMode(argv) {
  if (argv.includes('--full')) return 'full';
  if (argv.includes('--dry-run')) return 'dry_run';
  return 'acceptance_only';
}

async function main() {
  const mode = resolveMode(process.argv.slice(2));

  if (!BASE_URL && mode !== 'dry_run') {
    console.error('PUBLIC_BASE_URL required for acceptance/full modes');
    process.exit(1);
  }
  if (!KEY && mode !== 'dry_run') {
    console.error('COMMAND_CENTER_KEY required for acceptance/full modes');
    process.exit(1);
  }

  console.log(`\n[BuilderOS Intake Regression] mode=${mode}`);
  if (BASE_URL) console.log(`  Server: ${BASE_URL}`);

  const report = await runIntakeRegressionHarness({
    mode,
    baseUrl: BASE_URL,
    commandKey: KEY,
    onSession: (row) => {
      const badge = row.ok ? '✅' : '❌';
      const label = row.harness_id || row.step_id || row.session_id;
      console.log(`  ${badge} ${label}${row.error ? ` — ${row.error}` : ''}`);
    },
  });

  const receiptPath = writeIntakeRegressionReceipt(report);
  console.log(`\nReceipt: ${receiptPath}`);
  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
