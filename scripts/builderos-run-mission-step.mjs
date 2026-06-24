#!/usr/bin/env node
/**
 * SYNOPSIS: Run one BuilderOS blueprint step through the canonical executor.
 * Usage: node scripts/builderos-run-mission-step.mjs MISSION_ID [STEP_ID] [--dry-run]
 * @ssot builderos-reboot/BUILDEROS_WORKING_DEFINITION.json
 */
import 'dotenv/config';
import { executeCanonicalBlueprintStep } from '../services/builderos-canonical-executor.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const positional = args.filter((a) => !a.startsWith('--'));
const missionId = positional[0];
const stepId = positional[1] || null;

if (!missionId) {
  console.error('Usage: node scripts/builderos-run-mission-step.mjs <MISSION_ID> [STEP_ID] [--dry-run]');
  process.exit(1);
}

const result = await executeCanonicalBlueprintStep({
  missionId,
  stepId,
  dryRun,
  maxRepairAttempts: 2,
});

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
