#!/usr/bin/env node
/**
 * Full foundation pipeline — FOUNDER_PACKET_V2 machine path A→Alpha.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import { runFoundationPipeline } from '../factory-staging/factory-core/arc/run-foundation.js';

const missionId = process.argv[2];
const force = process.argv.includes('--force');
const dryRun = process.argv.includes('--dry-run');

if (!missionId) {
  console.error('Usage: node scripts/run-foundation-pipeline.mjs <mission_id> [--force] [--dry-run]');
  process.exit(1);
}

const result = runFoundationPipeline(missionId, { force, dryRun });
console.log(JSON.stringify(result.report, null, 2));
process.exit(result.ok ? 0 : 1);
