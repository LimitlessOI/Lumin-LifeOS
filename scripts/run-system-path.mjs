#!/usr/bin/env node
/**
 * SYNOPSIS: System path — delegates to full foundation pipeline.
 * System path — delegates to full foundation pipeline.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { runFoundationPipeline } from '../factory-staging/factory-core/arc/run-foundation.js';

const missionId = process.argv[2];
const force = process.argv.includes('--force');
const dryRun = process.argv.includes('--dry-run');

if (!missionId) {
  console.error('Usage: npm run builderos:system-path -- <mission_id> [--force] [--dry-run]');
  process.exit(1);
}

const result = runFoundationPipeline(missionId, { force, dryRun });
console.log(JSON.stringify(result.report, null, 2));
process.exit(result.ok ? 0 : 1);
