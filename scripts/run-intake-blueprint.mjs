#!/usr/bin/env node
/**
 * SYNOPSIS: Execute an ARC-ready intake blueprint through BuilderOS — observe failures, fix builder not product by hand.
 * Usage:
 *   node scripts/run-intake-blueprint.mjs --session <uuid>
 *   node scripts/run-intake-blueprint.mjs --session <uuid> --dry-run
 *   node scripts/run-intake-blueprint.mjs --session <uuid> --from MOS-P1-002
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */

import 'dotenv/config';
import { executeIntakeBlueprint } from '../services/intake-blueprint-executor.js';

const BASE_URL = (process.env.API_BASE_URL || process.env.PUBLIC_BASE_URL || 'https://robust-magic-production.up.railway.app').replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY;

async function main() {
  const args = process.argv.slice(2);
  const sessionIdx = args.indexOf('--session');
  const sessionId = sessionIdx !== -1 ? args[sessionIdx + 1] : null;
  const dryRun = args.includes('--dry-run');
  const fromIdx = args.indexOf('--from');
  const fromStep = fromIdx !== -1 ? args[fromIdx + 1] : null;

  if (!sessionId || !KEY) {
    console.error('Usage: node scripts/run-intake-blueprint.mjs --session <uuid> [--dry-run] [--from STEP_ID]');
    process.exit(1);
  }

  console.log(`\n[Intake Blueprint Executor]`);
  console.log(`  Session: ${sessionId}`);
  console.log(`  Server:  ${BASE_URL}`);
  console.log(`  Dry run: ${dryRun}`);
  if (fromStep) console.log(`  From:    ${fromStep}`);

  const result = await executeIntakeBlueprint({
    sessionId,
    baseUrl: BASE_URL,
    commandKey: KEY,
    fromStepId: fromStep,
    dryRun,
    onStep: (row) => {
      const badge = row.ok ? '✅' : '❌';
      console.log(`  ${badge} ${row.step_id} → ${row.target_file} (committed: ${row.committed})`);
      if (!row.ok) {
        console.log(`      error: ${row.error}`);
        if (row.violations?.length) console.log(`      violations: ${row.violations.join('; ')}`);
      }
    },
  });

  if (!result.ok) {
    console.error('\nFAILED:', result.error);
    if (result.failed_step) console.error(`  Step: ${result.failed_step} (${result.target_file})`);
    if (result.builder) console.error(JSON.stringify(result.builder, null, 2).slice(0, 1500));
    process.exit(1);
  }

  console.log(`\nDone — ${result.steps_run} step(s) committed via BuilderOS.`);
  const acceptance = result.blueprint?._meta?.acceptance_cmd;
  if (acceptance && !dryRun) {
    console.log(`\nNext: run acceptance — ${acceptance}`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
